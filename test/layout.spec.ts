import { describe, expect, it } from 'vitest'
import { fitFontSize, layoutBlock, wrapText } from '../src/layout'
import { block, monoFont } from './fixtures'

const width = (s: string) => s.length * 10

describe('wrapText', () => {
  it('fills lines greedily', () => {
    expect(wrapText('АА ББ ВВ ГГ', 50, width, false).lines).toEqual(['АА ББ', 'ВВ ГГ'])
  })

  it('keeps manual line breaks and empty lines', () => {
    expect(wrapText('А\n\nБ', 100, width, false).lines).toEqual(['А', '', 'Б'])
  })

  it('moves a word that fits on its own line instead of hyphenating it', () => {
    const result = wrapText('ТАК ПЕРЕКЛАДАЧ', 100, width, true)
    expect(result.lines).toEqual(['ТАК', 'ПЕРЕКЛАДАЧ'])
    expect(result.hyphens).toBe(0)
  })

  it('hyphenates a word wider than the line', () => {
    const result = wrapText('ПЕРЕКЛАДАЧ', 60, width, true)
    expect(result.lines.length).toBeGreaterThan(1)
    expect(result.lines[0].endsWith('-')).toBe(true)
    expect(result.lines.join('').replace(/-/g, '')).toBe('ПЕРЕКЛАДАЧ')
    expect(result.overflow).toBe(false)
  })

  it('reports overflow for an unbreakable word', () => {
    const result = wrapText('ПЕРЕКЛАДАЧ', 60, width, false)
    expect(result.lines).toEqual(['ПЕРЕКЛАДАЧ'])
    expect(result.overflow).toBe(true)
  })

  it('breaks after an existing hyphen without adding another one', () => {
    expect(wrapText('БУДЬ-ЯКИЙ', 60, width, false).lines).toEqual(['БУДЬ-', 'ЯКИЙ'])
  })
})

describe('layoutBlock', () => {
  it('centers lines horizontally and vertically', () => {
    const layout = layoutBlock(block({ text: 'ТАК', fontSize: 20, width: 200, height: 100 }), monoFont)
    const [line] = layout.lines
    expect(line.width).toBe(36)
    expect(line.x).toBe((200 - 36) / 2)
    // висота тексту = ascent + descent = 20; верх = (100 - 20) / 2
    expect(line.baseline).toBe(40 + 16)
    expect(layout.overflow).toBe(false)
  })

  it('aligns left and right with padding', () => {
    const left = layoutBlock(block({ text: 'ТАК', fontSize: 20, padding: 10, align: 'left' }), monoFont)
    const right = layoutBlock(block({ text: 'ТАК', fontSize: 20, padding: 10, align: 'right' }), monoFont)
    expect(left.lines[0].x).toBe(10)
    expect(right.lines[0].x).toBe(200 - 10 - 36)
  })

  it('uppercases text and applies line height', () => {
    const layout = layoutBlock(block({ text: 'а\nб', fontSize: 20, lineHeight: 1.5 }), monoFont)
    expect(layout.lines.map((l) => l.text)).toEqual(['А', 'Б'])
    expect(layout.lines[1].baseline - layout.lines[0].baseline).toBe(30)
  })

  it('accounts for letter spacing in line width', () => {
    const layout = layoutBlock(block({ text: 'ТАК', fontSize: 20, letterSpacing: 5 }), monoFont)
    expect(layout.lines[0].width).toBe(36 + 10)
  })

  it('flags overflow when text is taller than the box', () => {
    const layout = layoutBlock(block({ text: 'А\nБ\nВ\nГ', fontSize: 40, height: 100 }), monoFont)
    expect(layout.overflow).toBe(true)
  })
})

describe('fitFontSize', () => {
  it('returns the largest size that fits', () => {
    const b = block({ text: 'ПРИВІТ ЯК ТИ', width: 120, height: 80, hyphenate: false })
    const size = fitFontSize(b, monoFont)
    expect(layoutBlock(b, monoFont, size).overflow).toBe(false)
    expect(layoutBlock(b, monoFont, size + 1).overflow).toBe(true)
  })

  it('falls back to the minimum when nothing fits', () => {
    expect(fitFontSize(block({ text: 'ДУЖЕДОВГЕСЛОВО', width: 10, height: 10, hyphenate: false }), monoFont)).toBe(6)
  })
})

describe('fitFontSize and hyphenation', () => {
  it('does not hyphenate for a small gain in size', () => {
    // Низька рамка: кегль обмежує висота, перенос нічого не дає
    const b = block({ text: 'ТАК ЗІБРАВСЯ', width: 200, height: 60, hyphenate: true })
    const size = fitFontSize(b, monoFont)
    expect(size).toBe(fitFontSize({ ...b, hyphenate: false }, monoFont))
    expect(layoutBlock(b, monoFont, size).hyphens).toBe(0)
  })

  it('hyphenates when a long word would otherwise force a much smaller size', () => {
    const b = block({ text: 'НЕЙМОВІРНО ПЕРЕКЛАДАЧЕВІ', width: 100, height: 200, hyphenate: true })
    const plain = fitFontSize({ ...b, hyphenate: false }, monoFont)
    const size = fitFontSize(b, monoFont)
    expect(size).toBeGreaterThan(plain * 1.22)
    expect(layoutBlock(b, monoFont, size).hyphens).toBeGreaterThan(0)
    expect(layoutBlock(b, monoFont, size).overflow).toBe(false)
  })
})
