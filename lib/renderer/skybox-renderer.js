import OBJ from "../assets/objects/shapes";

import { loadObj } from "../utils";

import vs from "./programs/skybox-vertex.glsl";
import fs from "./programs/skybox-fragment.glsl";

export class SkyboxRenderer {
  constructor(gpu) {
    this.gpu = gpu;
    this.shader = this.gpu.createShaderProgram(vs, fs);
    this.geometry = this.createGeometry();
  }

  render(camera, skybox) {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );
    this.gpu.setProgram(this.shader);
    this.gpu.setProgramCubemap(this.shader, "env", skybox, 0);
    // this.gpu.setProgramVariable(this.shader, 'exposure', 'float', 3.0);
    this.gpu.setProgramVariable(this.shader, "gamma", "float", 2.2);
    this.gpu.setProgramVariable(this.shader, "viewMat", "mat4", camera.view);
    this.gpu.setProgramVariable(
      this.shader,
      "projMat",
      "mat4",
      camera.projection
    );

    this.gpu.setCullFace(WebGL2RenderingContext.CW);
    this.gpu.enableDepthWrite(false);
    this.gpu.drawGeometry(this.geometry);
    this.gpu.enableDepthWrite(true);
    this.gpu.setCullFace(WebGL2RenderingContext.CCW);
  }

  createGeometry() {
    const obj = loadObj(OBJ);
    return this.gpu.createGeometry(obj["cube"]);
  }
}
