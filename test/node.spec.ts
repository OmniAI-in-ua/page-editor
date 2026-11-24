import { existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import { loadEditorImage, registerEditorFont, renderPagePng } from '../src/node'
import { createEmptyState, newBlock } from '../src/state'

/**
 * Серверне зведення сторінки. Шрифту Anime Ace у пакеті немає, тож тест бере будь-який
 * наявний TTF: EDITOR_TEST_FONT або системний (Windows / Linux CI).
 */
const FONT_CANDIDATES = [
  process.env.EDITOR_TEST_FONT,
  'C:/Windows/Fonts/arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].filter((path): path is string => !!path && existsSync(path))

const solid = (width: number, height: number, color: string) => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return loadEditorImage(canvas.toBuffer('image/png'))
}

const pixel = async (png: Buffer, x: number, y: number) => {
  const image = await loadEditorImage(png)
  const ctx = createCanvas(image.width, image.height).getContext('2d')
  ctx.drawImage(image, 0, 0)
  return [...ctx.getImageData(x, y, 1, 1).data]
}

describe.skipIf(!FONT_CANDIDATES.length)('renderPagePng', () => {
  it('зводить сторінку: основа, латка з очищеної картинки, текст', async () => {
    const font = registerEditorFont(FONT_CANDIDATES[0]!, 'Editor Test Font')
    const [auto, cleaned] = await Promise.all([solid(300, 200, '#ffffff'), solid(300, 200, '#ff0000')])

    const state = createEmptyState()
    state.patches.push({ id: 'p1', source: 'cleaned', shape: { type: 'rect', x: 10, y: 10, width: 60, height: 60 } })
    state.blocks.push(
      newBlock({ x: 120, y: 40, width: 160, height: 120 }, { text: 'ПЕРЕКЛАД', color: '#000000', fontSize: 40, padding: 0 }),
    )

    const png = renderPagePng({ state, images: { auto, cleaned }, font, fontFamily: 'Editor Test Font' })
    const image = await loadEditorImage(png)
    expect([image.width, image.height]).toEqual([300, 200])

    // Латка взяла пікселі з очищеної картинки, поза нею — основа
    expect(await pixel(png, 40, 40)).toEqual([255, 0, 0, 255])
    expect(await pixel(png, 5, 190)).toEqual([255, 255, 255, 255])

    // Текст намальовано: у блоці є темні пікселі
    const ctx = createCanvas(300, 200).getContext('2d')
    ctx.drawImage(image, 0, 0)
    const data = ctx.getImageData(120, 40, 160, 120).data
    let dark = 0
    for (let i = 0; i < data.length; i += 4) if (data[i]! < 100 && data[i + 1]! < 100 && data[i + 2]! < 100) dark++
    expect(dark).toBeGreaterThan(200)
  })
})
