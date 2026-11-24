import {
  fitFontSize
} from "./chunk-GJ5PGPXS.js";

// src/types.ts
var EDITOR_STATE_VERSION = 1;

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

export {
  EDITOR_STATE_VERSION,
  parseRegions,
  regionText,
  joinTexts,
  pointInPolygon,
  DEFAULT_BLOCK,
  uid,
  createEmptyState,
  normalizeState,
  newBlock,
  sampleBackground,
  chooseTextStyle,
  reworkRegion,
  plainText,
  textUpdatesFor,
  HISTORY_LIMIT,
  COALESCE_MS,
  EditorHistory
};
