/**
 * Малювання сторінки редактора: картинка тайпсетера → латки → текстові блоки.
 * Той самий код малює і попередній перегляд, і фінальну картинку, що йде на бекенд.
 */
import type { EditorImages, EditorState, Patch, TextBlock } from './types'
import type { TextLayout } from './layout'

export const EDITOR_FONT_FAMILY = 'Anime Ace Editor'

type Ctx = CanvasRenderingContext2D

/** Шаблони картинок прив'язані до контексту: латка бере піксель із того самого місця сторінки */
const patternCache = new WeakMap<Ctx, Map<CanvasImageSource, CanvasPattern | null>>()

function patchStyle(ctx: Ctx, patch: Patch, images: EditorImages): string | CanvasPattern | null {
  if (patch.source === 'color') return patch.color ?? '#ffffff'
  const image = images[patch.source]
  if (!image) return null
  let cache = patternCache.get(ctx)
  if (!cache) {
    cache = new Map()
    patternCache.set(ctx, cache)
  }
  if (!cache.has(image)) cache.set(image, ctx.createPattern(image, 'no-repeat'))
  return cache.get(image) ?? null
}

export function drawPatch(ctx: Ctx, patch: Patch, images: EditorImages): void {
  const style = patchStyle(ctx, patch, images)
  if (!style) return
  const { shape } = patch
  ctx.save()
  ctx.beginPath()
  if (shape.type === 'rect') {
    ctx.rect(shape.x, shape.y, shape.width, shape.height)
    ctx.fillStyle = style
    ctx.fill()
  } else if (shape.type === 'polygon') {
    for (let i = 0; i < shape.points.length; i += 2) {
      if (i === 0) ctx.moveTo(shape.points[0], shape.points[1])
      else ctx.lineTo(shape.points[i], shape.points[i + 1])
    }
    ctx.closePath()
    ctx.fillStyle = style
    ctx.fill()
  } else {
    const pts = shape.points
    if (pts.length === 2) {
      ctx.arc(pts[0], pts[1], shape.size / 2, 0, Math.PI * 2)
      ctx.fillStyle = style
      ctx.fill()
    } else {
      ctx.moveTo(pts[0], pts[1])
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = shape.size
      ctx.strokeStyle = style
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawTextBlock(ctx: Ctx, block: TextBlock, layout: TextLayout, fontFamily = EDITOR_FONT_FAMILY): void {
  ctx.save()
  ctx.translate(block.x + block.width / 2, block.y + block.height / 2)
  ctx.rotate((block.rotation * Math.PI) / 180)
  ctx.translate(-block.width / 2, -block.height / 2)
  ctx.globalAlpha = block.opacity
  ctx.font = `${layout.fontSize}px "${fontFamily}"`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ;(ctx as any).letterSpacing = `${block.letterSpacing}px`

  if (block.stroke.enabled && block.stroke.width > 0) {
    ctx.strokeStyle = block.stroke.color
    ctx.lineWidth = block.stroke.width
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    for (const line of layout.lines) ctx.strokeText(line.text, line.x, line.baseline)
  }
  ctx.fillStyle = block.color
  for (const line of layout.lines) ctx.fillText(line.text, line.x, line.baseline)
  ctx.restore()
}

export interface RenderOptions {
  /** Розкладка блоку (кешується викликачем) */
  layoutOf: (block: TextBlock) => TextLayout
  fontFamily?: string
  /** Не малювати латки й текст — лише картинку тайпсетера */
  baseOnly?: boolean
}

export function renderPage(ctx: Ctx, state: EditorState, images: EditorImages, options: RenderOptions): void {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(images.auto, 0, 0, width, height)
  if (!options.baseOnly) {
    for (const patch of state.patches) drawPatch(ctx, patch, images)
    for (const block of state.blocks) drawTextBlock(ctx, block, options.layoutOf(block), options.fontFamily)
  }
  ctx.restore()
}
