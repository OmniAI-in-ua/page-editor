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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  COALESCE_MS: () => COALESCE_MS,
  DEFAULT_BLOCK: () => DEFAULT_BLOCK,
  EDITOR_FONT_FAMILY: () => EDITOR_FONT_FAMILY,
  EDITOR_STATE_VERSION: () => EDITOR_STATE_VERSION,
  EditorHistory: () => EditorHistory,
  HISTORY_LIMIT: () => HISTORY_LIMIT,
  HYPHEN_SIZE_GAIN: () => HYPHEN_SIZE_GAIN,
  MAX_FONT_SIZE: () => MAX_FONT_SIZE,
  MIN_FONT_SIZE: () => MIN_FONT_SIZE,
  chooseTextStyle: () => chooseTextStyle,
  createEmptyState: () => createEmptyState,
  createFontInfo: () => createFontInfo,
  drawPatch: () => drawPatch,
  drawTextBlock: () => drawTextBlock,
  fitFontSize: () => fitFontSize,
  hyphenationPoints: () => hyphenationPoints,
  joinTexts: () => joinTexts,
  layoutBlock: () => layoutBlock,
  newBlock: () => newBlock,
  normalizeState: () => normalizeState,
  normalizeText: () => normalizeText,
  parseRegions: () => parseRegions,
  plainText: () => plainText,
  pointInPolygon: () => pointInPolygon,
  regionText: () => regionText,
  renderPage: () => renderPage,
  reworkRegion: () => reworkRegion,
  sampleBackground: () => sampleBackground,
  textUpdatesFor: () => textUpdatesFor,
  uid: () => uid,
  wrapText: () => wrapText
});
module.exports = __toCommonJS(src_exports);

// src/types.ts
var EDITOR_STATE_VERSION = 1;

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
var MIN_FONT_SIZE = 6;
var MAX_FONT_SIZE = 400;
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
var HYPHEN_SIZE_GAIN = 1.22;
function largestFitting(block, font, min, max) {
  const upper = Math.max(min, Math.min(max, Math.floor(block.height)));
  if (layoutBlock(block, font, min).overflow) return min;
  let lo = min;
  let hi = upper;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (layoutBlock(block, font, mid).overflow) hi = mid - 1;
    else lo = mid;
  }
  return lo;
}
function fitFontSize(block, font, min = MIN_FONT_SIZE, max = MAX_FONT_SIZE) {
  const whole = { ...block, hyphenate: false };
  const plain = largestFitting(whole, font, min, max);
  if (!block.hyphenate) return plain;
  const hyphenated = largestFitting(block, font, min, max);
  const plainFits = !layoutBlock(whole, font, plain).overflow;
  return !plainFits || hyphenated > plain * HYPHEN_SIZE_GAIN ? hyphenated : plain;
}

