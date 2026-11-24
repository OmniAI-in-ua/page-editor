import {
  EDITOR_FONT_FAMILY,
  createFontInfo,
  renderPage
} from "./chunk-XKE7MQW7.js";
import {
  layoutBlock
} from "./chunk-GJ5PGPXS.js";

// src/node.ts
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
function registerEditorFont(fontPath, fontFamily = EDITOR_FONT_FAMILY) {
  if (!GlobalFonts.registerFromPath(fontPath, fontFamily)) {
    throw new Error(`\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438 \u0448\u0440\u0438\u0444\u0442 ${fontPath}`);
  }
  return createFontInfo(createCanvas(1, 1).getContext("2d"), fontFamily);
}
function loadEditorImage(source) {
  return loadImage(source);
}
function renderPagePng({ state, images, font, fontFamily = EDITOR_FONT_FAMILY }) {
  const canvas = createCanvas(images.auto.width, images.auto.height);
  const ctx = canvas.getContext("2d");
  const layouts = /* @__PURE__ */ new Map();
  renderPage(ctx, state, images, {
    fontFamily,
    layoutOf: (block) => {
      let layout = layouts.get(block);
      if (!layout) {
        layout = layoutBlock(block, font);
        layouts.set(block, layout);
      }
      return layout;
    }
  });
  return canvas.toBuffer("image/png");
}
export {
  loadEditorImage,
  registerEditorFont,
  renderPagePng
};
