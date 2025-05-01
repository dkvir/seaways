import { mat4, vec3, glMatrix } from "gl-matrix";

import { Transform } from "./transform";

export class Camera extends Transform {
  get view() {
    mat4.invert(this._view, mat4.clone(this.transform));
    return this._view;
  }

  get projection() {
    return this._projection;
  }

  get fov() {
    return this._fov;
  }

  set fov(fov) {
    this._fov = fov;
    this.updateProjection();
  }

  get aspect() {
    return this._aspect;
  }

  set aspect(aspect) {
    this._aspect = aspect;
    this.updateProjection();
  }

  get near() {
    return this._near;
  }

  set near(near) {
    this._near = near;
    this.updateProjection();
  }

  get far() {
    return this._far;
  }

  set far(far) {
    this._far = far;
    this.updateProjection();
  }

  constructor(fov, aspect, near, far) {
    super();
    this._fov = fov;
    this._aspect = aspect;
    this._near = near;
    this._far = far;
    this._view = mat4.create();
    this._projection = mat4.create();
    this.updateProjection();
  }

  lookAt(eye, at) {
    mat4.targetTo(this._view, eye, at, [0.0, 1.0, 0.0]);
    mat4.getTranslation(this._position, this._view);
    mat4.getRotation(this._rotation, this._view);
    this._dirty = true;
  }

  updateProjection() {
    mat4.perspective(
      this._projection,
      glMatrix.toRadian(this._fov),
      this._aspect,
      this._near,
      this._far
    );
  }
}
