import { mat3 } from "gl-matrix";

export class Cylinder {
  constructor(height, radius) {
    this.height = height;
    this.radius = radius;
  }

  getInertiaTensor(mass) {
    const tensor = mat3.create();
    const term0 = 0.25 * mass * this.radius * this.radius;
    const term1 = (1.0 / 12.0) * mass * this.height * this.height;
    tensor[0] = tensor[4] = term0 + term1;
    tensor[8] = 0.5 * mass * this.radius * this.radius;
    return tensor;
  }
}