// src/metadata.ts
function toBox(raw) {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length >= 4) {
    const [x12, y12, x22, y22] = raw.map(Number);
    return { x1: x12, y1: y12, x2: x22, y2: y22 };
  }
  const x1 = Number(raw.x1 ?? raw.x ?? 0);
  const y1 = Number(raw.y1 ?? raw.y ?? 0);
  const x2 = Number(raw.x2 ?? x1 + Number(raw.width ?? 0));
  const y2 = Number(raw.y2 ?? y1 + Number(raw.height ?? 0));
  if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return null;
  return { x1, y1, x2, y2 };
}
function toPolygon(raw) {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const points = raw.map((p) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p?.x), y: Number(p?.y) }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  return points.length >= 3 ? points : null;
}
function boxPolygon(b) {
  return [
    { x: b.x1, y: b.y1 },
    { x: b.x2, y: b.y1 },
    { x: b.x2, y: b.y2 },
    { x: b.x1, y: b.y2 }
  ];
}
function polygonBox(points) {
  return {
    x1: Math.min(...points.map((p) => p.x)),
    y1: Math.min(...points.map((p) => p.y)),
    x2: Math.max(...points.map((p) => p.x)),
    y2: Math.max(...points.map((p) => p.y))
  };
}
function toText(node, fallbackIndex) {
  if (!node || typeof node.id !== "string") return null;
  const translation = node.translation ?? {};
  const ukr = typeof translation.ukr === "string" ? translation.ukr : typeof translation.uk === "string" ? translation.uk : "";
  const auto = translation.manual ? typeof translation.ukrAuto === "string" ? translation.ukrAuto : "" : ukr;
  return {
    id: node.id,
    ukr,
    auto,
    readingIndex: Number.isFinite(node.readingIndex) ? node.readingIndex : fallbackIndex,
    box: toBox(node.box),
    polygon: toPolygon(node.polygon)
  };
}
function scalePoint(p, sx, sy) {
  return { x: p.x * sx, y: p.y * sy };
}
function parseRegions(metadata, imageWidth, imageHeight) {
  const sx = metadata?.imageWidth > 0 ? imageWidth / metadata.imageWidth : 1;
  const sy = metadata?.imageHeight > 0 ? imageHeight / metadata.imageHeight : 1;
  const regions = [];
  const scaleRegion = (r) => ({
    ...r,
    box: { x1: r.box.x1 * sx, y1: r.box.y1 * sy, x2: r.box.x2 * sx, y2: r.box.y2 * sy },
    polygon: r.polygon.map((p) => scalePoint(p, sx, sy)),
    texts: r.texts.map((t) => ({
      ...t,
      box: t.box && { x1: t.box.x1 * sx, y1: t.box.y1 * sy, x2: t.box.x2 * sx, y2: t.box.y2 * sy },
      polygon: t.polygon && t.polygon.map((p) => scalePoint(p, sx, sy))
    }))
  });
  const visit = (nodes) => {
    if (!Array.isArray(nodes)) return;
    nodes.forEach((node, index) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "frame") {
        visit(node.children);
        return;
      }
      if (node.type === "bubble") {
        const texts = (Array.isArray(node.texts) ? node.texts : []).map((t, i) => toText(t, i)).filter((t) => t !== null).sort((a, b) => a.readingIndex - b.readingIndex);
        const polygon = toPolygon(node.polygon);
        const box2 = toBox(node.box) ?? (polygon && polygonBox(polygon));
        if (!box2 || typeof node.id !== "string") return;
        regions.push(scaleRegion({ id: node.id, kind: "bubble", box: box2, polygon: polygon ?? boxPolygon(box2), texts }));
        return;
      }
      const text = toText(node, index);
      const box = text?.box ?? (text?.polygon && polygonBox(text.polygon));
      if (text && box) {
        regions.push(scaleRegion({ id: text.id, kind: "free", box, polygon: text.polygon ?? boxPolygon(box), texts: [text] }));
      }
    });
  };
  visit(metadata?.items);
  return regions;
}
function regionText(region, which = "ukr") {
  return joinTexts(region.texts, which);
}
function joinTexts(texts, which = "ukr") {
  return texts.map((t) => t[which].trim()).filter(Boolean).join(" ");
}
function pointInPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

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

