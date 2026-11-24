/**
 * Стан ручного редактора сторінки (зберігається на бекенді в pages.editorState).
 * Редактор малює поверх картинки тайпсетера ("auto") латки та текстові блоки.
 * Усі координати — у пікселях картинки сторінки.
 */
declare const EDITOR_STATE_VERSION = 1;
/** Звідки латка бере пікселі: очищена сторінка, оригінал, картинка тайпсетера або суцільний колір */
type PatchSource = 'cleaned' | 'original' | 'auto' | 'color';
type PatchShape = 
/** Плоский список координат [x1, y1, x2, y2, ...] */
{
    type: 'polygon';
    points: number[];
} | {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
}
/** Мазок пензля: плоский список точок і діаметр */
 | {
    type: 'stroke';
    points: number[];
    size: number;
};
interface Patch {
    id: string;
    source: PatchSource;
    /** Лише для source = 'color' */
    color?: string;
    shape: PatchShape;
}
type TextAlign = 'left' | 'center' | 'right';
interface TextStroke {
    enabled: boolean;
    color: string;
    /** Товщина лінії обводки, px (як lineWidth у canvas: назовні виходить половина) */
    width: number;
}
interface TextBlock {
    id: string;
    /** id текстових вузлів metadata, з яких створено блок (сюди записується змінений текст) */
    sourceIds: string[];
    /** Текст, як його ввів адмін; переноси рядків — '\n' */
    text: string;
    /** Рамка без повороту: лівий верхній кут і розмір */
    x: number;
    y: number;
    width: number;
    height: number;
    /** Поворот навколо центру рамки, градуси */
    rotation: number;
    fontSize: number;
    /** Міжрядковий інтервал, множник кегля */
    lineHeight: number;
    /** Міжлітерний інтервал, px */
    letterSpacing: number;
    align: TextAlign;
    /** Внутрішній відступ від рамки, px */
    padding: number;
    /** Автоматичні переноси слів, що не вміщуються в рядок */
    hyphenate: boolean;
    /** Друкувати великими літерами (як тайпсетер) */
    uppercase: boolean;
    color: string;
    stroke: TextStroke;
    opacity: number;
}
interface EditorState {
    version: number;
    blocks: TextBlock[];
    patches: Patch[];
}
interface Point {
    x: number;
    y: number;
}
interface Box {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
/** Картинки, з якими працює редактор */
interface EditorImages {
    auto: CanvasImageSource;
    cleaned?: CanvasImageSource | null;
    original?: CanvasImageSource | null;
}

/**
 * Розкладка тексту блоку: рядки з урахуванням ручних переносів ('\n'), автоперенесення слів за складами,
 * вирівнювання по горизонталі, центрування по вертикалі в рамці з відступом.
 * Вимірювання ширини винесено в FontInfo, тож модуль не залежить від canvas (і тестується без браузера).
 */

interface FontInfo {
    /** Ширина рядка, px: від першого до останнього знака (без хвостового міжлітерного інтервалу) */
    measure(text: string, fontSize: number, letterSpacing: number): number;
    /** Висота над базовою лінією (з діакритикою Й/Ї), частка кегля */
    ascent: number;
    /** Висота під базовою лінією (коми, хвостики Щ/Д), частка кегля */
    descent: number;
}
interface LayoutLine {
    text: string;
    width: number;
    /** Початок рядка та базова лінія — відносно лівого верхнього кута рамки (без повороту) */
    x: number;
    baseline: number;
}
interface TextLayout {
    lines: LayoutLine[];
    fontSize: number;
    lineHeightPx: number;
    /** Текст не вміщується в рамку (за шириною чи висотою) */
    overflow: boolean;
    hyphens: number;
}
declare const MIN_FONT_SIZE = 6;
declare const MAX_FONT_SIZE = 400;
interface WrapResult {
    lines: string[];
    hyphens: number;
    overflow: boolean;
}
declare function wrapText(text: string, maxWidth: number, width: (s: string) => number, hyphenate: boolean): WrapResult;
declare function layoutBlock(block: TextBlock, font: FontInfo, fontSize?: number): TextLayout;
/**
 * Перенос слова виправданий, лише якщо дає помітно більший кегль (у тайпсетері перенос «коштує» ≈ 22% кегля):
 * інакше короткі репліки рвалися б заради кількох пікселів
 */
declare const HYPHEN_SIZE_GAIN = 1.22;
/** Найбільший цілий кегль, з яким текст вміщується в рамку; якщо ніякий — мінімальний */
declare function fitFontSize(block: TextBlock, font: FontInfo, min?: number, max?: number): number;

export { type Box as B, type EditorImages as E, type FontInfo as F, HYPHEN_SIZE_GAIN as H, type LayoutLine as L, MAX_FONT_SIZE as M, type Patch as P, type TextBlock as T, type TextLayout as a, type EditorState as b, EDITOR_STATE_VERSION as c, MIN_FONT_SIZE as d, type PatchShape as e, type PatchSource as f, type Point as g, type TextAlign as h, type TextStroke as i, fitFontSize as j, layoutBlock as l, wrapText as w };
