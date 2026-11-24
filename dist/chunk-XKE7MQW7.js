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

export {
  EDITOR_FONT_FAMILY,
  drawPatch,
  drawTextBlock,
  renderPage,
  createFontInfo
};
