"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/node.ts
var node_exports = {};
__export(node_exports, {
  loadEditorImage: () => loadEditorImage,
  registerEditorFont: () => registerEditorFont,
  renderPagePng: () => renderPagePng
});
module.exports = __toCommonJS(node_exports);
var import_canvas = require("@napi-rs/canvas");

// src/render.ts
var EDITOR_FONT_FAMILY = "Anime Ace Editor";
var patternCache = /* @__PURE__ */ new WeakMap();
function patchStyle(ctx, patch, images) {
  if (patch.source === "color") return patch.color ?? "#ffffff";
  const image = images[patch.source];
  if (!image) return null;
  let cache = patternCache.get(ctx);
  if (!cache) {
    cache = /* @__PURE__ */ new Map();
    patternCache.set(ctx, cache);
  }
  if (!cache.has(image)) cache.set(image, ctx.createPattern(image, "no-repeat"));
  return cache.get(image) ?? null;
}
function drawPatch(ctx, patch, images) {
  const style = patchStyle(ctx, patch, images);
  if (!style) return;
  const { shape } = patch;
  ctx.save();
  ctx.beginPath();
  if (shape.type === "rect") {
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
    ctx.fillStyle = style;
    ctx.fill();
  } else if (shape.type === "polygon") {
    for (let i = 0; i < shape.points.length; i += 2) {
      if (i === 0) ctx.moveTo(shape.points[0], shape.points[1]);
      else ctx.lineTo(shape.points[i], shape.points[i + 1]);
    }
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  } else {
    const pts = shape.points;
    if (pts.length === 2) {
      ctx.arc(pts[0], pts[1], shape.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = style;
      ctx.fill();
    } else {
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = shape.size;
      ctx.strokeStyle = style;
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawTextBlock(ctx, block, layout, fontFamily = EDITOR_FONT_FAMILY) {
  ctx.save();
  ctx.translate(block.x + block.width / 2, block.y + block.height / 2);
  ctx.rotate(block.rotation * Math.PI / 180);
  ctx.translate(-block.width / 2, -block.height / 2);
  ctx.globalAlpha = block.opacity;
  ctx.font = `${layout.fontSize}px "${fontFamily}"`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.letterSpacing = `${block.letterSpacing}px`;
  if (block.stroke.enabled && block.stroke.width > 0) {
    ctx.strokeStyle = block.stroke.color;
    ctx.lineWidth = block.stroke.width;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    for (const line of layout.lines) ctx.strokeText(line.text, line.x, line.baseline);
  }
  ctx.fillStyle = block.color;
  for (const line of layout.lines) ctx.fillText(line.text, line.x, line.baseline);
  ctx.restore();
}
function renderPage(ctx, state, images, options) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(images.auto, 0, 0, width, height);
  if (!options.baseOnly) {
    for (const patch of state.patches) drawPatch(ctx, patch, images);
    for (const block of state.blocks) drawTextBlock(ctx, block, options.layoutOf(block), options.fontFamily);
  }
  ctx.restore();
}

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

// src/text.ts
var MISSING_GLYPHS = [
  [/[♡❤]/g, "\u2665"],
  [/[♪♫♬♩]+/g, "~"],
  [/[ \t]*[★☆●◆○◇■□▲△▼▽◎※]+[ \t]*/g, " \u2022 "],
  [/‼/g, "!!"],
  [/⁉/g, "?!"],
  [/⁈/g, "?!"],
  [/[·・]/g, "\u2022"],
  [/№[ \t]*/g, "N "],
  [/°/g, ""],
  [/[【〔［]/g, "["],
  [/[】〕］]/g, "]"],
  [/[〈《]/g, "\xAB"],
  [/[〉》]/g, "\xBB"],
  [/↑/g, "+"],
  [/↓/g, "-"],
  [/[→⇒]/g, "\u2014"],
  [/ー+/g, "\u2014"]
];
function normalizeText(text, uppercase) {
  if (!text) return "";
  let s = text.normalize("NFC").replace(/\r\n?/g, "\n");
  s = s.replace(/ґ/g, "\u0433").replace(/Ґ/g, "\u0413");
  s = s.replace(/['ʼ`‘’]/g, "'");
  s = s.replace(/(\d)[ \t]*[‒–—―−][ \t]*(?=\d)/g, "$1-");
  s = s.replace(/[‐‑]/g, "-").replace(/[‒–—―−]/g, "\u2014");
  s = s.replace(/(^|[ \t])-(?=[ \t])/gm, "$1\u2014");
  for (const [re, to] of MISSING_GLYPHS) s = s.replace(re, to);
  s = s.split("\n").map((line) => line.replace(/^[ \t]*•[ \t]*|[ \t]*•[ \t]*$/g, "").replace(/[ \t ]+/g, " ").trim()).join("\n").replace(/^\n+|\n+$/g, "");
  return uppercase ? s.toLocaleUpperCase("uk-UA") : s;
}

// src/hyphenation.ts
var import_hypher = __toESM(require("hypher"), 1);
var import_hyphenation = __toESM(require("hyphenation.uk"), 1);
var HypherCtor = import_hypher.default?.default ?? import_hypher.default;
var patterns = import_hyphenation.default?.default ?? import_hyphenation.default;
var hypher = new HypherCtor(patterns);
var MIN_SIDE_LETTERS = 2;
var VOWELS = /[аеєиіїоуюяё]/i;
var LETTERS = /\p{L}/gu;
var countLetters = (s) => (s.match(LETTERS) ?? []).length;
function hyphenationPoints(word) {
  const match = word.match(/^([^\p{L}'’]*)([\p{L}'’]+)([^\p{L}'’]*)$/u);
  if (!match || !/\p{Script=Cyrillic}/u.test(match[2]) || countLetters(match[2]) < 2 * MIN_SIDE_LETTERS + 1) {
    return [];
  }
  const [, lead, core] = match;
  const syllables = hypher.hyphenate(core.toLocaleLowerCase("uk-UA"));
  const points = [];
  let pos = 0;
  for (let i = 0; i < syllables.length - 1; i++) {
    pos += syllables[i].length;
    const left = core.slice(0, pos);
    const right = core.slice(pos);
    if (countLetters(left) < MIN_SIDE_LETTERS || countLetters(right) < MIN_SIDE_LETTERS) continue;
    if (!VOWELS.test(left) || !VOWELS.test(right)) continue;
    if (/^[ьй'’]/i.test(right)) continue;
    points.push(lead.length + pos);
  }
  return points;
}

// src/layout.ts
var FIT_TOLERANCE = 0.5;
function naturalBreaks(word) {
  const points = [];
  for (let i = 1; i < word.length - 1; i++) {
    if (/[-—]/.test(word[i - 1]) && /[^-—]/.test(word[i])) points.push(i);
  }
  return points;
}
function wrapText(text, maxWidth, width, hyphenate) {
  const lines = [];
  let hyphens = 0;
  let overflow = false;
  const fits = (s) => width(s) <= maxWidth + FIT_TOLERANCE;
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ").filter(Boolean)) {
      let rest = word;
      while (rest) {
        const prefix = current ? `${current} ` : "";
        if (fits(prefix + rest)) {
          current = prefix + rest;
          break;
        }
        if (current && fits(rest)) {
          lines.push(current);
          current = "";
          continue;
        }
        const candidates = [
          ...naturalBreaks(rest).map((pos) => ({ pos, dash: "" })),
          ...hyphenate ? hyphenationPoints(rest).map((pos) => ({ pos, dash: "-" })) : []
        ].sort((a, b) => b.pos - a.pos);
        const split = candidates.find(({ pos, dash }) => fits(prefix + rest.slice(0, pos) + dash));
        if (split) {
          lines.push(prefix + rest.slice(0, split.pos) + split.dash);
          if (split.dash) hyphens++;
          current = "";
          rest = rest.slice(split.pos);
          continue;
        }
        if (current) {
          lines.push(current);
          current = "";
          continue;
        }
        current = rest;
        overflow = true;
        break;
      }
    }
    lines.push(current);
  }
  return { lines, hyphens, overflow };
}
function layoutBlock(block, font, fontSize = block.fontSize) {
  const text = normalizeText(block.text, block.uppercase);
  const padding = Math.max(0, Math.min(block.padding, block.width / 2 - 1, block.height / 2 - 1));
  const availWidth = Math.max(1, block.width - 2 * padding);
  const availHeight = Math.max(1, block.height - 2 * padding);
  const measure = (s) => font.measure(s, fontSize, block.letterSpacing);
  const wrapped = wrapText(text, availWidth, measure, block.hyphenate);
  const lineHeightPx = fontSize * block.lineHeight;
  const ascent = fontSize * font.ascent;
  const descent = fontSize * font.descent;
  const textHeight = (wrapped.lines.length - 1) * lineHeightPx + ascent + descent;
  const top = padding + (availHeight - textHeight) / 2;
  const lines = wrapped.lines.map((lineText, i) => {
    const width = measure(lineText);
    const x = block.align === "left" ? padding : block.align === "right" ? block.width - padding - width : (block.width - width) / 2;
    return { text: lineText, width, x, baseline: top + ascent + i * lineHeightPx };
  });
  const overflow = wrapped.overflow || lines.some((l) => l.width > availWidth + FIT_TOLERANCE) || textHeight > availHeight + FIT_TOLERANCE;
  return { lines, fontSize, lineHeightPx, overflow, hyphens: wrapped.hyphens };
}

// src/node.ts
function registerEditorFont(fontPath, fontFamily = EDITOR_FONT_FAMILY) {
  if (!import_canvas.GlobalFonts.registerFromPath(fontPath, fontFamily)) {
    throw new Error(`\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438 \u0448\u0440\u0438\u0444\u0442 ${fontPath}`);
  }
  return createFontInfo((0, import_canvas.createCanvas)(1, 1).getContext("2d"), fontFamily);
}
function loadEditorImage(source) {
  return (0, import_canvas.loadImage)(source);
}
function renderPagePng({ state, images, font, fontFamily = EDITOR_FONT_FAMILY }) {
  const canvas = (0, import_canvas.createCanvas)(images.auto.width, images.auto.height);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  loadEditorImage,
  registerEditorFont,
  renderPagePng
});
