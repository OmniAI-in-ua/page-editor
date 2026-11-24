/**
 * Операції зі станом редактора: нормалізація збереженого стану, нові блоки й латки,
 * переробка бульбашки чи вільного тексту з metadata, стиль за фоном, оновлення перекладу для бекенду.
 */
import {
  EDITOR_STATE_VERSION,
  type Box,
  type EditorState,
  type Patch,
  type PatchSource,
  type TextBlock
} from './types'
import type { MetaRegion, MetaText } from './metadata'
import { joinTexts, regionText } from './metadata'
import { fitFontSize, type FontInfo } from './layout'

/** Латка бульбашки трохи більша за полігон детектора: текст тайпсетера буває біля самого контуру */
const BUBBLE_PATCH_SCALE = 1.04
/** Частка рамки бульбашки під текст (вписаний у еліпс прямокутник ≈ 0.71) */
const BUBBLE_TEXT_SHARE = 0.72
/** Запас латки навколо вільного тексту: тайпсетер розширює зону вільного тексту */
const FREE_PATCH_MARGIN_SHARE = 0.15
const FREE_PATCH_MARGIN_PX = 8
/** Найбільший автоматичний кегль, частка висоти сторінки (як у звичайних реплік манги) */
const BUBBLE_MAX_FONT_SHARE = 0.03
const FREE_MAX_FONT_SHARE = 0.06

/** Пороги стилю — ті самі, що в тайпсетері (resolveTextStyle) */
const DARK_BACKGROUND_LUMINANCE = 80
const MID_BACKGROUND_LUMINANCE = 180
const BUSY_BACKGROUND_DARK_SHARE = 0.06
const BUSY_FREE_DARK_SHARE = 0.08
const VERY_BUSY_FREE_DARK_SHARE = 0.2
const STROKE = 0.12
const FREE_STROKE_BUSY = 0.2
const FREE_STROKE_VERY_BUSY = 0.26

export const DEFAULT_BLOCK: Omit<TextBlock, 'id' | 'x' | 'y' | 'width' | 'height'> = {
  sourceIds: [],
  text: '',
  rotation: 0,
  fontSize: 24,
  lineHeight: 1.15,
  letterSpacing: 0,
  align: 'center',
  padding: 4,
  hyphenate: true,
  uppercase: true,
  color: '#000000',
  stroke: { enabled: false, color: '#ffffff', width: 3 },
  opacity: 1
}

