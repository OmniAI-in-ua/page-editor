import type { FontInfo } from '../src/layout'
import type { TextBlock } from '../src/types'
import { newBlock } from '../src/state'

/** Моноширинний «шрифт»: кожен знак — 0.6 кегля, міжлітерний інтервал між знаками */
export const monoFont: FontInfo = {
  measure: (text, fontSize, letterSpacing) =>
    text.length === 0 ? 0 : text.length * fontSize * 0.6 + letterSpacing * (text.length - 1),
  ascent: 0.8,
  descent: 0.2
}

export function block(overrides: Partial<TextBlock> = {}): TextBlock {
  return newBlock({ x: 0, y: 0, width: 200, height: 100 }, { padding: 0, ...overrides })
}

export const sampleMetadata = {
  imageWidth: 800,
  imageHeight: 1200,
  items: [
    {
      id: 'f1',
      type: 'frame',
      children: [
        {
          id: 'b1',
          type: 'bubble',
          box: { x1: 100, y1: 100, x2: 300, y2: 260, width: 200, height: 160 },
          polygon: [
            { x: 100, y: 100 },
            { x: 300, y: 100 },
            { x: 300, y: 260 },
            { x: 100, y: 260 }
          ],
          texts: [
            { id: 't2', type: 'text', readingIndex: 1, translation: { ukr: 'як ти?' } },
            { id: 't1', type: 'text', readingIndex: 0, translation: { ukr: 'Привіт!' } }
          ]
        },
        {
          id: 't3',
          type: 'text',
          box: { x1: 500, y1: 600, x2: 540, y2: 760 },
          translation: { ukr: 'Бах' }
        }
      ]
    },
    { id: 't4', type: 'text', box: [10, 10, 60, 40], translation: { ukr: 'Дзинь' } }
  ]
}
