/**
 * Розбір дерева metadata сторінки (клінер → перекладач): page.items → frame.children → bubble.texts → text.
 * Редактору потрібні контури бульбашок і вільного тексту та переклад їхніх текстових вузлів.
 */
import type { Box, Point } from './types'

export interface MetaText {
  id: string
  /** Поточний переклад (translation.ukr) */
  ukr: string
  /** Автоматичний переклад: до ручних правок (translation.ukrAuto) або поточний, якщо правок не було */
  auto: string
  readingIndex: number
  box: Box | null
  polygon: Point[] | null
}

export interface MetaRegion {
  /** id бульбашки або вільного тексту */
  id: string
  kind: 'bubble' | 'free'
  box: Box
  /** Контур: полігон детектора або прямокутник рамки */
  polygon: Point[]
  texts: MetaText[]
}

function toBox(raw: any): Box | null {
  if (!raw) return null
  if (Array.isArray(raw) && raw.length >= 4) {
    const [x1, y1, x2, y2] = raw.map(Number)
    return { x1, y1, x2, y2 }
  }
  const x1 = Number(raw.x1 ?? raw.x ?? 0)
  const y1 = Number(raw.y1 ?? raw.y ?? 0)
  const x2 = Number(raw.x2 ?? x1 + Number(raw.width ?? 0))
  const y2 = Number(raw.y2 ?? y1 + Number(raw.height ?? 0))
  if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return null
  return { x1, y1, x2, y2 }
}

function toPolygon(raw: any): Point[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null
  const points = raw
    .map((p: any) => (Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p?.x), y: Number(p?.y) }))
    .filter((p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y))
  return points.length >= 3 ? points : null
}

function boxPolygon(b: Box): Point[] {
  return [
    { x: b.x1, y: b.y1 },
    { x: b.x2, y: b.y1 },
    { x: b.x2, y: b.y2 },
    { x: b.x1, y: b.y2 }
  ]
}

function polygonBox(points: Point[]): Box {
  return {
    x1: Math.min(...points.map((p) => p.x)),
    y1: Math.min(...points.map((p) => p.y)),
    x2: Math.max(...points.map((p) => p.x)),
    y2: Math.max(...points.map((p) => p.y))
  }
}

function toText(node: any, fallbackIndex: number): MetaText | null {
  if (!node || typeof node.id !== 'string') return null
  const translation = node.translation ?? {}
  const ukr = typeof translation.ukr === 'string' ? translation.ukr : typeof translation.uk === 'string' ? translation.uk : ''
  const auto = translation.manual ? (typeof translation.ukrAuto === 'string' ? translation.ukrAuto : '') : ukr
  return {
    id: node.id,
    ukr,
    auto,
    readingIndex: Number.isFinite(node.readingIndex) ? node.readingIndex : fallbackIndex,
    box: toBox(node.box),
    polygon: toPolygon(node.polygon)
  }
}

function scalePoint(p: Point, sx: number, sy: number): Point {
  return { x: p.x * sx, y: p.y * sy }
}

/**
 * Бульбашки й вільні тексти сторінки. Координати масштабуються до розміру картинки редактора,
 * якщо metadata описує картинку іншого розміру (imageWidth/imageHeight).
 */
export function parseRegions(metadata: any, imageWidth: number, imageHeight: number): MetaRegion[] {
  const sx = metadata?.imageWidth > 0 ? imageWidth / metadata.imageWidth : 1
  const sy = metadata?.imageHeight > 0 ? imageHeight / metadata.imageHeight : 1
  const regions: MetaRegion[] = []

  const scaleRegion = (r: MetaRegion): MetaRegion => ({
    ...r,
    box: { x1: r.box.x1 * sx, y1: r.box.y1 * sy, x2: r.box.x2 * sx, y2: r.box.y2 * sy },
    polygon: r.polygon.map((p) => scalePoint(p, sx, sy)),
    texts: r.texts.map((t) => ({
      ...t,
      box: t.box && { x1: t.box.x1 * sx, y1: t.box.y1 * sy, x2: t.box.x2 * sx, y2: t.box.y2 * sy },
      polygon: t.polygon && t.polygon.map((p) => scalePoint(p, sx, sy))
    }))
  })

  const visit = (nodes: any) => {
    if (!Array.isArray(nodes)) return
    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') return
      if (node.type === 'frame') {
        visit(node.children)
        return
      }
      if (node.type === 'bubble') {
        const texts = (Array.isArray(node.texts) ? node.texts : [])
          .map((t: any, i: number) => toText(t, i))
          .filter((t: MetaText | null): t is MetaText => t !== null)
          .sort((a: MetaText, b: MetaText) => a.readingIndex - b.readingIndex)
        const polygon = toPolygon(node.polygon)
        const box = toBox(node.box) ?? (polygon && polygonBox(polygon))
        if (!box || typeof node.id !== 'string') return
        regions.push(scaleRegion({ id: node.id, kind: 'bubble', box, polygon: polygon ?? boxPolygon(box), texts }))
        return
      }
      const text = toText(node, index)
      const box = text?.box ?? (text?.polygon && polygonBox(text.polygon))
      if (text && box) {
        regions.push(scaleRegion({ id: text.id, kind: 'free', box, polygon: text.polygon ?? boxPolygon(box), texts: [text] }))
      }
    })
  }

  visit(metadata?.items)
  return regions
}

/** Переклад області: тексти в порядку читання, порожні пропускаються */
export function regionText(region: MetaRegion, which: 'ukr' | 'auto' = 'ukr'): string {
  return joinTexts(region.texts, which)
}

export function joinTexts(texts: MetaText[], which: 'ukr' | 'auto' = 'ukr'): string {
  return texts
    .map((t) => t[which].trim())
    .filter(Boolean)
    .join(' ')
}

export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}
