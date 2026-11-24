import {
  EDITOR_FONT_FAMILY,
  createFontInfo
} from "./chunk-XKE7MQW7.js";

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
export {
  createCanvasFontInfo,
  loadEditorFont
};
