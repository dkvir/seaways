import { vec3, quat } from "gl-matrix";

import { Body } from "./body";
import { EulerIntegrator } from "./euler-integrator";

export class World {
  constructor(
    gravity = vec3.fromValues(0.0, -9.8, 0.0),
    damping = 0.0,
    angularDamping = 0.0,
    integrator = new EulerIntegrator()
  ) {
    this.gravity = gravity;
    this.damping = damping;
    this.angularDamping = angularDamping;
    this.integrator = integrator;

    this.bodies = new Set();
    this.state = null;
    this.stateDerivative = null;
  }

  createBody(
    mass,
    shape,
    position = vec3.create(),
    orientation = quat.create()
  ) {
    const Ibody = shape.getInertiaTensor(mass);
    const body = new Body(mass, Ibody);
    body.position = position;
    body.rotation = orientation;
    this.bodies.add(body);

    this.state = new Float32Array(Body.STATE_SIZE * this.bodies.size);
    this.stateDerivative = new Float32Array(Body.STATE_SIZE * this.bodies.size);

    return body;
  }

  destroyBody(body) {
    this.bodies.delete(body);
  }

  integrate(dt) {
    this.applyGravity();
    this.applyDamping();
    this.serialize();

    this.integrator.integrate(this.state, this.state, this.stateDerivative, dt);

    this.clearForces();
    this.deserialize();
  }

  applyGravity() {
    const force = vec3.create();
    this.bodies.forEach((body) => {
      if (!Number.isFinite(body.mass)) {
        return;
      }
      body.applyForce(
        vec3.scale(force, this.gravity, body.mass),
        vec3.fromValues(0, 0, 0)
      );
    });
  }

  applyDamping() {
    this.bodies.forEach((body) => {
      if (!Number.isFinite(body.mass)) {
        return;
      }
      if (this.damping) {
        body.applyForce(
          vec3.scale(vec3.create(), body.velocity, -this.damping)
        );
      }
      if (this.angularDamping) {
        body.applyTorque(
          vec3.scale(vec3.create(), body.omega, -this.angularDamping)
        );
      }
    });
  }

  clearForces() {
    this.bodies.forEach((body) => body.clearForces());
  }

  serialize() {
    let offset = 0;
    for (let body of this.bodies) {
      body.serializeState(this.state, offset);
      body.serializeStateDerivative(this.stateDerivative, offset);
      offset += Body.STATE_SIZE;
    }
  }

  deserialize() {
    let offset = 0;
    for (let body of this.bodies) {
      body.deserializeState(this.state, offset);
      offset += Body.STATE_SIZE;
    }
  }
}
