export const complex = (re, im) => [re, im];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mult = (a, b) => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
export const eix = (x) => [Math.cos(x), Math.sin(x)];
export const abs = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
export const scale = (v, s) => [v[0] * s, v[1] * s];
export const conj = (v) => [v[0], -v[1]];
export const re = (v) => v[0];
export const im = (v) => v[1];
export const areAqual = (a, b, eps = 1.0e-4) =>
  Math.abs(re(a) - re(b)) < eps && Math.abs(im(a) - im(b)) < eps;
