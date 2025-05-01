import { mat4, vec3 } from "gl-matrix";
import { BehaviorSubject } from "rxjs";
import { distinctUntilChanged, switchMap, debounceTime } from "rxjs/operators";
import { isEqual } from "lodash-es";

import { AABB } from "./aabb";
import { Frustum } from "./frustum";
import { ThreadWorker } from "../utils";
import vs from "./programs/tile-vertex.glsl";
import fs from "./programs/fragment.glsl";
import { createPlane } from "~/lib/graphics/mesh";

const defaultSettings = {
  size: 1e4,
  maxTiers: 10,
  minWaterLevel: -10.0,
  maxWaterLevel: 10.0,
  tileResolution: 128,
  distanceFactor: 2.5,
  fixed: true,
  wired: false,
};

export class QuadTreeOceanRenderer {
  constructor(gpu) {
    this.gpu = gpu;
    this.shader = this.gpu.createShaderProgram(vs, fs);
    this.worker = new ThreadWorker((input) => {
      const cache = (self["tileOceanRendererCache"] ??= new Map());
      if (!cache.has(input.tileResolution)) {
        cache.set(
          input.tileResolution,
          createPlane(input.tileResolution, input.wired)
        );
      }
      return cache.get(input.tileResolution);
    });

    this.settings$ = new BehaviorSubject({ ...defaultSettings });
    this.geometry = null;
    this.frustum = null;

    this.settings$
      .pipe(
        debounceTime(10),
        distinctUntilChanged(isEqual),
        switchMap((e) => this.worker.process(e))
      )
      .subscribe((mesh) => {
        if (this.geometry) {
          this.gpu.destroyGeometry(this.geometry);
        }
        const { wired } = this.getSettings();
        this.geometry = this.gpu.createGeometry(
          mesh,
          wired
            ? WebGL2RenderingContext.LINES
            : WebGL2RenderingContext.TRIANGLES
        );
      });
  }

  render(camera, oceanField, env) {
    if (!this.frustum) {
      this.frustum = new Frustum(camera);
    } else {
      this.frustum.transform(camera.transform);
    }

    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );
    this.gpu.setProgram(this.shader);
    this.gpu.setProgramTextures(
      this.shader,
      [
        "dx_hy_dz_dxdz0",
        "sx_sz_dxdx_dzdz0",
        "dx_hy_dz_dxdz1",
        "sx_sz_dxdx_dzdz1",
        "dx_hy_dz_dxdz2",
        "sx_sz_dxdx_dzdz2",
      ],
      oceanField.dataMaps
    );
    this.gpu.setProgramCubemap(this.shader, "env", env, 6);
    for (let i = 0; i < oceanField.params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.shader,
        `sizes[${i}]`,
        "float",
        oceanField.params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        this.shader,
        `croppinesses[${i}]`,
        "float",
        oceanField.params.cascades[i].croppiness
      );
    }
    this.gpu.setProgramVariable(
      this.shader,
      "foamSpreading",
      "float",
      oceanField.params.foamSpreading
    );
    this.gpu.setProgramVariable(
      this.shader,
      "foamContrast",
      "float",
      oceanField.params.foamContrast
    );
    this.gpu.setProgramVariable(this.shader, "viewMat", "mat4", camera.view);
    this.gpu.setProgramVariable(
      this.shader,
      "projMat",
      "mat4",
      camera.projection
    );
    this.gpu.setProgramVariable(this.shader, "pos", "vec3", camera.position);

    if (this.geometry) {
      const tiles = this.generateTiles(this.frustum);
      const settings = this.getSettings();

      for (const tile of tiles) {
        this.renderTile(tile, this.geometry, settings);
      }
    }
  }

  renderTile(tile, geometry, settings) {
    const { aabb, level } = tile;
    const scale = settings.size / 2 ** level;
    const offset = vec3.fromValues(
      (aabb.min[0] + aabb.max[0]) * 0.5,
      0.0,
      (aabb.min[2] + aabb.max[2]) * 0.5
    );
    const transform = mat4.create();
    mat4.fromTranslation(transform, offset);

    this.gpu.setProgramVariable(this.shader, "scale", "float", scale);
    this.gpu.setProgramVariable(this.shader, "worldMat", "mat4", transform);
    this.gpu.drawGeometry(geometry);
  }

  generateTiles(frustum) {
    const {
      size,
      minWaterLevel,
      maxWaterLevel,
      distanceFactor,
      maxTiers,
      fixed,
    } = this.getSettings();

    const offsetX = fixed ? frustum.origin[0] : 0.0;
    const offsetZ = fixed ? frustum.origin[2] : 0.0;

    const queue = [
      {
        aabb: new AABB(
          vec3.fromValues(
            -size * 0.5 + offsetX,
            minWaterLevel,
            -size * 0.5 + offsetZ
          ),
          vec3.fromValues(
            size * 0.5 + offsetX,
            maxWaterLevel,
            size * 0.5 + offsetZ
          )
        ),
        level: 0,
      },
    ];
    const tiles = [];

    while (queue.length) {
      const { aabb, level } = queue.shift();
      if (frustum.testAABB(aabb)) {
        const distance = aabb.distance(frustum.origin);
        const size = Math.abs(aabb.max[0] - aabb.min[0]);

        if (level === maxTiers || distance * distanceFactor > size) {
          tiles.push({ aabb, level });
        } else {
          const aabb0 = new AABB(
            aabb.min,
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              maxWaterLevel,
              aabb.min[2] + size * 0.5
            )
          );
          const aabb1 = new AABB(
            vec3.fromValues(
              aabb.min[0],
              minWaterLevel,
              aabb.min[2] + size * 0.5
            ),
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              maxWaterLevel,
              aabb.max[2]
            )
          );
          const aabb2 = new AABB(
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              minWaterLevel,
              aabb.min[2] + size * 0.5
            ),
            aabb.max
          );
          const aabb3 = new AABB(
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              minWaterLevel,
              aabb.min[2]
            ),
            vec3.fromValues(
              aabb.max[0],
              maxWaterLevel,
              aabb.min[2] + size * 0.5
            )
          );
          queue.push(
            { aabb: aabb0, level: level + 1 },
            { aabb: aabb1, level: level + 1 },
            { aabb: aabb2, level: level + 1 },
            { aabb: aabb3, level: level + 1 }
          );
        }
      }
    }

    return tiles;
  }

  getSettings() {
    return this.settings$.value;
  }

  setSettings(settings) {
    this.settings$.next({ ...this.settings$.value, ...settings });
  }
}
