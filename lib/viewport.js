import { vec2, vec3 } from "gl-matrix";
import { animationFrames } from "rxjs";
import { exhaustMap, retry } from "rxjs/operators";

import { createCube, createCylinder, createDonut, createDuck } from "./bodies";
import { Gizmos } from "./graphics";
import { PatchSampler, PointsSampler } from "./ocean";
import {
  PlateOceanRenderer,
  ProjectedGridRenderer,
  QuadTreeOceanRenderer,
  SkyboxRenderer,
  TileOceanRenderer,
} from "./renderer";

export class Viewport {
  constructor(gpu, oceanField, world, buoyancy, cameraController, skybox) {
    this.gpu = gpu;
    this.oceanField = oceanField;
    this.world = world;
    this.buoyancy = buoyancy;
    this.cameraController = cameraController;
    this.skybox = skybox;

    this.tileRenderer = new TileOceanRenderer(this.gpu);
    this.plateRenderer = new PlateOceanRenderer(this.gpu);
    this.projectedGridRenderer = new ProjectedGridRenderer(this.gpu);
    this.quadTreeRenderer = new QuadTreeOceanRenderer(this.gpu);
    this.skyboxRenderer = new SkyboxRenderer(this.gpu);
    this.gizmos = new Gizmos(this.gpu);

    this.floaters = [
      createCube(this.world, this.buoyancy),
      createCylinder(this.world, this.buoyancy),
      createDuck(this.world, this.buoyancy),
      createDonut(this.world, this.buoyancy),
    ];

    this.pointSampler = new PointsSampler(this.oceanField, 3);
    this.patchSampler = new PatchSampler(this.oceanField, 4);

    this.pointSamples = [];
    this.patchSample = [];

    animationFrames()
      .pipe(
        exhaustMap(() =>
          this.pointSampler.sampleAsync(
            vec2.fromValues(7, 10),
            vec2.fromValues(7, 12),
            vec2.fromValues(7, 14)
          )
        ),
        retry()
      )
      .subscribe((e) => (this.pointSamples = e));

    animationFrames()
      .pipe(
        exhaustMap(() =>
          this.patchSampler.sampleAsync(vec2.fromValues(12.0, 12.0), 5)
        ),
        retry()
      )
      .subscribe((e) => (this.patchSample = e));
  }

  render(type) {
    const { width, height } = this.gpu.context.canvas;

    this.gpu.setViewport(0, 0, width, height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.renderSkybox();
    this.renderGrid();
    this.renderOcean(this.oceanField, type);
    this.renderFloatings();
  }

  renderSkybox() {
    this.skyboxRenderer.render(this.cameraController.camera, this.skybox);
  }

  renderGrid() {
    this.gizmos.drawGrid(this.cameraController.camera);
  }

  renderFloatings() {
    this.floaters.forEach(([floater, geometry]) =>
      this.gizmos.drawFloatingBody(
        this.cameraController.camera,
        floater,
        this.buoyancy,
        geometry
      )
    );
    this.pointSamples.forEach((s) =>
      this.gizmos.drawSphere(this.cameraController.camera, s, 0.2)
    );
    this.gizmos.drawPatch(this.cameraController.camera, this.patchSample);
  }

  renderOcean(field, type) {
    if (type === "tile") {
      this.tileRenderer.render(this.cameraController.camera, field);
    } else if (type === "grid") {
      this.projectedGridRenderer.render(this.cameraController.camera, field);
    } else if (type === "quad-tree") {
      this.quadTreeRenderer.render(
        this.cameraController.camera,
        field,
        this.skybox
      );
    } else {
      this.plateRenderer.render(this.cameraController.camera, field);
    }
  }
}
