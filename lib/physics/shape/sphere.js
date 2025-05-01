import { mat3 } from "gl-matrix";

export class Sphere {
  constructor(radius) {
    this.radius = radius;
  }

  getInertiaTensor(mass) {
    const tensor = mat3.create();
    tensor[0] = tensor[4] = tensor[8] = 0.4 * mass * this.radius * this.radius;
    return tensor;
  }
}
