/**
 * Сервер: та сама картинка, що й у браузері, але зібрана на бекенді з @napi-rs/canvas.
 * Читачам не можна довіряти готову PNG з браузера, тож бекенд приймає лише стан редактора
 * і зводить сторінку сам тим самим кодом малювання.
 */
import { createCanvas, GlobalFonts, loadImage, type Image } from '@napi-rs/canvas'
import { createFontInfo, EDITOR_FONT_FAMILY } from './font'
import { layoutBlock, type FontInfo, type TextLayout } from './layout'
import { renderPage } from './render'
import type { EditorImages, EditorState, TextBlock } from './types'

/** Зареєструвати файл шрифту (TTF/OTF) під назвою редактора; повертає метрики */
export function registerEditorFont(fontPath: string, fontFamily = EDITOR_FONT_FAMILY): FontInfo {
  if (!GlobalFonts.registerFromPath(fontPath, fontFamily)) {
    throw new Error(`Не вдалося зареєструвати шрифт ${fontPath}`)
  }
  return createFontInfo(createCanvas(1, 1).getContext('2d'), fontFamily)
}

/** Картинка з байтів (PNG/JPEG/WebP) або з адреси */
export function loadEditorImage(source: Buffer | string): Promise<Image> {
  return loadImage(source)
}

export interface NodeRenderInput {
  state: EditorState
  /** auto — картинка тайпсетера (основа), решта — джерела латок */
  images: { auto: Image; cleaned?: Image | null; original?: Image | null }
  font: FontInfo
  fontFamily?: string
}

/** Звести сторінку в PNG розміром картинки тайпсетера */
export function renderPagePng({ state, images, font, fontFamily = EDITOR_FONT_FAMILY }: NodeRenderInput): Buffer {
  const canvas = createCanvas(images.auto.width, images.auto.height)
  const ctx = canvas.getContext('2d')
  const layouts = new Map<TextBlock, TextLayout>()
  renderPage(ctx as unknown as CanvasRenderingContext2D, state, images as unknown as EditorImages, {
    fontFamily,
    layoutOf: (block) => {
      let layout = layouts.get(block)
      if (!layout) {
        layout = layoutBlock(block, font)
        layouts.set(block, layout)
      }
      return layout
    },
  })
  return canvas.toBuffer('image/png')
}
