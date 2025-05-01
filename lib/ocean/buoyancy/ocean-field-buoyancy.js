import { vec2, vec3 } from "gl-matrix";
import { SampleStatus } from "..";

import { OceanField } from "../ocean-field";
import { PointsSampler } from "../sampler";
import { FloatingBody } from "./floating-body";

export const floatingBodyDefaultOptions = {
  submergeDepth: 1,
  buoyancyStrengh: 0.75,
  waterDrag: 1.0,
  waterAngularDrag: 0.75,
  gravity: vec3.fromValues(0.0, -9.8, 0.0),
};

export class OceanFieldBuoyancy {
  constructor(oceanField) {
    this.oceanField = oceanField;
    this.bodies = [];
    this.world = [];
    this.points = [];
    this.sampled = null;
    this.sample = null;
    this.sampler = null;
    this.dirty = true;
  }

  createFloatingBody(body, floaters, options = {}) {
    options = { ...floatingBodyDefaultOptions, ...options };

    const floatingBody = new FloatingBody(
      body,
      floaters,
      options.submergeDepth,
      options.buoyancyStrengh,
      options.waterDrag,
      options.waterAngularDrag,
      options.gravity
    );
    this.bodies.push(floatingBody);

    floaters.forEach(() => {
      this.world.push(vec3.create());
      this.points.push(vec2.create());
    });

    this.dirty = true;
    this.sample = null;

    return floatingBody;
  }

  update() {
    this.sampleOceanField();
    if (this.sampled) {
      let offset = 0;
      for (const body of this.bodies) {
        body.applyForces(this.sampled, this.world, offset);
        offset += body.floaters.length;
      }
    }
  }

  destroyFloatingBody(body) {
    this.bodies.splice(this.bodies.indexOf(body), 1);
    body.floaters.forEach(() => {
      this.world.pop();
      this.points.pop();
    });

    this.dirty = true;
    this.sample = null;
  }

  sampleOceanField() {
    if (!this.sample) {
      let i = 0;
      for (const body of this.bodies) {
        for (const floater of body.floaters) {
          vec3.transformMat4(this.world[i], floater, body.body.transform);
          vec2.set(this.points[i], this.world[i][0], this.world[i][2]);
          i++;
        }
      }

      if (this.dirty) {
        this.sampler?.dispose();
        this.sampler = new PointsSampler(this.oceanField, i);
        this.dirty = false;
      }

      this.sample = this.sampler.sample(...this.points);
    } else {
      const status = this.sample.status();
      if (status !== SampleStatus.Pending) {
        if (status === SampleStatus.Complete) {
          this.sampled = this.sample.outcome();
        }
        this.sample.release();
        this.sample = null;
      }
    }
  }
}