let counter = 0
export function uid(prefix: string): string {
  counter = (counter + 1) % 1e6
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function createEmptyState(): EditorState {
  return { version: EDITOR_STATE_VERSION, blocks: [], patches: [] }
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)

/** Стан із бекенду → повний стан (значення за замовчуванням для відсутніх полів, сміття відкидається) */
export function normalizeState(raw: unknown): EditorState {
  const state = createEmptyState()
  if (!raw || typeof raw !== 'object') return state
  const input = raw as Record<string, any>

  for (const b of Array.isArray(input.blocks) ? input.blocks : []) {
    if (!b || typeof b !== 'object') continue
    state.blocks.push({
      id: str(b.id, uid('blk')),
      sourceIds: Array.isArray(b.sourceIds) ? b.sourceIds.filter((s: unknown) => typeof s === 'string') : [],
      text: str(b.text, ''),
      x: num(b.x, 0),
      y: num(b.y, 0),
      width: Math.max(1, num(b.width, 100)),
      height: Math.max(1, num(b.height, 50)),
      rotation: num(b.rotation, 0),
      fontSize: Math.max(1, num(b.fontSize, DEFAULT_BLOCK.fontSize)),
      lineHeight: num(b.lineHeight, DEFAULT_BLOCK.lineHeight),
      letterSpacing: num(b.letterSpacing, 0),
      align: ['left', 'center', 'right'].includes(b.align) ? b.align : 'center',
      padding: Math.max(0, num(b.padding, DEFAULT_BLOCK.padding)),
      hyphenate: typeof b.hyphenate === 'boolean' ? b.hyphenate : true,
      uppercase: typeof b.uppercase === 'boolean' ? b.uppercase : true,
      color: str(b.color, '#000000'),
      stroke: {
        enabled: Boolean(b.stroke?.enabled),
        color: str(b.stroke?.color, '#ffffff'),
        width: Math.max(0, num(b.stroke?.width, DEFAULT_BLOCK.stroke.width))
      },
      opacity: Math.min(1, Math.max(0, num(b.opacity, 1)))
    })
  }

  for (const p of Array.isArray(input.patches) ? input.patches : []) {
    if (!p || typeof p !== 'object' || !['cleaned', 'original', 'auto', 'color'].includes(p.source)) continue
    const shape = p.shape
    const valid =
      (shape?.type === 'rect' && [shape.x, shape.y, shape.width, shape.height].every(Number.isFinite)) ||
      (shape?.type === 'polygon' && Array.isArray(shape.points) && shape.points.length >= 6) ||
      (shape?.type === 'stroke' && Array.isArray(shape.points) && shape.points.length >= 2 && Number.isFinite(shape.size))
    if (!valid) continue
    state.patches.push({ id: str(p.id, uid('pat')), source: p.source, color: p.color, shape })
  }
  return state
}

export function newBlock(box: { x: number; y: number; width: number; height: number }, overrides: Partial<TextBlock> = {}): TextBlock {
  return {
    ...structuredClone(DEFAULT_BLOCK),
    id: uid('blk'),
    ...box,
    ...overrides
  }
}

// ---------- Стиль за фоном ----------

export interface BackgroundStats {
  /** Середня яскравість 0..255 */
  mean: number
  /** Частка темних пікселів (< 100) */
  darkShare: number
}

export interface PixelData {
  data: Uint8ClampedArray
  width: number
  height: number
}

export function sampleBackground(pixels: PixelData, box: Box, step = 2): BackgroundStats {
  const x1 = Math.max(0, Math.floor(box.x1))
  const y1 = Math.max(0, Math.floor(box.y1))
  const x2 = Math.min(pixels.width, Math.ceil(box.x2))
  const y2 = Math.min(pixels.height, Math.ceil(box.y2))
  let sum = 0
  let dark = 0
  let count = 0
  for (let y = y1; y < y2; y += step) {
    for (let x = x1; x < x2; x += step) {
      const i = (y * pixels.width + x) * 4
      const v = 0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2]
      sum += v
      if (v < 100) dark++
      count++
    }
  }
  return count > 0 ? { mean: sum / count, darkShare: dark / count } : { mean: 255, darkShare: 0 }
}

/** Колір тексту й обводка за фоном — та сама логіка, що в тайпсетері */
export function chooseTextStyle(
  stats: BackgroundStats,
  kind: 'bubble' | 'free',
  fontSize: number
): Pick<TextBlock, 'color' | 'stroke'> {
  const stroke = (color: string, share: number) => ({ enabled: true, color, width: Math.max(1, Math.round(fontSize * share)) })
  const none = (color: string) => ({ enabled: false, color, width: Math.max(1, Math.round(fontSize * STROKE)) })

  if (stats.mean < DARK_BACKGROUND_LUMINANCE) {
    return { color: '#ffffff', stroke: kind === 'free' ? stroke('#000000', STROKE) : none('#000000') }
  }
  if (kind === 'free') {
    const share =
      stats.darkShare > VERY_BUSY_FREE_DARK_SHARE
        ? FREE_STROKE_VERY_BUSY
        : stats.darkShare > BUSY_FREE_DARK_SHARE
          ? FREE_STROKE_BUSY
          : STROKE
    return { color: '#000000', stroke: stroke('#ffffff', share) }
  }
  if (stats.mean <= MID_BACKGROUND_LUMINANCE || stats.darkShare > BUSY_BACKGROUND_DARK_SHARE) {
    return { color: '#000000', stroke: stroke('#ffffff', STROKE) }
  }
  return { color: '#000000', stroke: none('#ffffff') }
}

// ---------- Переробка області з metadata ----------

export interface ReworkOptions {
  font: FontInfo
  pageWidth: number
  pageHeight: number
  /** Пікселі очищеної сторінки (для кольору тексту); немає — чорний текст без обводки */
  background?: PixelData | null
  /** Джерело латки: очищена сторінка, а якщо її немає — білий колір */
  patchSource: PatchSource
}

function clampBox(b: { x: number; y: number; width: number; height: number }, w: number, h: number) {
  const width = Math.min(b.width, w)
  const height = Math.min(b.height, h)
  return {
    x: Math.min(Math.max(0, b.x), w - width),
    y: Math.min(Math.max(0, b.y), h - height),
    width,
    height
  }
}

