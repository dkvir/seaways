export const TextureFiltering = {
  Nearest: WebGL2RenderingContext.NEAREST,
  Linear: WebGL2RenderingContext.LINEAR,
};

export const TextureMode = {
  Repeat: WebGL2RenderingContext.REPEAT,
  Edge: WebGL2RenderingContext.CLAMP_TO_EDGE,
  Mirror: WebGL2RenderingContext.MIRRORED_REPEAT,
};

export class Gpu {
  get context() {
    return this._gl;
  }

  constructor(_gl) {
    this._gl = _gl;
    _gl.enable(_gl.DEPTH_TEST);
    _gl.enable(_gl.CULL_FACE);
    _gl.depthFunc(_gl.LEQUAL);
    _gl.frontFace(_gl.CCW);
    _gl.clearDepth(1.0);
    _gl.lineWidth(2);
    _gl.disable(_gl.BLEND);
    _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, 1);
    _gl.pixelStorei(_gl.PACK_ALIGNMENT, 1);
    _gl.viewport(0, 0, _gl.canvas.width, _gl.canvas.height);
    _gl.getExtension("EXT_color_buffer_float");
    _gl.getExtension("OES_texture_float_linear");
    _gl.clearColor(0.0, 0.0, 0.0, 0.0);
  }

  createGeometry(mesh, type = this._gl.TRIANGLES) {
    const vao = this._gl.createVertexArray();
    this._gl.bindVertexArray(vao);

    const vbo = this.createVertexBuffer(mesh.vertexData, this._gl.STATIC_DRAW);

    for (const attribute of mesh.vertexFormat) {
      this._gl.enableVertexAttribArray(attribute.slot);
      this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
      if (attribute.type === this._gl.FLOAT) {
        this._gl.vertexAttribPointer(
          attribute.slot,
          attribute.size,
          attribute.type,
          false,
          attribute.stride,
          attribute.offset
        );
      } else {
        this._gl.vertexAttribIPointer(
          attribute.slot,
          attribute.size,
          attribute.type,
          attribute.stride,
          attribute.offset
        );
      }
    }

    const geometry = {
      vao,
      vbo,
      length: 0,
      type,
    };

    if (mesh.indexData) {
      const ebo = this.createIndexBuffer(mesh.indexData);
      geometry.length = mesh.indexData.length;
      geometry.ebo = ebo;
      this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, ebo);
    } else {
      const components = mesh.vertexFormat.reduce(
        (components, attribute) => components + attribute.size,
        0
      );
      geometry.length = mesh.vertexData.length / components;
    }

    this._gl.bindVertexArray(null);
    return geometry;
  }

  createShaderProgram(vs, fs, feedbackVars) {
    const gl = this._gl;
    const program = gl.createProgram();

    let shaders = [];
    try {
      for (const shader of [
        { type: gl.VERTEX_SHADER, sourceCode: vs },
        { type: gl.FRAGMENT_SHADER, sourceCode: fs },
      ]) {
        const shaderObject = gl.createShader(shader.type);
        gl.shaderSource(shaderObject, shader.sourceCode);
        gl.compileShader(shaderObject);
        const compileStatus = gl.getShaderParameter(
          shaderObject,
          gl.COMPILE_STATUS
        );

        if (!compileStatus) {
          const source = shader.sourceCode
            .split(/\n/)
            .map((line, no) => `${no + 1}:\t${line}`)
            .join("\n");

          throw new Error(
            `${
              shader.type === gl.VERTEX_SHADER ? "Vertex" : "Fragment"
            } shader compile error: '${gl.getShaderInfoLog(
              shaderObject
            )}' \n${source}\n`
          );
        }

        gl.attachShader(program, shaderObject);
        shaders.push(shaderObject);
      }

      if (feedbackVars) {
        this._gl.transformFeedbackVaryings(
          program,
          feedbackVars,
          gl.SEPARATE_ATTRIBS
        );
      }

      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(
          `Unable to initialize the shader program: '${gl.getProgramInfoLog(
            program
          )}'`
        );
      }
    } catch (e) {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      throw e;
    }

    return { program, shaders };
  }

  setProgram(program) {
    this._gl.useProgram(program.program);
  }

  setProgramVariable(program, name, type, value) {
    const loc = this._gl.getUniformLocation(program.program, name);
    if (!loc) {
      console.warn("Failed to find loc: ", name);
      return;
    }
    if (type === "uint") {
      this._gl.uniform1ui(loc, value);
    } else if (type === "int") {
      this._gl.uniform1i(loc, value);
    } else if (type === "float") {
      this._gl.uniform1f(loc, value);
    } else if (type === "vec2") {
      this._gl.uniform2fv(loc, value);
    } else if (type === "vec3") {
      this._gl.uniform3fv(loc, value);
    } else if (type === "vec4") {
      this._gl.uniform4fv(loc, value);
    } else if (type === "mat4") {
      this._gl.uniformMatrix4fv(loc, false, value);
    }
  }

  setProgramTexture(program, name, texture, slot) {
    const loc = this._gl.getUniformLocation(program.program, name);
    if (!loc) {
      console.warn("Failed to find loc: ", name);
      return;
    }

    this._gl.uniform1i(loc, slot);
    this._gl.activeTexture(this._gl.TEXTURE0 + slot);
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
  }

  setProgramCubemap(program, name, texture, slot) {
    const loc = this._gl.getUniformLocation(program.program, name);
    if (!loc) {
      console.warn("Failed to find loc: ", name);
      return;
    }

    this._gl.uniform1i(loc, slot);
    this._gl.activeTexture(this._gl.TEXTURE0 + slot);
    this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, texture);
  }

  setProgramTextures(program, names, textures) {
    for (let i = 0; i < names.length; i++) {
      this.setProgramTexture(program, names[i], textures[i], i);
    }
  }

  setViewport(x, y, width, height) {
    this._gl.viewport(x, y, width, height);
  }

  drawGeometry(geometry) {
    this._gl.bindVertexArray(geometry.vao);
    if (geometry.ebo) {
      this._gl.drawElements(
        geometry.type ?? this._gl.TRIANGLES,
        geometry.length,
        this._gl.UNSIGNED_INT,
        0
      );
    } else {
      this._gl.drawArrays(
        geometry.type ?? this._gl.TRIANGLES,
        0,
        geometry.length
      );
    }
  }

  flush() {
    this._gl.flush();
  }

  createFloatTexture(
    width,
    height,
    filter = this._gl.NEAREST,
    mode = this._gl.REPEAT
  ) {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.R32F,
      width,
      height,
      0,
      this._gl.RED,
      this._gl.FLOAT,
      null
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, mode);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, mode);
    this._gl.bindTexture(this._gl.TEXTURE_2D, null);

    return texture;
  }

  createFloat2Texture(
    width,
    height,
    filter = this._gl.NEAREST,
    mode = this._gl.REPEAT
  ) {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RG32F,
      width,
      height,
      0,
      this._gl.RG,
      this._gl.FLOAT,
      null
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, mode);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, mode);
    this._gl.bindTexture(this._gl.TEXTURE_2D, null);

    return texture;
  }

  createFloat3Texture(
    width,
    height,
    filter = this._gl.NEAREST,
    mode = this._gl.REPEAT
  ) {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RGB32F,
      width,
      height,
      0,
      this._gl.RGB,
      this._gl.FLOAT,
      null
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, mode);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, mode);
    this._gl.bindTexture(this._gl.TEXTURE_2D, null);

    return texture;
  }

  createFloat4Texture(
    width,
    height,
    filter = this._gl.NEAREST,
    mode = this._gl.REPEAT
  ) {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RGBA32F,
      width,
      height,
      0,
      this._gl.RGBA,
      this._gl.FLOAT,
      null
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, mode);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, mode);
    this._gl.bindTexture(this._gl.TEXTURE_2D, null);

    return texture;
  }

  updateTexture(texture, width, height, format, type, data) {
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texSubImage2D(
      this._gl.TEXTURE_2D,
      0,
      0,
      0,
      width,
      height,
      format,
      type,
      data
    );
  }

  createCubeMap(ktx) {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, texture);

    let level = 0;
    for (let mip of ktx.mipmaps) {
      const faces = [
        {
          target: this._gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          bytes: mip.cubemap[0],
        },
        {
          target: this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
          bytes: mip.cubemap[1],
        },
        {
          target: this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
          bytes: mip.cubemap[2],
        },
        {
          target: this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
          bytes: mip.cubemap[3],
        },
        {
          target: this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
          bytes: mip.cubemap[4],
        },
        {
          target: this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
          bytes: mip.cubemap[5],
        },
      ];

      for (const face of faces) {
        this._gl.texImage2D(
          face.target,
          level,
          ktx.glInternalFormat,
          mip.width,
          mip.height,
          0,
          ktx.glInternalFormat === this._gl.R11F_G11F_B10F
            ? this._gl.RGB
            : ktx.glFormat,
          ktx.glInternalFormat === this._gl.R11F_G11F_B10F
            ? this._gl.UNSIGNED_INT_10F_11F_11F_REV
            : ktx.glType,
          ktx.glInternalFormat === this._gl.R11F_G11F_B10F
            ? new Uint32Array(
                face.bytes.buffer,
                face.bytes.byteOffset,
                face.bytes.byteLength / 4
              )
            : face.bytes
        );
      }

      level++;
    }

    this._gl.texParameteri(
      this._gl.TEXTURE_CUBE_MAP,
      this._gl.TEXTURE_MAG_FILTER,
      this._gl.LINEAR
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_CUBE_MAP,
      this._gl.TEXTURE_MIN_FILTER,
      this._gl.LINEAR_MIPMAP_LINEAR
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_CUBE_MAP,
      this._gl.TEXTURE_BASE_LEVEL,
      0
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_CUBE_MAP,
      this._gl.TEXTURE_MAX_LEVEL,
      ktx.numberOfMipmapLevels - 1
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_CUBE_MAP,
      this._gl.TEXTURE_WRAP_S,
      this._gl.CLAMP_TO_EDGE
    );
    this._gl.texParameteri(
      this._gl.TEXTURE_CUBE_MAP,
      this._gl.TEXTURE_WRAP_T,
      this._gl.CLAMP_TO_EDGE
    );

    return texture;
  }

  updateGeometry(geometry, vertexData) {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, geometry.vbo);
    this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, vertexData);
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
  }

  createRenderTarget() {
    return this._gl.createFramebuffer();
  }

  createTransformFeedback(...capacity) {
    const tfo = this._gl.createTransformFeedback();
    this._gl.bindTransformFeedback(this._gl.TRANSFORM_FEEDBACK, tfo);
    const buffers = [];
    for (let i = 0; i < capacity.length; i++) {
      const tbo = this.createVertexBuffer(capacity[i], this._gl.DYNAMIC_READ);
      this._gl.bindBufferBase(this._gl.TRANSFORM_FEEDBACK_BUFFER, i, tbo);
      buffers.push(tbo);
    }
    this._gl.bindTransformFeedback(this._gl.TRANSFORM_FEEDBACK, null);
    return { tfo, buffers };
  }

  beginTransformFeedback(transformFeedback, primitive = this._gl.POINTS) {
    this._gl.enable(this._gl.RASTERIZER_DISCARD);
    this._gl.bindTransformFeedback(
      this._gl.TRANSFORM_FEEDBACK,
      transformFeedback.tfo
    );
    this._gl.beginTransformFeedback(primitive);
  }

  endTransformFeedback() {
    this._gl.endTransformFeedback();
    this._gl.bindTransformFeedback(this._gl.TRANSFORM_FEEDBACK, null);
    this._gl.disable(this._gl.RASTERIZER_DISCARD);
  }

  async waitAsync(timeout = 1000) {
    this._gl.flush();
    const sync = this._gl.fenceSync(this._gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    let result = this._gl.getSyncParameter(sync, this._gl.SYNC_STATUS);
    return lastValueFrom(
      animationFrames().pipe(
        takeWhile(() => result === this._gl.UNSIGNALED),
        tap(({ elapsed }) => {
          if (elapsed > timeout) {
            throw new Error("waitAsync: timeout expired");
          }
        }),
        tap(() => {
          result = this._gl.getSyncParameter(sync, this._gl.SYNC_STATUS);
        }),
        finalize(() => {
          this._gl.deleteSync(sync);
        })
      )
    );
  }

  attachTexture(target, texture, slot) {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, target);
    this._gl.framebufferTexture2D(
      this._gl.FRAMEBUFFER,
      this._gl.COLOR_ATTACHMENT0 + slot,
      this._gl.TEXTURE_2D,
      texture,
      0
    );

    this._gl.drawBuffers(
      [...Array(slot + 1).keys()].map((i) => this._gl.COLOR_ATTACHMENT0 + i)
    );

    const status = this._gl.checkFramebufferStatus(this._gl.FRAMEBUFFER);
    if (status !== this._gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Incomplete frame buffer, status: ${status}`);
    }
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  }

  attachTextures(target, textures) {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, target);
    const drawBuffers = [];

    for (let i = 0; i < textures.length; i++) {
      this._gl.framebufferTexture2D(
        this._gl.FRAMEBUFFER,
        this._gl.COLOR_ATTACHMENT0 + i,
        this._gl.TEXTURE_2D,
        textures[i],
        0
      );
      drawBuffers.push(this._gl.COLOR_ATTACHMENT0 + i);
    }

    this._gl.drawBuffers(drawBuffers);

    const status = this._gl.checkFramebufferStatus(this._gl.FRAMEBUFFER);
    if (status !== this._gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Incomplete frame buffer, status: ${status}`);
    }
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  }

  setRenderTarget(target) {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, target);
  }

  setCullFace(face) {
    this._gl.frontFace(face);
  }

  enableDepthWrite(flag) {
    this._gl.depthMask(flag);
  }

  clearRenderTarget() {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
  }

  destroyProgram(program) {
    program.shaders.forEach((shader) => this._gl.deleteShader(shader));
    this._gl.deleteProgram(program.program);
  }

  destroyGeometry(geometry) {
    this._gl.deleteBuffer(geometry.ebo);
    this._gl.deleteBuffer(geometry.vbo);
    this._gl.deleteVertexArray(geometry.vao);
  }

  destroyRenderTarget(target) {
    this._gl.deleteFramebuffer(target);
  }

  destroyTexture(texture) {
    this._gl.deleteTexture(texture);
  }

  destroyTransfromFeedback(transformFeedback) {
    transformFeedback.buffers.forEach((tbo) => this._gl.deleteBuffer(tbo));
    this._gl.deleteTransformFeedback(transformFeedback.tfo);
  }

  readTransformFeedback(transformFeedback, buffers) {
    this._gl.bindTransformFeedback(
      this._gl.TRANSFORM_FEEDBACK,
      transformFeedback.tfo
    );
    for (let i = 0; i < transformFeedback.buffers.length; i++) {
      this._gl.bindBuffer(
        this._gl.TRANSFORM_FEEDBACK_BUFFER,
        transformFeedback.buffers[i]
      );
      this._gl.getBufferSubData(
        this._gl.TRANSFORM_FEEDBACK_BUFFER,
        0,
        buffers[i]
      );
    }
    this._gl.bindTransformFeedback(this._gl.TRANSFORM_FEEDBACK, null);
  }

  readValues(target, values, width, height, format, type, slot) {
    this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, target ?? null);
    this._gl.readBuffer(this._gl.COLOR_ATTACHMENT0 + slot);
    this._gl.readPixels(0, 0, width, height, format, type, values);
  }

  createVertexBuffer(data, usage) {
    const vbo = this._gl.createBuffer();
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, data, usage);
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
    return vbo;
  }

  createIndexBuffer(data) {
    const ebo = this._gl.createBuffer();
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, ebo);
    this._gl.bufferData(
      this._gl.ELEMENT_ARRAY_BUFFER,
      data,
      this._gl.STATIC_DRAW
    );
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, null);
    return ebo;
  }
}
