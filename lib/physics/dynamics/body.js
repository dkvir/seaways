import { mat3, mat4, quat, vec3 } from "gl-matrix";

export class Body {
  static STATE_SIZE = 13;

  get transform() {
    return mat4.fromRotationTranslation(
      this._transform,
      this._rotation,
      this._position
    );
  }

  get mass() {
    return this._mass;
  }

  get Iinv() {
    return mat3.clone(this._Iinv);
  }

  get position() {
    return vec3.clone(this._position);
  }

  set position(position) {
    vec3.copy(this._position, position);
  }

  get rotation() {
    return quat.clone(this._rotation);
  }

  set rotation(rotation) {
    quat.copy(this._rotation, rotation);
  }

  get momentum() {
    return vec3.clone(this._momentum);
  }

  get angularMomentum() {
    return vec3.clone(this._angularMomentum);
  }

  get velocity() {
    return vec3.clone(this._velocity);
  }

  get omega() {
    return vec3.clone(this._omega);
  }

  get force() {
    return vec3.clone(this._force);
  }

  get torque() {
    return vec3.clone(this._torque);
  }

  constructor(mass, Ibody) {
    this._mass = mass;
    this._Ibody = Ibody;

    this._IbodyInv = mat3.create();
    this._position = vec3.create();
    this._rotation = quat.create();
    this._momentum = vec3.create();
    this._angularMomentum = vec3.create();
    this._Iinv = mat3.create();
    this._velocity = vec3.create();
    this._omega = vec3.create();
    this._rotationMatrix = mat3.create();
    this._qdot = quat.create();
    this._force = vec3.create();
    this._torque = vec3.create();
    this._transform = mat4.create();

    mat3.invert(this._IbodyInv, this._Ibody);
  }

  serializeState(out, offset = 0) {
    for (const value of this._position) {
      out[offset++] = value;
    }

    for (const value of this._rotation) {
      out[offset++] = value;
    }

    for (const value of this._momentum) {
      out[offset++] = value;
    }

    for (const value of this._angularMomentum) {
      out[offset++] = value;
    }
  }

  deserializeState(from, offset = 0) {
    vec3.set(this._position, from[offset++], from[offset++], from[offset++]);
    quat.set(
      this._rotation,
      from[offset++],
      from[offset++],
      from[offset++],
      from[offset++]
    );
    quat.normalize(this._rotation, this._rotation);

    vec3.set(this._momentum, from[offset++], from[offset++], from[offset++]);
    vec3.set(
      this._angularMomentum,
      from[offset++],
      from[offset++],
      from[offset++]
    );

    vec3.scale(this._velocity, this._momentum, 1.0 / this._mass);

    mat3.fromQuat(this._rotationMatrix, this._rotation);
    mat3.transpose(this._Iinv, this._rotationMatrix);
    mat3.multiply(this._Iinv, this._IbodyInv, this._Iinv);
    mat3.multiply(this._Iinv, this._rotationMatrix, this._Iinv);

    vec3.transformMat3(this._omega, this._angularMomentum, this._Iinv);
  }

  serializeStateDerivative(out, offset = 0) {
    for (const value of this._velocity) {
      out[offset++] = value;
    }

    quat.set(this._qdot, this._omega[0], this._omega[1], this._omega[2], 0);
    quat.multiply(this._qdot, this._qdot, this._rotation);
    quat.scale(this._qdot, this._qdot, 0.5);

    for (const value of this._qdot) {
      out[offset++] = value;
    }

    for (const value of this._force) {
      out[offset++] = value;
    }

    for (const value of this._torque) {
      out[offset++] = value;
    }
  }

  applyForce(force, at) {
    vec3.add(this._force, this._force, force);

    if (at) {
      const torque = vec3.create();
      vec3.transformQuat(torque, at, this.rotation);
      vec3.cross(torque, torque, force);
      vec3.add(this._torque, this._torque, torque);
    }
  }

  applyTorque(torque) {
    vec3.add(this._torque, this._torque, torque);
  }

  clearForces() {
    vec3.set(this._force, 0, 0, 0);
    vec3.set(this._torque, 0, 0, 0);
  }
}
