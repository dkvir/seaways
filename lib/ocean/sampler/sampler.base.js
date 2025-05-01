import { vs, fs } from "../programs/sampler";
import { Sample } from "./sample";

export class SamplerBase {
  constructor(oceanField) {
    this.oceanField = oceanField;
    this.gpu = oceanField["gpu"];
    this.program = this.gpu.createShaderProgram(vs, fs, ["outSample"]);
    this.getter = this.createSampleGetter();
    this._geometry = null;
    this._transformFeedback = null;
  }

  get geometry() {
    if (!this._geometry) {
      this._geometry = this.createGeometry();
    }
    return this._geometry;
  }

  get transformFeedback() {
    if (!this._transformFeedback) {
      this._transformFeedback = this.createTransformFeedback();
    }
    return this._transformFeedback;
  }

  sample(...args) {
    this.setProgram(...args);
    this.gpu.beginTransformFeedback(
      this.transformFeedback,
      WebGL2RenderingContext.POINTS
    );
    this.gpu.drawGeometry(this.geometry);
    this.gpu.endTransformFeedback();

    return new Sample(this.gpu, this.getter);
  }

  sampleAsync(...args) {
    return this.sample(...args).toPromise();
  }

  dispose() {
    this.gpu.destroyProgram(this.program);
    this.gpu.destroyGeometry(this._geometry);
    this.gpu.destroyTransfromFeedback(this._transformFeedback);
  }

  setProgram(...args) {
    this.gpu.setProgram(this.program);
    this.gpu.setProgramTextures(
      this.program,
      ["dx_hy_dz_dxdz0", "dx_hy_dz_dxdz1", "dx_hy_dz_dxdz2"],
      [
        this.oceanField.dataMaps[0],
        this.oceanField.dataMaps[2],
        this.oceanField.dataMaps[4],
      ]
    );
    for (let i = 0; i < this.oceanField.params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.program,
        `sizes[${i}]`,
        "float",
        this.oceanField.params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        this.program,
        `croppinesses[${i}]`,
        "float",
        this.oceanField.params.cascades[i].croppiness
      );
    }
  }

  // Abstract methods to be implemented by subclasses
  createGeometry() {
    throw new Error("createGeometry() must be implemented in a subclass");
  }

  createTransformFeedback() {
    throw new Error(
      "createTransformFeedback() must be implemented in a subclass"
    );
  }

  createSampleGetter() {
    throw new Error("createSampleGetter() must be implemented in a subclass");
  }
}
