import { vec2 } from "gl-matrix";

export const defaultBuildParams = {
  cascades: [
    {
      size: 100.0,
      strength: 2.0,
      croppiness: -1.5,
      minWave: 1.0e-6,
      maxWave: 1.0e6,
    },
    {
      size: 60.0,
      strength: 2.0,
      croppiness: -1.5,
      minWave: 1.0e-6,
      maxWave: 1.0e6,
    },
    {
      size: 6.0,
      strength: 2.0,
      croppiness: -1.5,
      minWave: 1.0e-6,
      maxWave: 1.0e6,
    },
  ],
  resolution: 256,
  wind: vec2.fromValues(4.5, 2.5),
  alignment: 1.0,
  foamSpreading: 1.0,
  foamContrast: 2.0,
  randomSeed: 0,
};
