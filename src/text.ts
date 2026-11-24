/**
 * Нормалізація тексту під шрифт Anime Ace — ті самі заміни, що й у тайпсетера (font-manager.ts):
 * ґ→г (гліфа немає), апострофи, тире, відсутні знаки, великі літери.
 * На відміну від тайпсетера, ручні переноси рядків ('\n') зберігаються.
 */

const MISSING_GLYPHS: Array<[RegExp, string]> = [
  [/[♡❤]/g, '♥'],
  [/[♪♫♬♩]+/g, '~'],
  [/[ \t]*[★☆●◆○◇■□▲△▼▽◎※]+[ \t]*/g, ' • '],
  [/‼/g, '!!'],
  [/⁉/g, '?!'],
  [/⁈/g, '?!'],
  [/[·・]/g, '•'],
  [/№[ \t]*/g, 'N '],
  [/°/g, ''],
  [/[【〔［]/g, '['],
  [/[】〕］]/g, ']'],
  [/[〈《]/g, '«'],
  [/[〉》]/g, '»'],
  [/↑/g, '+'],
  [/↓/g, '-'],
  [/[→⇒]/g, '—'],
  [/ー+/g, '—']
]

export function normalizeText(text: string, uppercase: boolean): string {
  if (!text) return ''
  let s = text.normalize('NFC').replace(/\r\n?/g, '\n')
  s = s.replace(/ґ/g, 'г').replace(/Ґ/g, 'Г')
  s = s.replace(/['ʼ`‘’]/g, "'")
  s = s.replace(/(\d)[ \t]*[‒–—―−][ \t]*(?=\d)/g, '$1-')
  s = s.replace(/[‐‑]/g, '-').replace(/[‒–—―−]/g, '—')
  s = s.replace(/(^|[ \t])-(?=[ \t])/gm, '$1—')
  for (const [re, to] of MISSING_GLYPHS) s = s.replace(re, to)

  s = s
    .split('\n')
    .map((line) => line.replace(/^[ \t]*•[ \t]*|[ \t]*•[ \t]*$/g, '').replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '')

  return uppercase ? s.toLocaleUpperCase('uk-UA') : s
}
