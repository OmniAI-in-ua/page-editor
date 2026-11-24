/**
 * Українські переноси: Hypher + патерни hyphenation.uk (як у тайпсетера, спрощено).
 * Розрив допустимий, якщо з кожного боку щонайменше 2 літери й голосна; не відриваємо й/ь/апостроф.
 */
import Hypher from 'hypher'
import ukrainianPatterns from 'hyphenation.uk'

const HypherCtor: any = (Hypher as any)?.default ?? Hypher
const patterns: any = (ukrainianPatterns as any)?.default ?? ukrainianPatterns
const hypher = new HypherCtor(patterns)

const MIN_SIDE_LETTERS = 2
const VOWELS = /[аеєиіїоуюяё]/i
const LETTERS = /\p{L}/gu

const countLetters = (s: string) => (s.match(LETTERS) ?? []).length

/** Позиції в слові, перед якими можна поставити перенос (word.slice(0, pos) + '-') */
export function hyphenationPoints(word: string): number[] {
  const match = word.match(/^([^\p{L}'’]*)([\p{L}'’]+)([^\p{L}'’]*)$/u)
  if (!match || !/\p{Script=Cyrillic}/u.test(match[2]) || countLetters(match[2]) < 2 * MIN_SIDE_LETTERS + 1) {
    return []
  }
  const [, lead, core] = match
  const syllables: string[] = hypher.hyphenate(core.toLocaleLowerCase('uk-UA'))
  const points: number[] = []
  let pos = 0
  for (let i = 0; i < syllables.length - 1; i++) {
    pos += syllables[i].length
    const left = core.slice(0, pos)
    const right = core.slice(pos)
    if (countLetters(left) < MIN_SIDE_LETTERS || countLetters(right) < MIN_SIDE_LETTERS) continue
    if (!VOWELS.test(left) || !VOWELS.test(right)) continue
    if (/^[ьй'’]/i.test(right)) continue
    points.push(lead.length + pos)
  }
  return points
}
