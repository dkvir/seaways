import { mat4, vec3 } from "gl-matrix";
import { BehaviorSubject } from "rxjs";
import { distinctUntilChanged, switchMap, debounceTime } from "rxjs/operators";
import { isEqual } from "lodash-es";

import { ThreadWorker } from "../utils";

import vs from "./programs/tile-vertex.glsl";
import fs from "./programs/fragment.glsl";

import { createDisc } from "~/lib/graphics/mesh";

const defaultSettings = {
  rings: 512,
  segments: 512,
  delta: 0.1,
  steep: 6,
  offset: 0.45,
};

export class PlateOceanRenderer {
  constructor(gpu) {
    this.gpu = gpu;
    this.shader = this.gpu.createShaderProgram(vs, fs);
    this.worker = new ThreadWorker((input) =>
      createDisc(
        input.rings,
        input.segments,
        input.delta,
        input.steep,
        input.offset
      )
    );

    this.settings$ = new BehaviorSubject({ ...defaultSettings });
    this.geometry = null;

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
        this.geometry = this.gpu.createGeometry(mesh);
      });
  }

  render(camera, oceanField) {
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
    this.gpu.setProgramVariable(
      this.shader,
      "scale",
      "float",
      Math.max(1.0, camera.position[1] * 0.1)
    );
    this.gpu.setProgramVariable(this.shader, "viewMat", "mat4", camera.view);
    this.gpu.setProgramVariable(
      this.shader,
      "projMat",
      "mat4",
      camera.projection
    );
    this.gpu.setProgramVariable(
      this.shader,
      "worldMat",
      "mat4",
      mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(camera.position[0], 0.0, camera.position[2])
      )
    );
    this.gpu.setProgramVariable(this.shader, "pos", "vec3", camera.position);

    if (this.geometry) {
      this.gpu.drawGeometry(this.geometry);
    }
  }

  getSettings() {
    return this.settings$.value;
  }

  setSettings(settings) {
    this.settings$.next({ ...this.settings$.value, ...settings });
  }
}