// src/state.ts
var BUBBLE_PATCH_SCALE = 1.04;
var BUBBLE_TEXT_SHARE = 0.72;
var FREE_PATCH_MARGIN_SHARE = 0.15;
var FREE_PATCH_MARGIN_PX = 8;
var BUBBLE_MAX_FONT_SHARE = 0.03;
var FREE_MAX_FONT_SHARE = 0.06;
var DARK_BACKGROUND_LUMINANCE = 80;
var MID_BACKGROUND_LUMINANCE = 180;
var BUSY_BACKGROUND_DARK_SHARE = 0.06;
var BUSY_FREE_DARK_SHARE = 0.08;
var VERY_BUSY_FREE_DARK_SHARE = 0.2;
var STROKE = 0.12;
var FREE_STROKE_BUSY = 0.2;
var FREE_STROKE_VERY_BUSY = 0.26;
var DEFAULT_BLOCK = {
  sourceIds: [],
  text: "",
  rotation: 0,
  fontSize: 24,
  lineHeight: 1.15,
  letterSpacing: 0,
  align: "center",
  padding: 4,
  hyphenate: true,
  uppercase: true,
  color: "#000000",
  stroke: { enabled: false, color: "#ffffff", width: 3 },
  opacity: 1
};
var counter = 0;
function uid(prefix) {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function createEmptyState() {
  return { version: EDITOR_STATE_VERSION, blocks: [], patches: [] };
}
var num = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
var str = (v, fallback) => typeof v === "string" ? v : fallback;
function normalizeState(raw) {
  const state = createEmptyState();
  if (!raw || typeof raw !== "object") return state;
  const input = raw;
  for (const b of Array.isArray(input.blocks) ? input.blocks : []) {
    if (!b || typeof b !== "object") continue;
    state.blocks.push({
      id: str(b.id, uid("blk")),
      sourceIds: Array.isArray(b.sourceIds) ? b.sourceIds.filter((s) => typeof s === "string") : [],
      text: str(b.text, ""),
      x: num(b.x, 0),
      y: num(b.y, 0),
      width: Math.max(1, num(b.width, 100)),
      height: Math.max(1, num(b.height, 50)),
      rotation: num(b.rotation, 0),
      fontSize: Math.max(1, num(b.fontSize, DEFAULT_BLOCK.fontSize)),
      lineHeight: num(b.lineHeight, DEFAULT_BLOCK.lineHeight),
      letterSpacing: num(b.letterSpacing, 0),
      align: ["left", "center", "right"].includes(b.align) ? b.align : "center",
      padding: Math.max(0, num(b.padding, DEFAULT_BLOCK.padding)),
      hyphenate: typeof b.hyphenate === "boolean" ? b.hyphenate : true,
      uppercase: typeof b.uppercase === "boolean" ? b.uppercase : true,
      color: str(b.color, "#000000"),
      stroke: {
        enabled: Boolean(b.stroke?.enabled),
        color: str(b.stroke?.color, "#ffffff"),
        width: Math.max(0, num(b.stroke?.width, DEFAULT_BLOCK.stroke.width))
      },
      opacity: Math.min(1, Math.max(0, num(b.opacity, 1)))
    });
  }
  for (const p of Array.isArray(input.patches) ? input.patches : []) {
    if (!p || typeof p !== "object" || !["cleaned", "original", "auto", "color"].includes(p.source)) continue;
    const shape = p.shape;
    const valid = shape?.type === "rect" && [shape.x, shape.y, shape.width, shape.height].every(Number.isFinite) || shape?.type === "polygon" && Array.isArray(shape.points) && shape.points.length >= 6 || shape?.type === "stroke" && Array.isArray(shape.points) && shape.points.length >= 2 && Number.isFinite(shape.size);
    if (!valid) continue;
    state.patches.push({ id: str(p.id, uid("pat")), source: p.source, color: p.color, shape });
  }
  return state;
}
function newBlock(box, overrides = {}) {
  return {
    ...structuredClone(DEFAULT_BLOCK),
    id: uid("blk"),
    ...box,
    ...overrides
  };
}
function sampleBackground(pixels, box, step = 2) {
  const x1 = Math.max(0, Math.floor(box.x1));
  const y1 = Math.max(0, Math.floor(box.y1));
  const x2 = Math.min(pixels.width, Math.ceil(box.x2));
  const y2 = Math.min(pixels.height, Math.ceil(box.y2));
  let sum = 0;
  let dark = 0;
  let count = 0;
  for (let y = y1; y < y2; y += step) {
    for (let x = x1; x < x2; x += step) {
      const i = (y * pixels.width + x) * 4;
      const v = 0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2];
      sum += v;
      if (v < 100) dark++;
      count++;
    }
  }
  return count > 0 ? { mean: sum / count, darkShare: dark / count } : { mean: 255, darkShare: 0 };
}
function chooseTextStyle(stats, kind, fontSize) {
  const stroke = (color, share) => ({ enabled: true, color, width: Math.max(1, Math.round(fontSize * share)) });
  const none = (color) => ({ enabled: false, color, width: Math.max(1, Math.round(fontSize * STROKE)) });
  if (stats.mean < DARK_BACKGROUND_LUMINANCE) {
    return { color: "#ffffff", stroke: kind === "free" ? stroke("#000000", STROKE) : none("#000000") };
  }
  if (kind === "free") {
    const share = stats.darkShare > VERY_BUSY_FREE_DARK_SHARE ? FREE_STROKE_VERY_BUSY : stats.darkShare > BUSY_FREE_DARK_SHARE ? FREE_STROKE_BUSY : STROKE;
    return { color: "#000000", stroke: stroke("#ffffff", share) };
  }
  if (stats.mean <= MID_BACKGROUND_LUMINANCE || stats.darkShare > BUSY_BACKGROUND_DARK_SHARE) {
    return { color: "#000000", stroke: stroke("#ffffff", STROKE) };
  }
  return { color: "#000000", stroke: none("#ffffff") };
}
function clampBox(b, w, h) {
  const width = Math.min(b.width, w);
  const height = Math.min(b.height, h);
  return {
    x: Math.min(Math.max(0, b.x), w - width),
    y: Math.min(Math.max(0, b.y), h - height),
    width,
    height
  };
}
function reworkRegion(region, options) {
  const { box } = region;
  const bw = box.x2 - box.x1;
  const bh = box.y2 - box.y1;
  const cx = (box.x1 + box.x2) / 2;
  const cy = (box.y1 + box.y2) / 2;
  const patchBase = { id: uid("pat"), source: options.patchSource, ...options.patchSource === "color" ? { color: "#ffffff" } : {} };
  let patch;
  let blockBox;
  if (region.kind === "bubble") {
    const pcx = region.polygon.reduce((s, p) => s + p.x, 0) / region.polygon.length;
    const pcy = region.polygon.reduce((s, p) => s + p.y, 0) / region.polygon.length;
    const points = region.polygon.flatMap((p) => [
      pcx + (p.x - pcx) * BUBBLE_PATCH_SCALE,
      pcy + (p.y - pcy) * BUBBLE_PATCH_SCALE
    ]);
    patch = { ...patchBase, shape: { type: "polygon", points } };
    const width = bw * BUBBLE_TEXT_SHARE;
    const height = bh * BUBBLE_TEXT_SHARE;
    blockBox = { x: cx - width / 2, y: cy - height / 2, width, height };
  } else {
    const mx = bw * FREE_PATCH_MARGIN_SHARE + FREE_PATCH_MARGIN_PX;
    const my = bh * FREE_PATCH_MARGIN_SHARE + FREE_PATCH_MARGIN_PX;
    const rect = clampBox({ x: box.x1 - mx, y: box.y1 - my, width: bw + 2 * mx, height: bh + 2 * my }, options.pageWidth, options.pageHeight);
    patch = { ...patchBase, shape: { type: "rect", ...rect } };
    const width = Math.max(bw, bh * 0.8);
    const height = Math.max(bh * 0.6, bw * 0.6);
    blockBox = { x: cx - width / 2, y: cy - height / 2, width, height };
  }
  blockBox = clampBox(blockBox, options.pageWidth, options.pageHeight);
  const block = newBlock(blockBox, {
    sourceIds: region.texts.map((t) => t.id),
    text: regionText(region)
  });
  const maxSize = Math.max(8, Math.round(options.pageHeight * (region.kind === "bubble" ? BUBBLE_MAX_FONT_SHARE : FREE_MAX_FONT_SHARE)));
  block.fontSize = Math.min(maxSize, fitFontSize(block, options.font));
  block.padding = Math.max(2, Math.round(block.fontSize * 0.15));
  const stats = options.background ? sampleBackground(options.background, { x1: blockBox.x, y1: blockBox.y, x2: blockBox.x + blockBox.width, y2: blockBox.y + blockBox.height }) : { mean: 255, darkShare: 0 };
  Object.assign(block, chooseTextStyle(stats, region.kind, block.fontSize));
  return { patch, block };
}
function plainText(text) {
  return text.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim();
}
function textUpdatesFor(state, regions) {
  const texts = /* @__PURE__ */ new Map();
  for (const region of regions) for (const t of region.texts) texts.set(t.id, t);
  const updates = [];
  const used = /* @__PURE__ */ new Set();
  for (const block of state.blocks) {
    const nodes = block.sourceIds.filter((id) => texts.has(id) && !used.has(id)).map((id) => texts.get(id));
    if (nodes.length === 0) continue;
    nodes.forEach((t) => used.add(t.id));
    const text = plainText(block.text);
    if (text === plainText(joinTexts(nodes))) continue;
    if (text === plainText(joinTexts(nodes, "auto"))) {
      for (const t of nodes) if (t.ukr !== t.auto) updates.push({ textId: t.id, ukr: t.auto });
      continue;
    }
    nodes.forEach((t, i) => updates.push({ textId: t.id, ukr: i === 0 ? text : "" }));
  }
  return updates;
}

