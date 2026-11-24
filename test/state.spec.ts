import { describe, expect, it } from 'vitest'
import { parseRegions, pointInPolygon, regionText } from '../src/metadata'
import {
  chooseTextStyle,
  createEmptyState,
  normalizeState,
  reworkRegion,
  sampleBackground,
  textUpdatesFor
} from '../src/state'
import { layoutBlock } from '../src/layout'
import { block, monoFont, sampleMetadata } from './fixtures'

describe('parseRegions', () => {
  const regions = parseRegions(sampleMetadata, 800, 1200)

  it('finds bubbles and free texts in frames and at the page root', () => {
    expect(regions.map((r) => [r.id, r.kind])).toEqual([
      ['b1', 'bubble'],
      ['t3', 'free'],
      ['t4', 'free']
    ])
  })

  it('orders bubble texts by reading index and joins the translation', () => {
    expect(regions[0].texts.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(regionText(regions[0])).toBe('Привіт! як ти?')
  })

  it('accepts array boxes and builds a polygon from the box', () => {
    expect(regions[2].box).toEqual({ x1: 10, y1: 10, x2: 60, y2: 40 })
    expect(regions[2].polygon).toHaveLength(4)
  })

  it('scales coordinates to the editor image size', () => {
    const scaled = parseRegions(sampleMetadata, 400, 600)
    expect(scaled[0].box).toEqual({ x1: 50, y1: 50, x2: 150, y2: 130 })
  })

  it('survives missing or malformed metadata', () => {
    expect(parseRegions(null, 100, 100)).toEqual([])
    expect(parseRegions({ items: [{ type: 'bubble', id: 'x' }, 5, null] }, 100, 100)).toEqual([])
  })

  it('pointInPolygon', () => {
    expect(pointInPolygon({ x: 200, y: 200 }, regions[0].polygon)).toBe(true)
    expect(pointInPolygon({ x: 50, y: 200 }, regions[0].polygon)).toBe(false)
  })
})

describe('normalizeState', () => {
  it('fills defaults and drops invalid patches', () => {
    const state = normalizeState({
      version: 1,
      blocks: [{ id: 'a', text: 'Т', x: 1, y: 2, width: 30, height: 20, stroke: { enabled: true } }],
      patches: [
        { id: 'p1', source: 'cleaned', shape: { type: 'rect', x: 0, y: 0, width: 5, height: 5 } },
        { id: 'p2', source: 'evil', shape: { type: 'rect', x: 0, y: 0, width: 5, height: 5 } },
        { id: 'p3', source: 'original', shape: { type: 'polygon', points: [0, 0] } }
      ]
    })
    expect(state.blocks[0]).toMatchObject({ id: 'a', align: 'center', uppercase: true, stroke: { enabled: true, color: '#ffffff' } })
    expect(state.patches.map((p) => p.id)).toEqual(['p1'])
  })

  it('returns an empty state for garbage', () => {
    expect(normalizeState('x')).toEqual(createEmptyState())
  })
})

describe('background style', () => {
  const pixels = (value: number, w = 10, h = 10) => ({
    data: new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 3 ? 255 : value)),
    width: w,
    height: h
  })

  it('samples mean luminance and dark share', () => {
    expect(sampleBackground(pixels(20), { x1: 0, y1: 0, x2: 10, y2: 10 })).toEqual({ mean: 20, darkShare: 1 })
  })

  it('white text on dark bubbles, black on white, stroke for free text', () => {
    expect(chooseTextStyle({ mean: 20, darkShare: 1 }, 'bubble', 20)).toMatchObject({ color: '#ffffff', stroke: { enabled: false } })
    expect(chooseTextStyle({ mean: 250, darkShare: 0 }, 'bubble', 20)).toMatchObject({ color: '#000000', stroke: { enabled: false } })
    expect(chooseTextStyle({ mean: 250, darkShare: 0.3 }, 'free', 20)).toMatchObject({
      color: '#000000',
      stroke: { enabled: true, color: '#ffffff', width: 5 }
    })
  })
})

