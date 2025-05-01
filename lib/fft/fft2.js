import { complex } from "./complex";
import { dft, fft, idft, ifft } from "./fft";

export const dft2 = (signal) => {
  const n = signal.length;
  const m = signal?.[0].length;

  const fourier = [];

  // Horizontal DFT
  for (let i = 0; i < m; i++) {
    fourier.push(dft(signal[i]));
  }

  // Vertical DFT
  const col = new Array(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = dft(col);

    for (let i = 0; i < m; i++) {
      fourier[i][j] = f[i];
    }
  }

  return fourier;
};

export const idft2 = (fourier) => {
  const n = fourier.length;
  const m = fourier?.[0].length;
  const signal = [...Array(m).keys()].map(() => []);

  // Vertical IDFT
  const col = new Array(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = idft(col);

    for (let i = 0; i < m; i++) {
      signal[i].push(f[i]);
    }
  }

  // Horizontal IDFT
  for (let i = 0; i < m; i++) {
    signal[i] = idft(signal[i]);
  }

  return signal;
};

export const fft2 = (signal) => {
  const n = signal.length;
  const m = signal?.[0].length;

  const fourier = [];

  // Horizontal FFT
  for (let i = 0; i < m; i++) {
    fourier.push(fft(signal[i]));
  }

  // Vertical FFT
  const col = new Array(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = fft(col);

    for (let i = 0; i < m; i++) {
      fourier[i][j] = f[i];
    }
  }

  return fourier;
};

export const ifft2 = (fourier) => {
  const n = fourier.length;
  const m = fourier?.[0].length;
  const signal = [...Array(m).keys()].map(() => []);

  // Vertical IFFT
  const col = new Array(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = ifft(col);

    for (let i = 0; i < m; i++) {
      signal[i].push(f[i]);
    }
  }

  // Horizontal IFFT
  for (let i = 0; i < m; i++) {
    signal[i] = ifft(signal[i]);
  }

  return signal;
};

export const float4ToComplex2d = (data, size, offset = 0) => {
  const result = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      const re = data[(i * size + j) * 4 + offset];
      const im = data[(i * size + j) * 4 + 1 + offset];
      row.push(complex(re, im));
    }
    result.push(row);
  }
  return result;
};
