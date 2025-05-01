import { vec3 } from "gl-matrix";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class AABB {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  closestPoint(p) {
    return vec3.fromValues(
      clamp(p[0], this.min[0], this.max[0]),
      clamp(p[1], this.min[1], this.max[1]),
      clamp(p[2], this.min[2], this.max[2])
    );
  }

  distance(p) {
    return vec3.distance(p, this.closestPoint(p));
  }
}
