"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/browser.ts
var browser_exports = {};
__export(browser_exports, {
  createCanvasFontInfo: () => createCanvasFontInfo,
  loadEditorFont: () => loadEditorFont
});
module.exports = __toCommonJS(browser_exports);

// src/render.ts
var EDITOR_FONT_FAMILY = "Anime Ace Editor";

// src/font.ts
var PROBE_SIZE = 100;
function createFontInfo(ctx, fontFamily = EDITOR_FONT_FAMILY) {
  const setFont = (size, letterSpacing) => {
    ctx.font = `${size}px "${fontFamily}"`;
    ctx.letterSpacing = `${letterSpacing}px`;
  };
  setFont(PROBE_SIZE, 0);
  const tall = ctx.measureText("\u0419\u0407\xC9");
  const low = ctx.measureText("\u0429\u0414\u0426,;");
  const ascent = tall.actualBoundingBoxAscent / PROBE_SIZE || 0.95;
  const descent = low.actualBoundingBoxDescent / PROBE_SIZE || 0.2;
  const cache = /* @__PURE__ */ new Map();
  return {
    ascent,
    descent,
    measure(text, fontSize, letterSpacing) {
      if (!text) return 0;
      const key = `${fontSize}|${letterSpacing}|${text}`;
      let width = cache.get(key);
      if (width === void 0) {
        setFont(fontSize, letterSpacing);
        width = ctx.measureText(text).width - letterSpacing;
        if (cache.size > 2e4) cache.clear();
        cache.set(key, width);
      }
      return width;
    }
  };
}

// src/browser.ts
var loading = /* @__PURE__ */ new Map();
function loadEditorFont(fontUrl, fontFamily = EDITOR_FONT_FAMILY) {
  let promise = loading.get(fontUrl);
  if (!promise) {
    promise = (async () => {
      const face = new FontFace(fontFamily, `url(${fontUrl})`);
      await face.load();
      document.fonts.add(face);
      return createCanvasFontInfo(fontFamily);
    })().catch((error) => {
      loading.delete(fontUrl);
      throw error;
    });
    loading.set(fontUrl, promise);
  }
  return promise;
}
function createCanvasFontInfo(fontFamily = EDITOR_FONT_FAMILY) {
  return createFontInfo(document.createElement("canvas").getContext("2d"), fontFamily);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCanvasFontInfo,
  loadEditorFont
});
