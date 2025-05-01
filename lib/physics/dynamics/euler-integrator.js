import { VpVxS } from "../math";

export class EulerIntegrator {
  integrate(out, x, dxdt, dt) {
    VpVxS(out, x, dxdt, dt);
  }
}
