import { vec2, vec3 } from "gl-matrix";

import { SamplerBase } from "./sampler.base";

export class PointsSampler extends SamplerBase {
  constructor(oceanField, pointsNumber = 1) {
    super(oceanField);
    this.pointsNumber = pointsNumber;
    this.writeBuffer = new Float32Array(pointsNumber * 2);
    this.readBuffer = new Float32Array(pointsNumber * 3);
  }

  sample(...points) {
    this.writeBuffer.set(points.map((e) => [...e]).flat());
    this.gpu.updateGeometry(this.geometry, this.writeBuffer);
    return super.sample(...points);
  }

  sampleAsync(...points) {
    return this.sample(...points).toPromise();
  }

  createGeometry() {
    return this.gpu.createGeometry(
      this.createPointsMesh(this.pointsNumber),
      WebGL2RenderingContext.POINTS
    );
  }

  createTransformFeedback() {
    return this.gpu.createTransformFeedback(this.pointsNumber * 12);
  }

  setProgram() {
    super.setProgram();
    this.gpu.setProgramVariable(this.program, "origin", "vec2", vec2.create());
    this.gpu.setProgramVariable(this.program, "size", "float", 1.0);
  }

  createSampleGetter() {
    return () => {
      this.gpu.readTransformFeedback(this.transformFeedback, [this.readBuffer]);
      const points = [];
      for (let i = 0; i < this.pointsNumber; i++) {
        const point = vec3.fromValues(
          this.readBuffer[i * 3],
          this.readBuffer[i * 3 + 1],
          this.readBuffer[i * 3 + 2]
        );
        points.push(point);
      }
      return points;
    };
  }

  createPointsMesh(points) {
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
      vertexData: new Float32Array(points * 2),
    };
  }
}
