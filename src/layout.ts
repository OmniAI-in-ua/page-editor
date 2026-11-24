/**
 * Розкладка тексту блоку: рядки з урахуванням ручних переносів ('\n'), автоперенесення слів за складами,
 * вирівнювання по горизонталі, центрування по вертикалі в рамці з відступом.
 * Вимірювання ширини винесено в FontInfo, тож модуль не залежить від canvas (і тестується без браузера).
 */
import type { TextBlock } from './types'
import { normalizeText } from './text'
import { hyphenationPoints } from './hyphenation'

export interface FontInfo {
  /** Ширина рядка, px: від першого до останнього знака (без хвостового міжлітерного інтервалу) */
  measure(text: string, fontSize: number, letterSpacing: number): number
  /** Висота над базовою лінією (з діакритикою Й/Ї), частка кегля */
  ascent: number
  /** Висота під базовою лінією (коми, хвостики Щ/Д), частка кегля */
  descent: number
}

export interface LayoutLine {
  text: string
  width: number
  /** Початок рядка та базова лінія — відносно лівого верхнього кута рамки (без повороту) */
  x: number
  baseline: number
}

export interface TextLayout {
  lines: LayoutLine[]
  fontSize: number
  lineHeightPx: number
  /** Текст не вміщується в рамку (за шириною чи висотою) */
  overflow: boolean
  hyphens: number
}

export const MIN_FONT_SIZE = 6
export const MAX_FONT_SIZE = 400
/** Допуск на округлення при перевірці «вміщується», px */
const FIT_TOLERANCE = 0.5

interface WrapResult {
  lines: string[]
  hyphens: number
  overflow: boolean
}

/** Місця, де слово рветься без доданого дефіса: після власного дефіса/тире («БУДЬ-ЯКИЙ») */
function naturalBreaks(word: string): number[] {
  const points: number[] = []
  for (let i = 1; i < word.length - 1; i++) {
    if (/[-—]/.test(word[i - 1]) && /[^-—]/.test(word[i])) points.push(i)
  }
  return points
}

export function wrapText(
  text: string,
  maxWidth: number,
  width: (s: string) => number,
  hyphenate: boolean
): WrapResult {
  const lines: string[] = []
  let hyphens = 0
  let overflow = false
  const fits = (s: string) => width(s) <= maxWidth + FIT_TOLERANCE

  for (const paragraph of text.split('\n')) {
    let current = ''
    for (const word of paragraph.split(' ').filter(Boolean)) {
      let rest = word
      while (rest) {
        const prefix = current ? `${current} ` : ''
        if (fits(prefix + rest)) {
          current = prefix + rest
          break
        }
        // Слово, що вміщується в окремий рядок, переносимо цілим: переноси — лише коли інакше ніяк
        if (current && fits(rest)) {
          lines.push(current)
          current = ''
          continue
        }

        const candidates = [
          ...naturalBreaks(rest).map((pos) => ({ pos, dash: '' })),
          ...(hyphenate ? hyphenationPoints(rest).map((pos) => ({ pos, dash: '-' })) : [])
        ].sort((a, b) => b.pos - a.pos)
        const split = candidates.find(({ pos, dash }) => fits(prefix + rest.slice(0, pos) + dash))
        if (split) {
          lines.push(prefix + rest.slice(0, split.pos) + split.dash)
          if (split.dash) hyphens++
          current = ''
          rest = rest.slice(split.pos)
          continue
        }

        if (current) {
          lines.push(current)
          current = ''
          continue
        }
        // Навіть на порожньому рядку не вміщується і розірвати нема де
        current = rest
        overflow = true
        break
      }
    }
    lines.push(current)
  }
  return { lines, hyphens, overflow }
}

export function layoutBlock(block: TextBlock, font: FontInfo, fontSize = block.fontSize): TextLayout {
  const text = normalizeText(block.text, block.uppercase)
  const padding = Math.max(0, Math.min(block.padding, block.width / 2 - 1, block.height / 2 - 1))
  const availWidth = Math.max(1, block.width - 2 * padding)
  const availHeight = Math.max(1, block.height - 2 * padding)
  const measure = (s: string) => font.measure(s, fontSize, block.letterSpacing)

  const wrapped = wrapText(text, availWidth, measure, block.hyphenate)
  const lineHeightPx = fontSize * block.lineHeight
  const ascent = fontSize * font.ascent
  const descent = fontSize * font.descent
  const textHeight = (wrapped.lines.length - 1) * lineHeightPx + ascent + descent
  const top = padding + (availHeight - textHeight) / 2

  const lines = wrapped.lines.map((lineText, i) => {
    const width = measure(lineText)
    const x =
      block.align === 'left'
        ? padding
        : block.align === 'right'
          ? block.width - padding - width
          : (block.width - width) / 2
    return { text: lineText, width, x, baseline: top + ascent + i * lineHeightPx }
  })

  const overflow =
    wrapped.overflow ||
    lines.some((l) => l.width > availWidth + FIT_TOLERANCE) ||
    textHeight > availHeight + FIT_TOLERANCE

  return { lines, fontSize, lineHeightPx, overflow, hyphens: wrapped.hyphens }
}

/**
 * Перенос слова виправданий, лише якщо дає помітно більший кегль (у тайпсетері перенос «коштує» ≈ 22% кегля):
 * інакше короткі репліки рвалися б заради кількох пікселів
 */
export const HYPHEN_SIZE_GAIN = 1.22

function largestFitting(block: TextBlock, font: FontInfo, min: number, max: number): number {
  const upper = Math.max(min, Math.min(max, Math.floor(block.height)))
  if (layoutBlock(block, font, min).overflow) return min
  let lo = min
  let hi = upper
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (layoutBlock(block, font, mid).overflow) hi = mid - 1
    else lo = mid
  }
  return lo
}

/** Найбільший цілий кегль, з яким текст вміщується в рамку; якщо ніякий — мінімальний */
export function fitFontSize(block: TextBlock, font: FontInfo, min = MIN_FONT_SIZE, max = MAX_FONT_SIZE): number {
  const whole = { ...block, hyphenate: false }
  const plain = largestFitting(whole, font, min, max)
  if (!block.hyphenate) return plain
  const hyphenated = largestFitting(block, font, min, max)
  const plainFits = !layoutBlock(whole, font, plain).overflow
  return !plainFits || hyphenated > plain * HYPHEN_SIZE_GAIN ? hyphenated : plain
}
