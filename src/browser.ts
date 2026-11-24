/**
 * Браузер: завантаження шрифту редактора й метрики через звичайний canvas.
 * Адресу файлу шрифту дає застосунок (адмінка, сайт) — у пакеті шрифту немає.
 */
import { createFontInfo, EDITOR_FONT_FAMILY } from './font'
import type { FontInfo } from './layout'

const loading = new Map<string, Promise<FontInfo>>()

export function loadEditorFont(fontUrl: string, fontFamily = EDITOR_FONT_FAMILY): Promise<FontInfo> {
  let promise = loading.get(fontUrl)
  if (!promise) {
    promise = (async () => {
      const face = new FontFace(fontFamily, `url(${fontUrl})`)
      await face.load()
      document.fonts.add(face)
      return createCanvasFontInfo(fontFamily)
    })().catch((error: unknown) => {
      loading.delete(fontUrl)
      throw error
    })
    loading.set(fontUrl, promise)
  }
  return promise
}

export function createCanvasFontInfo(fontFamily = EDITOR_FONT_FAMILY): FontInfo {
  return createFontInfo(document.createElement('canvas').getContext('2d')!, fontFamily)
}
