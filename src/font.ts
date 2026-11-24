/**
 * Метрики шрифту редактора через будь-який 2D-контекст canvas: у браузері — звичайний canvas,
 * на сервері — @napi-rs/canvas. Сам файл шрифту пакет не містить: його підключає застосунок.
 */
import type { FontInfo } from './layout'
import { EDITOR_FONT_FAMILY } from './render'

export { EDITOR_FONT_FAMILY }

/** Кегль, на якому міряються метрики шрифту (далі — пропорційно) */
const PROBE_SIZE = 100

/** Те, що потрібно від контексту для вимірювання: спільне для браузера й @napi-rs/canvas */
export interface MeasureContext {
  font: string
  measureText(text: string): {
    width: number
    actualBoundingBoxAscent: number
    actualBoundingBoxDescent: number
  }
}

export function createFontInfo(ctx: MeasureContext, fontFamily = EDITOR_FONT_FAMILY): FontInfo {
  const setFont = (size: number, letterSpacing: number) => {
    ctx.font = `${size}px "${fontFamily}"`
    ;(ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacing}px`
  }

  setFont(PROBE_SIZE, 0)
  const tall = ctx.measureText('ЙЇÉ')
  const low = ctx.measureText('ЩДЦ,;')
  const ascent = tall.actualBoundingBoxAscent / PROBE_SIZE || 0.95
  const descent = low.actualBoundingBoxDescent / PROBE_SIZE || 0.2

  const cache = new Map<string, number>()
  return {
    ascent,
    descent,
    measure(text, fontSize, letterSpacing) {
      if (!text) return 0
      const key = `${fontSize}|${letterSpacing}|${text}`
      let width = cache.get(key)
      if (width === undefined) {
        setFont(fontSize, letterSpacing)
        // measureText враховує інтервал і після останнього знака — він до ширини рядка не належить
        width = ctx.measureText(text).width - letterSpacing
        if (cache.size > 20000) cache.clear()
        cache.set(key, width)
      }
      return width
    }
  }
}
