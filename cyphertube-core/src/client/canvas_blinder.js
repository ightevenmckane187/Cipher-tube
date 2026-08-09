/**
 * CypherTube Client-Side Sovereign Canvas & WebGL Blinding Engine
 * Protects hardware rendering boundaries by monkey-patching pixel extraction APIs.
 */
(() => {
  const getRandomByteNoise = () => {
    const buf = new Uint8Array(1);
    globalThis.crypto.getRandomValues(buf);
    return (buf[0] % 3) - 1; // Generates safe -1, 0, or 1 shift for Least Significant Bit
  };

  const poisonPixelBuffer = (imageData) => {
    const data = imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      if (data[i + 3] === 0) continue; // Skip completely transparent boundaries
      data[i] = Math.min(255, Math.max(0, data[i] + getRandomByteNoise()));
      data[i + 1] = Math.min(
        255,
        Math.max(0, data[i + 1] + getRandomByteNoise()),
      );
      data[i + 2] = Math.min(
        255,
        Math.max(0, data[i + 2] + getRandomByteNoise()),
      );
    }
    return imageData;
  };

  let originalGetImageData;
  if (globalThis.CanvasRenderingContext2D) {
    originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
      return poisonPixelBuffer(originalGetImageData.call(this, x, y, w, h));
    };
  }

  if (globalThis.HTMLCanvasElement) {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      const ctx = this.getContext("2d");
      if (ctx && originalGetImageData) {
        try {
          const rawData = originalGetImageData.call(
            ctx,
            0,
            0,
            this.width,
            this.height,
          );
          ctx.putImageData(poisonPixelBuffer(rawData), 0, 0);
        } catch (e) {}
      }
      return originalToDataURL.apply(this, args);
    };
  }

  // Intercept WebGL Metrics & Pixel Buffers
  const hookWebGL = (proto) => {
    if (!proto) return;
    const originalGetParameter = proto.getParameter;
    proto.getParameter = function (pname) {
      if (pname === 0x9245) return "Sovereign WebGL Engine";
      if (pname === 0x9246) return "CypherTube OpenCore Project";
      return originalGetParameter.call(this, pname);
    };

    const originalReadPixels = proto.readPixels;
    proto.readPixels = function (x, y, width, height, format, type, pixels) {
      originalReadPixels.call(this, x, y, width, height, format, type, pixels);
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = Math.min(
          255,
          Math.max(0, pixels[i] + getRandomByteNoise()),
        );
      }
    };
  };

  if (globalThis.WebGLRenderingContext)
    hookWebGL(WebGLRenderingContext.prototype);
  if (globalThis.WebGL2RenderingContext)
    hookWebGL(WebGL2RenderingContext.prototype);
})();
