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

// src/vue/useEditor.ts
var useEditor_exports = {};
__export(useEditor_exports, {
  MIN_BLOCK_SIZE: () => MIN_BLOCK_SIZE,
  useEditor: () => useEditor
});
module.exports = __toCommonJS(useEditor_exports);
var import_vue = require("vue");

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

// src/types.ts
var EDITOR_STATE_VERSION = 1;

// src/metadata.ts
function regionText(region, which = "ukr") {
  return joinTexts(region.texts, which);
}
function joinTexts(texts, which = "ukr") {
  return texts.map((t) => t[which].trim()).filter(Boolean).join(" ");
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

// src/vue/useEditor.ts
var MIN_BLOCK_SIZE = 8;
function useEditor() {
  const state = (0, import_vue.ref)(createEmptyState());
  const selectedBlockId = (0, import_vue.ref)(null);
  const selectedRegionId = (0, import_vue.ref)(null);
  const hoveredPatchId = (0, import_vue.ref)(null);
  const tool = (0, import_vue.ref)("select");
  const view = (0, import_vue.ref)("result");
  const brush = (0, import_vue.reactive)({ source: "cleaned", color: "#ffffff", size: 24 });
  const dirty = (0, import_vue.ref)(false);
  const revision = (0, import_vue.ref)(0);
  const images = (0, import_vue.shallowRef)(null);
  const font = (0, import_vue.shallowRef)(null);
  const regions = (0, import_vue.shallowRef)([]);
  const pageSize = (0, import_vue.reactive)({ width: 0, height: 0 });
  let backgroundPixels = null;
  const history = new EditorHistory();
  const selectedBlock = (0, import_vue.computed)(() => state.value.blocks.find((b) => b.id === selectedBlockId.value) ?? null);
  const selectedRegion = (0, import_vue.computed)(() => regions.value.find((r) => r.id === selectedRegionId.value) ?? null);
  const canUndo = (0, import_vue.computed)(() => (revision.value, history.canUndo));
  const canRedo = (0, import_vue.computed)(() => (revision.value, history.canRedo));
  const reworkedTextIds = (0, import_vue.computed)(() => new Set(state.value.blocks.flatMap((b) => b.sourceIds)));
  const layoutCache = /* @__PURE__ */ new Map();
  function layoutOf(block) {
    const key = [
      block.text,
      block.fontSize,
      block.width,
      block.height,
      block.padding,
      block.lineHeight,
      block.letterSpacing,
      block.align,
      block.hyphenate,
      block.uppercase
    ].join("|");
    let layout = layoutCache.get(key);
    if (!layout) {
      layout = layoutBlock(block, font.value);
      if (layoutCache.size > 2e3) layoutCache.clear();
      layoutCache.set(key, layout);
    }
    return layout;
  }
  function load(input) {
    state.value = normalizeState(input.state);
    images.value = input.images;
    font.value = input.font;
    regions.value = input.regions;
    pageSize.width = input.width;
    pageSize.height = input.height;
    backgroundPixels = input.background;
    layoutCache.clear();
    history.clear();
    selectedBlockId.value = null;
    selectedRegionId.value = null;
    dirty.value = false;
    revision.value++;
  }
  function mutate(fn, key) {
    history.record(state.value, key);
    fn(state.value);
    dirty.value = true;
    revision.value++;
  }
  function updateBlock(id, patch, key) {
    mutate((s) => {
      const block = s.blocks.find((b) => b.id === id);
      if (block) Object.assign(block, patch);
    }, key);
  }
  function undo() {
    const previous = history.undo(state.value);
    if (!previous) return;
    state.value = previous;
    afterHistoryJump();
  }
  function redo() {
    const next = history.redo(state.value);
    if (!next) return;
    state.value = next;
    afterHistoryJump();
  }
  function afterHistoryJump() {
    if (selectedBlockId.value && !state.value.blocks.some((b) => b.id === selectedBlockId.value)) {
      selectedBlockId.value = null;
    }
    dirty.value = true;
    revision.value++;
  }
  function endGesture() {
    history.breakCoalescing();
  }
  function selectBlock(id) {
    selectedBlockId.value = id;
    if (id) selectedRegionId.value = null;
  }
  function selectRegion(id) {
    selectedRegionId.value = id;
    if (id) selectedBlockId.value = null;
  }
  function patchSourceAvailable(source) {
    return source === "color" || source === "auto" || Boolean(images.value?.[source]);
  }
  function reworkRegionById(regionId) {
    const region = regions.value.find((r) => r.id === regionId);
    if (!region || !font.value) return null;
    const { patch, block } = reworkRegion(region, {
      font: font.value,
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      background: backgroundPixels,
      patchSource: patchSourceAvailable("cleaned") ? "cleaned" : "color"
    });
    mutate((s) => {
      s.patches.push(patch);
      s.blocks.push(block);
    });
    selectBlock(block.id);
    tool.value = "select";
    return block;
  }
  function addBlock(box) {
    const block = newBlock(box, { text: "" });
    block.fontSize = Math.max(10, Math.round(pageSize.height * 0.02));
    block.padding = Math.round(block.fontSize * 0.15);
    mutate((s) => s.blocks.push(block));
    selectBlock(block.id);
    return block;
  }
  function duplicateBlock(id) {
    const source = state.value.blocks.find((b) => b.id === id);
    if (!source) return;
    const copy = { ...structuredClone(source), id: uid("blk"), sourceIds: [], x: source.x + 20, y: source.y + 20 };
    mutate((s) => s.blocks.push(copy));
    selectBlock(copy.id);
  }
  function deleteBlock(id) {
    mutate((s) => {
      s.blocks = s.blocks.filter((b) => b.id !== id);
    });
    if (selectedBlockId.value === id) selectedBlockId.value = null;
  }
  function fitBlock(id) {
    const block = state.value.blocks.find((b) => b.id === id);
    if (!block || !font.value) return;
    updateBlock(id, { fontSize: fitFontSize(block, font.value) });
  }
  function addPatch(patch, key) {
    const full = { ...patch, id: patch.id ?? uid("pat") };
    mutate((s) => s.patches.push(full), key);
    return full;
  }
  function extendStroke(id, x, y) {
    mutate((s) => {
      const patch = s.patches.find((p) => p.id === id);
      if (patch?.shape.type === "stroke") patch.shape.points.push(x, y);
    }, `stroke:${id}`);
  }
  function deletePatch(id) {
    mutate((s) => {
      s.patches = s.patches.filter((p) => p.id !== id);
    });
    if (hoveredPatchId.value === id) hoveredPatchId.value = null;
  }
  function markSaved() {
    dirty.value = false;
    history.breakCoalescing();
  }
  return {
    state,
    selectedBlockId,
    selectedRegionId,
    selectedBlock,
    selectedRegion,
    hoveredPatchId,
    tool,
    view,
    brush,
    dirty,
    revision,
    images,
    font,
    regions,
    pageSize,
    reworkedTextIds,
    canUndo,
    canRedo,
    layoutOf,
    load,
    mutate,
    updateBlock,
    undo,
    redo,
    endGesture,
    selectBlock,
    selectRegion,
    patchSourceAvailable,
    reworkRegionById,
    addBlock,
    duplicateBlock,
    deleteBlock,
    fitBlock,
    addPatch,
    extendStroke,
    deletePatch,
    markSaved
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MIN_BLOCK_SIZE,
  useEditor
});
