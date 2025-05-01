export const loadObj = (content) => {
  class MeshVertex {
    constructor() {
      this.position = 0;
      this.normal = 0;
      this.uv = 0;
    }

    get key() {
      return `${this.position}:${this.normal}:${this.uv}`;
    }
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const lookup = new Map();
  let vertexData = [];
  let indexData = [];
  const collection = {};
  let name = "";
  let vertexFormat = null;

  const lines = content.split(/\r\n|\n/);
  const objectRegExp = /^o\s+(.+)/;
  const vertexRegExpr = /^v\s+([\-0-9.]+)\s+([\-0-9.]+)\s+([\-0-9.]+)/;
  const uvRegExpr = /^vt\s+([\-0-9.]+)\s+([\-0-9.]+)(\s+[\-0-9.]+)?/;
  const normalRegExpr = /^vn\s+([\-0-9.]+)\s+([\-0-9.]+)\s+([\-0-9.]+)/;
  const faceRegExpr = /^f\s+/;
  const facePositionsRegExpr = /^f\s+(\d+)\s+(\d+)\s+(\d+)/;
  const facePositionsNormalsRegExpr =
    /^f\s+(\d+)\/\/(\d+)\s+(\d+)\/\/(\d+)\s+(\d+)\/\/(\d+)/;
  const faceFullRegExpr =
    /^f\s+(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)\/(\d+)/;

  let matches;
  for (const line of lines) {
    if ((matches = line.match(objectRegExp))) {
      if (name !== "") {
        collection[name] = {
          vertexFormat,
          indexData: Uint32Array.from(indexData),
          vertexData: Float32Array.from(vertexData),
        };

        lookup.clear();
        vertexData.length = 0;
        indexData = [];
      }
      name = matches[1].trim();
      continue;
    }
    if ((matches = line.match(vertexRegExpr))) {
      positions.push([+matches[1], +matches[2], +matches[3]]);
      continue;
    }
    if ((matches = line.match(normalRegExpr))) {
      normals.push([+matches[1], +matches[2], +matches[3]]);
      continue;
    }
    if ((matches = line.match(uvRegExpr))) {
      uvs.push([+matches[1], +matches[2]]);
      continue;
    }
    if (line.match(faceRegExpr)) {
      const f = [new MeshVertex(), new MeshVertex(), new MeshVertex()];
      if ((matches = line.match(facePositionsRegExpr))) {
        vertexFormat = [
          {
            semantics: "position",
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 0,
            offset: 0,
            stride: 12,
          },
        ];

        f[0].position = +matches[1];
        f[1].position = +matches[2];
        f[2].position = +matches[3];
        for (let i = 0; i < 3; i++) {
          if (!lookup.has(f[i].key)) {
            lookup.set(f[i].key, vertexData.length / 3);
            vertexData.push(...positions[f[i].position - 1]);
          }
          indexData.push(lookup.get(f[i].key));
        }
      } else if ((matches = line.match(facePositionsNormalsRegExpr))) {
        vertexFormat = [
          {
            semantics: "position",
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 0,
            offset: 0,
            stride: 24,
          },
          {
            semantics: "normal",
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 1,
            offset: 12,
            stride: 24,
          },
        ];

        f[0].position = +matches[1];
        f[0].normal = +matches[2];

        f[1].position = +matches[3];
        f[1].normal = +matches[4];

        f[2].position = +matches[5];
        f[2].normal = +matches[6];

        for (let i = 0; i < 3; i++) {
          if (!lookup.has(f[i].key)) {
            lookup.set(f[i].key, vertexData.length / 6);
            vertexData.push(...positions[f[i].position - 1]);
            vertexData.push(...normals[f[i].normal - 1]);
          }
          indexData.push(lookup.get(f[i].key));
        }
      } else if ((matches = line.match(faceFullRegExpr))) {
        vertexFormat = [
          {
            semantics: "position",
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 0,
            offset: 0,
            stride: 32,
          },
          {
            semantics: "normal",
            size: 3,
            type: WebGL2RenderingContext.FLOAT,
            slot: 1,
            offset: 12,
            stride: 32,
          },
          {
            semantics: "uv",
            size: 2,
            type: WebGL2RenderingContext.FLOAT,
            slot: 2,
            offset: 24,
            stride: 32,
          },
        ];

        f[0].position = +matches[1];
        f[0].uv = +matches[2];
        f[0].normal = +matches[3];

        f[1].position = +matches[4];
        f[1].uv = +matches[5];
        f[1].normal = +matches[6];

        f[2].position = +matches[7];
        f[2].uv = +matches[8];
        f[2].normal = +matches[9];

        for (let i = 0; i < 3; i++) {
          if (!lookup.has(f[i].key)) {
            lookup.set(f[i].key, vertexData.length / 8);
            vertexData.push(...positions[f[i].position - 1]);
            vertexData.push(...normals[f[i].normal - 1]);
            vertexData.push(...uvs[f[i].uv - 1]);
          }
          indexData.push(lookup.get(f[i].key));
        }
      } else {
        throw new Error("Unknown token");
      }
      continue;
    }
  }

  collection[name] = {
    vertexFormat,
    indexData: Uint32Array.from(indexData),
    vertexData: Float32Array.from(vertexData),
  };

  return collection;
};