describe('reworkRegion', () => {
  const regions = parseRegions(sampleMetadata, 800, 1200)
  const options = { font: monoFont, pageWidth: 800, pageHeight: 1200, patchSource: 'cleaned' as const }

  it('bubble: polygon patch slightly larger than the bubble, block inside with fitted text', () => {
    const { patch, block: b } = reworkRegion(regions[0], options)
    expect(patch.source).toBe('cleaned')
    expect(patch.shape.type).toBe('polygon')
    const xs = (patch.shape as any).points.filter((_: number, i: number) => i % 2 === 0)
    expect(Math.min(...xs)).toBeLessThan(100)
    expect(b.sourceIds).toEqual(['t1', 't2'])
    expect(b.text).toBe('Привіт! як ти?')
    expect(b.x).toBeGreaterThan(100)
    expect(b.x + b.width).toBeLessThan(300)
    expect(b.fontSize).toBeLessThanOrEqual(36)
    expect(layoutBlock(b, monoFont).overflow).toBe(false)
  })

  it('free text: rect patch with margin, wider block for horizontal text', () => {
    const { patch, block: b } = reworkRegion(regions[1], options)
    expect(patch.shape).toMatchObject({ type: 'rect' })
    const rect = patch.shape as any
    expect(rect.x).toBeLessThan(500)
    expect(rect.x + rect.width).toBeGreaterThan(540)
    expect(b.width).toBeGreaterThan(40)
  })

  it('white color patch when there is no cleaned image', () => {
    const { patch } = reworkRegion(regions[0], { ...options, patchSource: 'color' })
    expect(patch).toMatchObject({ source: 'color', color: '#ffffff' })
  })

  it('keeps the block inside the page', () => {
    const { block: b } = reworkRegion(regions[2], options)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeGreaterThanOrEqual(0)
  })
})

describe('textUpdatesFor', () => {
  const regions = parseRegions(sampleMetadata, 800, 1200)
  const state = (blocks: any[]) => ({ ...createEmptyState(), blocks })

  it('no updates for unchanged text (manual line breaks do not count)', () => {
    expect(textUpdatesFor(state([block({ sourceIds: ['t1', 't2'], text: 'Привіт!\nяк ти?' })]), regions)).toEqual([])
  })

  it('writes the whole text into the first source, clears the rest', () => {
    expect(textUpdatesFor(state([block({ sourceIds: ['t1', 't2'], text: 'Привіт,\nдруже!' })]), regions)).toEqual([
      { textId: 't1', ukr: 'Привіт, друже!' },
      { textId: 't2', ukr: '' }
    ])
  })

  it('ignores blocks without sources, unknown ids and duplicates', () => {
    const updates = textUpdatesFor(
      state([
        block({ sourceIds: [], text: 'Новий' }),
        block({ sourceIds: ['zz', 't3'], text: 'Бабах' }),
        block({ sourceIds: ['t3'], text: 'Інше' })
      ]),
      regions
    )
    expect(updates).toEqual([{ textId: 't3', ukr: 'Бабах' }])
  })
})

describe('textUpdatesFor after a manual edit', () => {
  const edited = {
    items: [
      {
        id: 'b1',
        type: 'bubble',
        box: [0, 0, 100, 100],
        texts: [
          { id: 't1', readingIndex: 0, translation: { ukr: 'Ручний текст', ukrAuto: 'Привіт!', manual: true } },
          { id: 't2', readingIndex: 1, translation: { ukr: '', ukrAuto: 'як ти?', manual: true } }
        ]
      }
    ]
  }
  const regions = parseRegions(edited, 100, 100)
  const state = (text: string) => ({ ...createEmptyState(), blocks: [block({ sourceIds: ['t1', 't2'], text })] })

  it('exposes the automatic translation', () => {
    expect(regionText(regions[0], 'auto')).toBe('Привіт! як ти?')
    expect(regionText(regions[0])).toBe('Ручний текст')
  })

  it('no updates while the manual text is unchanged', () => {
    expect(textUpdatesFor(state('Ручний\nтекст'), regions)).toEqual([])
  })

  it('returning to the automatic text restores every node', () => {
    expect(textUpdatesFor(state('Привіт! як ти?'), regions)).toEqual([
      { textId: 't1', ukr: 'Привіт!' },
      { textId: 't2', ukr: 'як ти?' }
    ])
  })
})