// src/history.ts
var HISTORY_LIMIT = 200;
var COALESCE_MS = 1200;
var EditorHistory = class {
  constructor(now = () => Date.now()) {
    this.now = now;
  }
  now;
  past = [];
  future = [];
  lastKey = null;
  lastAt = 0;
  /** Запам'ятати стан перед зміною. Повертає false, якщо зміну об'єднано з попередньою */
  record(before, key) {
    const at = this.now();
    const coalesce = key !== void 0 && key === this.lastKey && at - this.lastAt < COALESCE_MS;
    this.lastKey = key ?? null;
    this.lastAt = at;
    if (coalesce) return false;
    this.past.push(JSON.stringify(before));
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    return true;
  }
  /** Завершити об'єднання: наступна зміна з тим самим ключем стане новим кроком */
  breakCoalescing() {
    this.lastKey = null;
  }
  undo(current) {
    const previous = this.past.pop();
    if (previous === void 0) return null;
    this.future.push(JSON.stringify(current));
    this.lastKey = null;
    return JSON.parse(previous);
  }
  redo(current) {
    const next = this.future.pop();
    if (next === void 0) return null;
    this.past.push(JSON.stringify(current));
    this.lastKey = null;
    return JSON.parse(next);
  }
  clear() {
    this.past = [];
    this.future = [];
    this.lastKey = null;
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
};

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COALESCE_MS,
  DEFAULT_BLOCK,
  EDITOR_FONT_FAMILY,
  EDITOR_STATE_VERSION,
  EditorHistory,
  HISTORY_LIMIT,
  HYPHEN_SIZE_GAIN,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  chooseTextStyle,
  createEmptyState,
  createFontInfo,
  drawPatch,
  drawTextBlock,
  fitFontSize,
  hyphenationPoints,
  joinTexts,
  layoutBlock,
  newBlock,
  normalizeState,
  normalizeText,
  parseRegions,
  plainText,
  pointInPolygon,
  regionText,
  renderPage,
  reworkRegion,
  sampleBackground,
  textUpdatesFor,
  uid,
  wrapText
});
