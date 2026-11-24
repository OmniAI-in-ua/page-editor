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
import Hypher from "hypher";
import ukrainianPatterns from "hyphenation.uk";
var HypherCtor = Hypher?.default ?? Hypher;
var patterns = ukrainianPatterns?.default ?? ukrainianPatterns;
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

export {
  normalizeText,
  hyphenationPoints,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  wrapText,
  layoutBlock,
  HYPHEN_SIZE_GAIN,
  fitFontSize
};
