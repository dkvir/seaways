export const readKtx = (raw) => new KtxReader().readKtx(raw);

export class KtxReader {
  constructor() {
    this._decoder = new TextDecoder();
  }

  readKtx(raw) {
    const view = new DataView(raw);
    let offset = 0;

    // Magic
    const identifier = this.toString(
      new Uint8Array(view.buffer, offset, offset + 12)
    );
    offset += 12;

    // Header Properties
    const endianness = new Uint8Array(view.buffer, offset, offset + 4);
    offset += 4;

    const littleEndian =
      endianness[0] === 0x01 &&
      endianness[1] === 0x02 &&
      endianness[2] === 0x03 &&
      endianness[3] === 0x04;

    const props = {};
    for (let prop of [
      "glType",
      "glTypeSize",
      "glFormat",
      "glInternalFormat",
      "glBaseInternalFormat",
      "pixelWidth",
      "pixelHeight",
      "pixelDepth",
      "numberOfArrayElements",
      "numberOfFaces",
      "numberOfMipmapLevels",
      "bytesOfKeyValueData",
    ]) {
      props[prop] = view.getUint32(offset, littleEndian);
      offset += 4;
    }

    let {
      glType,
      glTypeSize,
      glFormat,
      glInternalFormat,
      glBaseInternalFormat,
      pixelWidth,
      pixelHeight,
      pixelDepth,
      numberOfArrayElements,
      numberOfFaces,
      numberOfMipmapLevels,
      bytesOfKeyValueData,
    } = props;

    numberOfMipmapLevels = numberOfMipmapLevels || 1;
    numberOfArrayElements = numberOfArrayElements || 1;
    numberOfFaces = numberOfFaces || 1;
    pixelDepth = pixelDepth || 1;

    // Key-Value data
    const keyValueData = [];
    let keyValueBytes = 0;
    while (keyValueBytes < bytesOfKeyValueData) {
      const keyAndValueByteSize = view.getUint32(offset, littleEndian);
      keyValueBytes += 4;
      offset += 4;

      const bytes = new Uint8Array(view.buffer, offset, keyAndValueByteSize);
      keyValueData.push(this.toKeyAndValue(bytes));
      offset += keyAndValueByteSize;
      keyValueBytes += keyAndValueByteSize;

      // Padding
      const padding = 3 - ((keyAndValueByteSize + 3) % 4);
      offset += padding;
      keyValueBytes += padding;
    }

    const max = Math.max;

    // Mipmaps
    const mipmaps = [];
    let width = pixelWidth,
      height = pixelHeight,
      depth = pixelDepth;
    for (
      let mipMapLevel = 0;
      mipMapLevel < numberOfMipmapLevels;
      mipMapLevel++
    ) {
      const imageSize = view.getUint32(offset, littleEndian);
      offset += 4;

      const mipMap = { imageSize, width, height, depth };
      if (numberOfFaces === 6 && numberOfArrayElements === 1) {
        mipMap.cubemap = new Array(6);
        for (let face = 0; face < 6; face++) {
          mipMap.cubemap[face] = new Uint8Array(view.buffer, offset, imageSize);
          const padding = 3 - ((imageSize + 3) % 4); // cubePadding
          offset += imageSize + padding;
        }
      } else {
        mipMap.texture = new Uint8Array(view.buffer, offset, imageSize);
        const padding = 3 - ((imageSize + 3) % 4); // mipPadding
        offset += imageSize + padding;
      }

      mipmaps.push(mipMap);
      width = max(width / 2, 1);
      height = max(height / 2, 1);
      depth = max(depth / 2, 1);
    }

    return {
      identifier,
      littleEndian,
      glType,
      glTypeSize,
      glFormat,
      glInternalFormat,
      glBaseInternalFormat,
      pixelWidth,
      pixelHeight,
      pixelDepth,
      numberOfArrayElements,
      numberOfFaces,
      numberOfMipmapLevels,
      keyValueData,
      mipmaps,
    };
  }

  toString(bytes) {
    return this._decoder.decode(bytes);
  }

  toKeyAndValue(bytes) {
    let i = 0;
    while (bytes[i++] !== 0x0);
    const key = this.toString(bytes.subarray(0, i));
    const value = this.toString(bytes.subarray(i + 1));
    return [key, value];
  }
}

export const parseSH = (ktx) => {
  const meta = ktx.keyValueData.find(([key]) => /sh/.test(key));
  if (!meta) {
    return [];
  }
  const [, sh] = meta;
  return sh
    .split(/[\s]+/g)
    .map(parseFloat)
    .filter((v) => !isNaN(v));
};
