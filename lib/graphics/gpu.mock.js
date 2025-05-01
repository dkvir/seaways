import { Gpu } from "./gpu";

let mock = null;
export const createMockGpu = () =>
  mock ??
  (mock = new Gpu(document.createElement("canvas").getContext("webgl2")));
