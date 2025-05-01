import { TextureFiltering } from "../graphics";

import { vs as fft2hvs, fs as fft2hfs } from "./programs/fft2-h";
import { vs as fft2vvs, fs as fft2vfs } from "./programs/fft2-v";
import { vs as postfft2vs, fs as postfft2fs } from "./programs/post-fft2";
import { vs as hkvs, fs as hkfs } from "./programs/hk";

export class OceanField {
  constructor(gpu, h0Textures, butterflyTexture, quad, params) {
    this.gpu = gpu;
    this.h0Textures = h0Textures;
    this.butterflyTexture = butterflyTexture;
    this.quad = quad;
    this.params = params;

    this.createTextures();
    this.createFramebuffers();
    this.createPrograms();
  }

  get dataMaps() {
    return this._dataMaps;
  }

  update(time) {
    this.gpu.setViewport(0, 0, this.params.resolution, this.params.resolution);
    this.generateSpectrum(time);
    this.ifft2();
    this.postIfft2();
  }

  dispose() {
    this.gpu.destroyProgram(this.hkProgram);
    this.gpu.destroyProgram(this.fft2hProgram);
    this.gpu.destroyProgram(this.fft2vProgram);
    this.gpu.destroyProgram(this.postfft2Program);
    this.gpu.destroyRenderTarget(this.spectrumFramebuffer);
    this.gpu.destroyRenderTarget(this.pingPongFramebuffer);
    this.gpu.destroyRenderTarget(this.postIfft2Framebuffer);
    this.h0Textures.forEach((texture) => this.gpu.destroyTexture(texture));
    this.spectrumTextures.forEach((texture) =>
      this.gpu.destroyTexture(texture)
    );
    this.pingPongTextures.forEach((texture) =>
      this.gpu.destroyTexture(texture)
    );
    this.ifftTextures.forEach((texture) => this.gpu.destroyTexture(texture));
    this._dataMaps.forEach((texture) => this.gpu.destroyTexture(texture));
  }

  createPrograms() {
    this.hkProgram = this.gpu.createShaderProgram(hkvs, hkfs);
    this.gpu.setProgram(this.hkProgram);
    this.gpu.setProgramVariable(
      this.hkProgram,
      "resolution",
      "uint",
      this.params.resolution
    );

    for (let i = 0; i < this.params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.hkProgram,
        `sizes[${i}]`,
        "float",
        this.params.cascades[i].size
      );
    }

    this.fft2hProgram = this.gpu.createShaderProgram(fft2hvs, fft2hfs);
    this.fft2vProgram = this.gpu.createShaderProgram(fft2vvs, fft2vfs);

    this.postfft2Program = this.gpu.createShaderProgram(postfft2vs, postfft2fs);
    this.gpu.setProgram(this.postfft2Program);
    this.gpu.setProgramVariable(
      this.postfft2Program,
      "N2",
      "float",
      this.params.resolution * this.params.resolution
    );
  }

  createTextures() {
    this.spectrumTextures = Array(6)
      .fill(null)
      .map(() =>
        this.gpu.createFloat4Texture(
          this.params.resolution,
          this.params.resolution
        )
      );

    this.pingPongTextures = Array(6)
      .fill(null)
      .map(() =>
        this.gpu.createFloat4Texture(
          this.params.resolution,
          this.params.resolution
        )
      );

    this._dataMaps = Array(6)
      .fill(null)
      .map(() =>
        this.gpu.createFloat4Texture(
          this.params.resolution,
          this.params.resolution,
          TextureFiltering.Linear
        )
      );
  }

  createFramebuffers() {
    this.spectrumFramebuffer = this.gpu.createRenderTarget();
    this.gpu.attachTextures(this.spectrumFramebuffer, this.spectrumTextures);

    this.pingPongFramebuffer = this.gpu.createRenderTarget();
    this.gpu.attachTextures(this.pingPongFramebuffer, this.pingPongTextures);

    this.postIfft2Framebuffer = this.gpu.createRenderTarget();
    this.gpu.attachTextures(this.postIfft2Framebuffer, this._dataMaps);
  }

  generateSpectrum(time) {
    this.gpu.setProgram(this.hkProgram);
    this.gpu.setProgramTextures(
      this.hkProgram,
      ["h0Texture0", "h0Texture1", "h0Texture2"],
      this.h0Textures
    );
    this.gpu.setProgramVariable(this.hkProgram, "t", "float", time);
    this.gpu.setRenderTarget(this.spectrumFramebuffer);
    this.gpu.drawGeometry(this.quad);
  }

  ifft2() {
    const phases = Math.log2(this.params.resolution);
    const pingPongTextures = [this.spectrumTextures, this.pingPongTextures];
    const pingPongFramebuffers = [
      this.pingPongFramebuffer,
      this.spectrumFramebuffer,
    ];

    // horizontal ifft
    let pingPong = 0;
    this.gpu.setProgram(this.fft2hProgram);
    this.gpu.setProgramTexture(
      this.fft2hProgram,
      "butterfly",
      this.butterflyTexture,
      6
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.setRenderTarget(pingPongFramebuffers[pingPong]);
      this.gpu.setProgramVariable(this.fft2hProgram, "phase", "uint", phase);
      this.gpu.setProgramTextures(
        this.fft2hProgram,
        [
          "spectrum0",
          "spectrum1",
          "spectrum2",
          "spectrum3",
          "spectrum4",
          "spectrum5",
        ],
        pingPongTextures[pingPong]
      );
      this.gpu.drawGeometry(this.quad);
      pingPong = (pingPong + 1) % 2;
    }

    // vertical ifft
    this.gpu.setProgram(this.fft2vProgram);
    this.gpu.setProgramTexture(
      this.fft2vProgram,
      "butterfly",
      this.butterflyTexture,
      6
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.setRenderTarget(pingPongFramebuffers[pingPong]);
      this.gpu.setProgramVariable(this.fft2vProgram, "phase", "uint", phase);
      this.gpu.setProgramTextures(
        this.fft2vProgram,
        [
          "spectrum0",
          "spectrum1",
          "spectrum2",
          "spectrum3",
          "spectrum4",
          "spectrum5",
        ],
        pingPongTextures[pingPong]
      );
      this.gpu.drawGeometry(this.quad);
      pingPong = (pingPong + 1) % 2;
    }

    this.ifftTextures = pingPongTextures[pingPong];
  }

  postIfft2() {
    this.gpu.setRenderTarget(this.postIfft2Framebuffer);
    this.gpu.setProgram(this.postfft2Program);
    this.gpu.setProgramTextures(
      this.postfft2Program,
      ["ifft0", "ifft1", "ifft2", "ifft3", "ifft4", "ifft5"],
      this.ifftTextures
    );
    this.gpu.drawGeometry(this.quad);
  }
}
