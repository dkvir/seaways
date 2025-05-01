import { vec2, vec3 } from "gl-matrix";

import { SamplerBase } from "./sampler.base";

export class PatchSampler extends SamplerBase {
  constructor(oceanField, patchResolution = 4) {
    super(oceanField);
    this.patchResolution = patchResolution;
    this.readBuffer = new Float32Array(3 * this.patchResolution ** 2);
    this.origin = vec2.create();
    this.size = 1;
  }

  sample(origin, size = 10) {
    vec2.copy(this.origin, origin);
    this.size = size;
    return super.sample(origin, size);
  }

  sampleAsync(origin, size = 10) {
    return this.sample(origin, size).toPromise();
  }

  createGeometry() {
    return this.gpu.createGeometry(
      this.createPatchMesh(this.patchResolution, 1.0),
      WebGL2RenderingContext.POINTS
    );
  }

  createTransformFeedback() {
    return this.gpu.createTransformFeedback(12 * this.patchResolution ** 2);
  }

  setProgram() {
    super.setProgram();
    this.gpu.setProgramVariable(this.program, "origin", "vec2", this.origin);
    this.gpu.setProgramVariable(this.program, "size", "float", this.size);
  }

  createSampleGetter() {
    return () => {
      this.gpu.readTransformFeedback(this.transformFeedback, [this.readBuffer]);
      const patch = [];
      for (let i = 0; i < this.patchResolution ** 2; i++) {
        const point = vec3.fromValues(
          this.readBuffer[i * 3],
          this.readBuffer[i * 3 + 1],
          this.readBuffer[i * 3 + 2]
        );
        patch.push(point);
      }
      return patch;
    };
  }

  createPatchMesh(resolution, size) {
    const vertices = [];
    const delta = size / (resolution - 1);
    const offset = vec2.fromValues(-size * 0.5, -size * 0.5);

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const vertex = vec2.fromValues(j * delta, i * delta);
        vec2.add(vertex, vertex, offset);
        vertices.push(vertex);
      }
    }

    return {
      vertexFormat: [
        {
          semantics: "position",
          size: 2,
          type: WebGL2RenderingContext.FLOAT,
          slot: 0,
          offset: 0,
          stride: 8,
        },
      ],
      vertexData: Float32Array.from(vertices.map((v) => [...v]).flat()),
    };
  }
}
