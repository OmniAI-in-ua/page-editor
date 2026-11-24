/**
 * Стан ручного редактора сторінки (зберігається на бекенді в pages.editorState).
 * Редактор малює поверх картинки тайпсетера ("auto") латки та текстові блоки.
 * Усі координати — у пікселях картинки сторінки.
 */

export const EDITOR_STATE_VERSION = 1

/** Звідки латка бере пікселі: очищена сторінка, оригінал, картинка тайпсетера або суцільний колір */
export type PatchSource = 'cleaned' | 'original' | 'auto' | 'color'

export type PatchShape =
  /** Плоский список координат [x1, y1, x2, y2, ...] */
  | { type: 'polygon'; points: number[] }
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  /** Мазок пензля: плоский список точок і діаметр */
  | { type: 'stroke'; points: number[]; size: number }

export interface Patch {
  id: string
  source: PatchSource
  /** Лише для source = 'color' */
  color?: string
  shape: PatchShape
}

export type TextAlign = 'left' | 'center' | 'right'

export interface TextStroke {
  enabled: boolean
  color: string
  /** Товщина лінії обводки, px (як lineWidth у canvas: назовні виходить половина) */
  width: number
}

export interface TextBlock {
  id: string
  /** id текстових вузлів metadata, з яких створено блок (сюди записується змінений текст) */
  sourceIds: string[]
  /** Текст, як його ввів адмін; переноси рядків — '\n' */
  text: string
  /** Рамка без повороту: лівий верхній кут і розмір */
  x: number
  y: number
  width: number
  height: number
  /** Поворот навколо центру рамки, градуси */
  rotation: number
  fontSize: number
  /** Міжрядковий інтервал, множник кегля */
  lineHeight: number
  /** Міжлітерний інтервал, px */
  letterSpacing: number
  align: TextAlign
  /** Внутрішній відступ від рамки, px */
  padding: number
  /** Автоматичні переноси слів, що не вміщуються в рядок */
  hyphenate: boolean
  /** Друкувати великими літерами (як тайпсетер) */
  uppercase: boolean
  color: string
  stroke: TextStroke
  opacity: number
}

export interface EditorState {
  version: number
  blocks: TextBlock[]
  patches: Patch[]
}

export interface Point {
  x: number
  y: number
}

export interface Box {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Картинки, з якими працює редактор */
export interface EditorImages {
  auto: CanvasImageSource
  cleaned?: CanvasImageSource | null
  original?: CanvasImageSource | null
}
