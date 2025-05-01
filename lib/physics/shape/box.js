import { mat3 } from "gl-matrix";

export class Box {
  constructor(extents) {
    this.extents = extents;
  }

  getInertiaTensor(mass) {
    const tensor = mat3.create();
    const factor = (1.0 / 12.0) * mass;
    tensor[0] =
      factor *
      (this.extents[1] * this.extents[1] + this.extents[2] * this.extents[2]);
    tensor[4] =
      factor *
      (this.extents[0] * this.extents[0] + this.extents[2] * this.extents[2]);
    tensor[8] =
      factor *
      (this.extents[0] * this.extents[0] + this.extents[1] * this.extents[1]);
    return tensor;
  }
}
