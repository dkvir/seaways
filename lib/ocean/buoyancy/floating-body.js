import { vec3 } from "gl-matrix";

export class FloatingBody {
  constructor(
    body,
    floaters,
    submergeDepth,
    buoyancyStrength,
    waterDrag,
    waterAngularDrag,
    gravity
  ) {
    this.body = body;
    this.floaters = floaters;
    this.submergeDepth = submergeDepth;
    this.buoyancyStrength = buoyancyStrength;
    this.waterDrag = waterDrag;
    this.waterAngularDrag = waterAngularDrag;
    this.gravity = gravity;
  }

  applyForces(sampled, world, offset) {
    const center = vec3.create();
    for (
      let i = offset, j = 0, end = this.floaters.length + offset;
      i < end;
      i++, j++
    ) {
      if (sampled[i][1] <= world[i][1]) {
        continue;
      }
      const submerging = Math.min(
        Math.max((sampled[i][1] - world[i][1]) / this.submergeDepth, 0.0),
        1.0
      );

      this.body.applyForce(
        vec3.scale(
          vec3.create(),
          this.gravity,
          -this.body.mass * submerging * this.buoyancyStrength
        ),
        this.floaters[j]
      );
      this.body.applyForce(
        vec3.scale(
          vec3.create(),
          this.body.velocity,
          -this.waterDrag * submerging
        ),
        center
      );
      this.body.applyTorque(
        vec3.scale(
          vec3.create(),
          this.body.omega,
          -this.waterAngularDrag * submerging
        )
      );
    }
  }
}
