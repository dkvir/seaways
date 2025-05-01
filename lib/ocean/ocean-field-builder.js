import { merge } from "lodash-es";

import { createButterflyTexture } from "./butterfly";
import { createQuad, TextureFiltering, TextureMode } from "../graphics";
import { OceanField } from "./ocean-field";
import { defaultBuildParams } from "./ocean-field-build-params";
import { vs as h0vs, fs as h0fs } from "./programs/h0";

export class OceanFieldBuilder {
  constructor(gpu) {
    this.gpu = gpu;
    this.quad = this.gpu.createGeometry(createQuad());
    this.frameBuffer = this.gpu.createRenderTarget();
    this.butterflyTexture = new Map();
    this.noiseTexture = new Map();
    this.h0Program = this.gpu.createShaderProgram(h0vs, h0fs);
  }

  build(params) {
    const _params = merge({}, defaultBuildParams, params);

    const h0Textures = this.createH0Textures(_params.resolution);
    this.generateInitialSpectrum(h0Textures, _params);

    const butterflyTexture = this.getButterflyTexture(_params.resolution);

    return new OceanField(
      this.gpu,
      h0Textures,
      butterflyTexture,
      this.quad,
      _params
    );
  }

  update(field, params) {
    const _params = merge({}, field.params, params);
    this.generateInitialSpectrum(field["h0Textures"], _params);
    this.updateFieldPrograms(field, _params);
    Object.assign(field, { params: _params });
  }

  updateFieldPrograms(field, params) {
    if (params.resolution !== field.params.resolution) {
      this.gpu.setProgram(field["hkProgram"]);
      this.gpu.setProgramVariable(
        field["hkProgram"],
        "resolution",
        "uint",
        params.resolution
      );

      this.gpu.setProgram(field["postfft2Program"]);
      this.gpu.setProgramVariable(
        field["postfft2Program"],
        "N2",
        "float",
        params.resolution * params.resolution
      );
    }

    this.gpu.setProgram(field["hkProgram"]);
    for (let i = 0; i < params.cascades.length; i++) {
      if (params.cascades[i].size !== field.params.cascades[i].size) {
        this.gpu.setProgramVariable(
          field["hkProgram"],
          `sizes[${i}]`,
          "float",
          params.cascades[i].size
        );
      }
    }
  }

  createH0Textures(size) {
    return [
      this.gpu.createFloat4Texture(size, size),
      this.gpu.createFloat4Texture(size, size),
      this.gpu.createFloat4Texture(size, size),
    ];
  }

  generateInitialSpectrum(h0Textures, params) {
    this.gpu.attachTextures(this.frameBuffer, h0Textures);
    this.gpu.setRenderTarget(this.frameBuffer);
    this.gpu.setViewport(0, 0, params.resolution, params.resolution);
    this.gpu.clearRenderTarget();

    this.gpu.setProgram(this.h0Program);
    this.gpu.setProgramTexture(
      this.h0Program,
      "noise",
      this.getNoiseTexture(params.resolution, params.randomSeed),
      0
    );
    this.gpu.setProgramVariable(
      this.h0Program,
      "resolution",
      "uint",
      params.resolution
    );
    this.gpu.setProgramVariable(this.h0Program, "wind", "vec2", params.wind);
    this.gpu.setProgramVariable(
      this.h0Program,
      "alignment",
      "float",
      params.alignment
    );

    for (let i = 0; i < params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].size`,
        "float",
        params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].strength`,
        "float",
        (params.cascades[i].strength * 0.081) / params.cascades[i].size ** 2
      );
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].minK`,
        "float",
        (2.0 * Math.PI) / params.cascades[i].maxWave
      );
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].maxK`,
        "float",
        (2.0 * Math.PI) / params.cascades[i].minWave
      );
    }

    this.gpu.drawGeometry(this.quad);
    this.gpu.setRenderTarget(null);
  }

  getNoiseTexture(size, randomSeed) {
    if (!this.noiseTexture.has(size)) {
      this.noiseTexture.set(
        size,
        this.gpu.createFloat2Texture(
          size,
          size,
          TextureFiltering.Nearest,
          TextureMode.Repeat
        )
      );
    }

    const texture = this.noiseTexture.get(size);
    this.gpu.updateTexture(
      texture,
      size,
      size,
      WebGL2RenderingContext.RG,
      WebGL2RenderingContext.FLOAT,
      this.getNoise2d(size, randomSeed)
    );

    return texture;
  }

  getButterflyTexture(size) {
    if (!this.butterflyTexture.has(size)) {
      const texture = this.gpu.createFloat4Texture(Math.log2(size), size);
      this.gpu.updateTexture(
        texture,
        Math.log2(size),
        size,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        createButterflyTexture(size)
      );
      this.butterflyTexture.set(size, texture);
    }
    return this.butterflyTexture.get(size);
  }

  getNoise2d(size, randomSeed) {
    const mulberry32 = (a) => {
      return () => {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const random = mulberry32(randomSeed);
    return Float32Array.from([...Array(size * size * 2)].map(() => random()));
  }
}
