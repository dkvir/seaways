import { vec2, vec3 } from "gl-matrix";
import { fromEvent, Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";

export class ArcRotationCameraController {
  constructor(
    canvas,
    camera,
    lookAt = [0.0, 0.0, 0.0],
    rotSpeed = 1.0e-2,
    moveSpeed = 0.25
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.lookAt = lookAt;
    this.rotSpeed = rotSpeed;
    this.moveSpeed = moveSpeed;

    this.distance = 0;
    this.lastPhi = 0.0;
    this.lastTetta = 0.0;
    this.phi = 0.0;
    this.tetta = 0.0;
    this.lastLookAt = [0.0, 0.0, 0.0];
    this.r = vec3.create();
    this.click = vec2.create();
    this.aux0 = vec3.create();
    this.aux1 = vec3.create();
    this.up$ = new Subject();
    this.release$ = new Subject();

    this.camera.lookAt(this.camera.position, this.lookAt);
    this.sync();
    this.updateTransform();

    fromEvent(this.canvas, "mousedown")
      .pipe(
        takeUntil(this.release$),
        filter((e) => e.button === 1) // Middle mouse button
      )
      .subscribe((e) => this.mouseDown(e));

    fromEvent(this.canvas, "wheel")
      .pipe(takeUntil(this.release$))
      .subscribe((e) => this.scroll(e));
  }

  update() {
    this.camera.lookAt(this.r, this.lookAt);
  }

  release() {
    this.release$.next();
  }

  sync() {
    vec3.sub(this.r, this.camera.position, this.lookAt);
    this.distance = vec3.length(this.r);
    vec3.normalize(this.r, this.r);
    [this.phi, this.tetta] = cartesianToSpherical(this.r);
    this.updateTransform();
  }

  mouseDown(e) {
    this.target = e.target;
    this.target.style.cursor = "grabbing";

    fromEvent(document, "mousemove")
      .pipe(takeUntil(this.up$))
      .subscribe((e) => this.mouseMove(e));

    fromEvent(document, "mouseup")
      .pipe(takeUntil(this.up$))
      .subscribe(() => this.mouseUp());

    this.click[0] = e.pageX;
    this.click[1] = e.pageY;
    this.lastTetta = this.tetta;
    this.lastPhi = this.phi;
    this.lastLookAt = vec3.clone(this.lookAt);
    e.preventDefault();
  }

  mouseMove(e) {
    const dx = (this.click[0] - e.pageX) * this.rotSpeed;
    const dy = (this.click[1] - e.pageY) * this.rotSpeed;
    if (e.altKey) {
      this.phi = this.lastPhi + dx;
      this.tetta = this.lastTetta + dy;
      this.tetta = clamp(this.tetta, 1.0e-3, Math.PI * (1.0 - 1.0e-3));
    } else {
      vec3.scale(this.aux0, this.camera.right, dx * this.moveSpeed);
      vec3.scale(this.aux1, this.camera.up, dy * -this.moveSpeed);
      vec3.add(this.aux0, this.aux0, this.aux1);
      vec3.add(this.lookAt, this.lastLookAt, this.aux0);
    }
    this.updateTransform();
  }

  mouseUp() {
    this.up$.next();
    this.target.style.cursor = "default";
  }

  scroll(e) {
    this.distance += this.moveSpeed * e.deltaY * 1.0e-2;
    this.updateTransform();
  }

  updateTransform() {
    vec3.normalize(this.r, sphericalToCartesian(this.phi, this.tetta));
    vec3.scale(this.r, this.r, this.distance);
    vec3.add(this.r, this.r, this.lookAt);
  }
}

const sphericalToCartesian = (phi, tetta) => {
  const sinTetta = Math.sin(tetta);
  return [sinTetta * Math.sin(phi), Math.cos(tetta), sinTetta * Math.cos(phi)];
};

const cartesianToSpherical = (p) => [Math.atan2(p[0], p[2]), Math.acos(p[1])];

const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
