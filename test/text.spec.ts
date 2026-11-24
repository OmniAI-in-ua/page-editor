import { describe, expect, it } from 'vitest'
import { normalizeText } from '../src/text'
import { hyphenationPoints } from '../src/hyphenation'

describe('normalizeText', () => {
  it('uppercases, replaces ґ and keeps manual line breaks', () => {
    expect(normalizeText('ґанок\nі  ґудзик', true)).toBe('ГАНОК\nІ ГУДЗИК')
  })

  it('keeps case when uppercase is off', () => {
    expect(normalizeText('Привіт', false)).toBe('Привіт')
  })

  it('normalizes apostrophes, dashes and missing glyphs', () => {
    expect(normalizeText('м’ята – це ♪ 1–9', true)).toBe("М'ЯТА — ЦЕ ~ 1-9")
    expect(normalizeText('★ Увага ★', true)).toBe('УВАГА')
  })

  it('trims empty edge lines and spaces', () => {
    expect(normalizeText('\n  так  \n', true)).toBe('ТАК')
  })
})

describe('hyphenationPoints', () => {
  it('splits Ukrainian words by syllables with at least two letters on each side', () => {
    const word = 'ПЕРЕКЛАДАЧ'
    const parts = hyphenationPoints(word).map((p) => [word.slice(0, p), word.slice(p)])
    expect(parts).toContainEqual(['ПЕРЕ', 'КЛАДАЧ'])
    for (const [left, right] of parts) {
      expect(left.length).toBeGreaterThanOrEqual(2)
      expect(right.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('does not split short words, latin or before й/ь', () => {
    expect(hyphenationPoints('ТАК')).toEqual([])
    expect(hyphenationPoints('HELLOWORLD')).toEqual([])
    const word = 'НЕЙМОВІРНО'
    expect(hyphenationPoints(word).map((p) => word[p])).not.toContain('Й')
  })

  it('keeps punctuation outside of the split points', () => {
    const word = '«ПЕРЕКЛАДАЧ!»'
    for (const p of hyphenationPoints(word)) {
      expect(p).toBeGreaterThan(1)
      expect(p).toBeLessThan(word.length - 2)
    }
  })
})
