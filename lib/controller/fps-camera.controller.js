import { quat, vec2, vec3 } from "gl-matrix";
import { fromEvent, Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";
import { Key } from "ts-keycode-enum";

export class FpsCameraController {
  constructor(canvas, camera, speed = 1.0e1, sensibility = 1.0e-2) {
    this.canvas = canvas;
    this.camera = camera;
    this.speed = speed;
    this.sensibility = sensibility;

    this.click = vec2.create();
    this.target = null;
    this.up$ = new Subject();
    this.release$ = new Subject();
    this.keys = new Map();

    this.velocity = vec3.create();
    this.yaw = 0.0;
    this.pitch = 0.0;
    this.q = quat.create();
    this.active = false;

    fromEvent(this.canvas, "contextmenu")
      .pipe(takeUntil(this.release$))
      .subscribe((e) => (e.preventDefault(), false));

    fromEvent(this.canvas, "mousedown")
      .pipe(
        takeUntil(this.release$),
        filter((e) => e.button === 2) // Right mouse button
      )
      .subscribe((e) => this.mouseDown(e));

    fromEvent(this.canvas, "wheel")
      .pipe(
        takeUntil(this.release$),
        filter(() => this.active)
      )
      .subscribe((e) => this.scroll(e));

    fromEvent(document, "keydown")
      .pipe(
        takeUntil(this.release$),
        filter((e) => !this.keys.has(e.keyCode))
      )
      .subscribe((e) => {
        this.keys.set(e.keyCode, true);
      });

    fromEvent(document, "keyup")
      .pipe(
        takeUntil(this.release$),
        filter((e) => this.keys.has(e.keyCode))
      )
      .subscribe((e) => {
        this.keys.delete(e.keyCode);
      });
  }

  update(dt) {
    this.move(dt);
  }

  release() {
    this.release$.next();
  }

  mouseDown(e) {
    this.target = e.target;
    this.target.style.cursor = "crosshair";

    this.yaw = signedAngle(x, this.camera.right, y);
    this.pitch = signedAngle(y, this.camera.up, this.camera.right);
    vec2.set(this.click, e.pageX, e.pageY);
    this.active = true;

    fromEvent(document, "mousemove")
      .pipe(takeUntil(this.up$))
      .subscribe((e) => this.mouseMove(e));

    fromEvent(document, "mouseup")
      .pipe(takeUntil(this.up$))
      .subscribe(() => this.mouseUp());

    e.preventDefault();
  }

  mouseMove(e) {
    const dx = (this.click[0] - e.pageX) * this.sensibility;
    const dy = (this.click[1] - e.pageY) * this.sensibility;

    quat.identity(this.q);
    quat.rotateY(this.q, this.q, this.yaw + dx);
    quat.rotateX(this.q, this.q, this.pitch + dy);
    this.camera.rotation = this.q;
  }

  mouseUp() {
    this.up$.next();
    this.target.style.cursor = "default";
    this.active = false;
  }

  scroll(e) {
    if (e.deltaY < 0) {
      this.speed *= 1.2;
    } else {
      this.speed *= 0.8;
    }
  }

  move(dt) {
    vec3.set(this.velocity, 0, 0, 0);
    if (this.keys.has(Key.W)) {
      vec3.add(this.velocity, this.velocity, this.camera.forward);
    }
    if (this.keys.has(Key.S)) {
      vec3.sub(this.velocity, this.velocity, this.camera.forward);
    }
    if (this.keys.has(Key.A)) {
      vec3.sub(this.velocity, this.velocity, this.camera.right);
    }
    if (this.keys.has(Key.D)) {
      vec3.add(this.velocity, this.velocity, this.camera.right);
    }
    if (this.keys.has(Key.Q)) {
      vec3.sub(this.velocity, this.velocity, y);
    }
    if (this.keys.has(Key.E)) {
      vec3.add(this.velocity, this.velocity, y);
    }
    const length = vec3.len(this.velocity);
    if (length > 0) {
      vec3.scale(this.velocity, this.velocity, length * this.speed);
    }

    vec3.scaleAndAdd(
      this.camera.position,
      this.camera.position,
      this.velocity,
      dt
    );
  }
}

const signedAngle = ((cross) => (a, b, look) => {
  vec3.cross(cross, a, b);
  const angle = vec3.angle(a, b);
  return vec3.dot(cross, look) > 0 ? angle : 2 * Math.PI - angle;
})(vec3.create());

const x = vec3.fromValues(1.0, 0.0, 0.0);
const y = vec3.fromValues(0.0, 1.0, 0.0);