/** Латка, що стирає текст тайпсетера в області, і новий блок із перекладом області */
export function reworkRegion(region: MetaRegion, options: ReworkOptions): { patch: Patch; block: TextBlock } {
  const { box } = region
  const bw = box.x2 - box.x1
  const bh = box.y2 - box.y1
  const cx = (box.x1 + box.x2) / 2
  const cy = (box.y1 + box.y2) / 2
  const patchBase = { id: uid('pat'), source: options.patchSource, ...(options.patchSource === 'color' ? { color: '#ffffff' } : {}) }

  let patch: Patch
  let blockBox: { x: number; y: number; width: number; height: number }
  if (region.kind === 'bubble') {
    const pcx = region.polygon.reduce((s, p) => s + p.x, 0) / region.polygon.length
    const pcy = region.polygon.reduce((s, p) => s + p.y, 0) / region.polygon.length
    const points = region.polygon.flatMap((p) => [
      pcx + (p.x - pcx) * BUBBLE_PATCH_SCALE,
      pcy + (p.y - pcy) * BUBBLE_PATCH_SCALE
    ])
    patch = { ...patchBase, shape: { type: 'polygon', points } }
    const width = bw * BUBBLE_TEXT_SHARE
    const height = bh * BUBBLE_TEXT_SHARE
    blockBox = { x: cx - width / 2, y: cy - height / 2, width, height }
  } else {
    const mx = bw * FREE_PATCH_MARGIN_SHARE + FREE_PATCH_MARGIN_PX
    const my = bh * FREE_PATCH_MARGIN_SHARE + FREE_PATCH_MARGIN_PX
    const rect = clampBox({ x: box.x1 - mx, y: box.y1 - my, width: bw + 2 * mx, height: bh + 2 * my }, options.pageWidth, options.pageHeight)
    patch = { ...patchBase, shape: { type: 'rect', ...rect } }
    // Японський вертикальний текст вузький і високий — український рядок потребує ширини
    const width = Math.max(bw, bh * 0.8)
    const height = Math.max(bh * 0.6, bw * 0.6)
    blockBox = { x: cx - width / 2, y: cy - height / 2, width, height }
  }
  blockBox = clampBox(blockBox, options.pageWidth, options.pageHeight)

  const block = newBlock(blockBox, {
    sourceIds: region.texts.map((t) => t.id),
    text: regionText(region)
  })
  const maxSize = Math.max(8, Math.round(options.pageHeight * (region.kind === 'bubble' ? BUBBLE_MAX_FONT_SHARE : FREE_MAX_FONT_SHARE)))
  block.fontSize = Math.min(maxSize, fitFontSize(block, options.font))
  block.padding = Math.max(2, Math.round(block.fontSize * 0.15))

  const stats = options.background
    ? sampleBackground(options.background, { x1: blockBox.x, y1: blockBox.y, x2: blockBox.x + blockBox.width, y2: blockBox.y + blockBox.height })
    : { mean: 255, darkShare: 0 }
  Object.assign(block, chooseTextStyle(stats, region.kind, block.fontSize))
  return { patch, block }
}

// ---------- Переклад назад у metadata ----------

export interface TextUpdate {
  textId: string
  ukr: string
}

/** Текст блоку для metadata: ручні переноси рядків → пробіли */
export function plainText(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

/**
 * Змінені переклади для бекенду. Текст блоку записується в перший вузол-джерело, решта вузлів блоку
 * отримують порожній переклад (весь текст репліки — в одному вузлі). Блок без змін не чіпає metadata.
 * Текст, повернутий до автоматичного перекладу, повертає кожному вузлу його автоматичний переклад.
 */
export function textUpdatesFor(state: EditorState, regions: MetaRegion[]): TextUpdate[] {
  const texts = new Map<string, MetaText>()
  for (const region of regions) for (const t of region.texts) texts.set(t.id, t)

  const updates: TextUpdate[] = []
  const used = new Set<string>()
  for (const block of state.blocks) {
    const nodes = block.sourceIds.filter((id) => texts.has(id) && !used.has(id)).map((id) => texts.get(id)!)
    if (nodes.length === 0) continue
    nodes.forEach((t) => used.add(t.id))

    const text = plainText(block.text)
    if (text === plainText(joinTexts(nodes))) continue
    if (text === plainText(joinTexts(nodes, 'auto'))) {
      for (const t of nodes) if (t.ukr !== t.auto) updates.push({ textId: t.id, ukr: t.auto })
      continue
    }
    nodes.forEach((t, i) => updates.push({ textId: t.id, ukr: i === 0 ? text : '' }))
  }
  return updates
}
