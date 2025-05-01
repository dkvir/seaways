export const VcV = (out, from) => {
  out.set(from, 0);
};

export const VxV = (V1, V2) => {
  let dot = 0.0;
  for (let j = 0; j < V1.length; j++) {
    dot += V1[j] * V2[j];
  }
  return dot;
};

export const VmV = (out, V1, V2) => {
  const n = out.length;
  for (let i = 0; i < n; i++) {
    out[i] = V1[i] * V2[i];
  }
};

export const VpVxS = (out, V1, V2, S) => {
  const n = out.length;
  for (let i = 0; i < n; i++) {
    out[i] = V1[i] + V2[i] * S;
  }
};

export const VpV = (out, V1, V2) => {
  const n = out.length;
  for (let i = 0; i < n; i++) {
    out[i] = V1[i] + V2[i];
  }
};

export const MxV = (out, M, V) => {
  const n = V.length;
  const m = M.length / n;

  for (let i = 0; i < m; i++) {
    out[i] = 0.0;
    for (let j = 0; j < n; j++) {
      out[i] += M[i * n + j] * V[j];
    }
  }
};

export const VxSpVxS = (out, V1, S1, V2, S2) => {
  const n = out.length;
  for (let i = 0; i < n; i++) {
    out[i] = V1[i] * S1 + V2[i] * S2;
  }
};
