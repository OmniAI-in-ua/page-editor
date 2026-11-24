import { B as Box, g as Point, T as TextBlock, F as FontInfo, f as PatchSource, b as EditorState, P as Patch } from './layout-D-3YewUD.cjs';

/**
 * Розбір дерева metadata сторінки (клінер → перекладач): page.items → frame.children → bubble.texts → text.
 * Редактору потрібні контури бульбашок і вільного тексту та переклад їхніх текстових вузлів.
 */

interface MetaText {
    id: string;
    /** Поточний переклад (translation.ukr) */
    ukr: string;
    /** Автоматичний переклад: до ручних правок (translation.ukrAuto) або поточний, якщо правок не було */
    auto: string;
    readingIndex: number;
    box: Box | null;
    polygon: Point[] | null;
}
interface MetaRegion {
    /** id бульбашки або вільного тексту */
    id: string;
    kind: 'bubble' | 'free';
    box: Box;
    /** Контур: полігон детектора або прямокутник рамки */
    polygon: Point[];
    texts: MetaText[];
}
/**
 * Бульбашки й вільні тексти сторінки. Координати масштабуються до розміру картинки редактора,
 * якщо metadata описує картинку іншого розміру (imageWidth/imageHeight).
 */
declare function parseRegions(metadata: any, imageWidth: number, imageHeight: number): MetaRegion[];
/** Переклад області: тексти в порядку читання, порожні пропускаються */
declare function regionText(region: MetaRegion, which?: 'ukr' | 'auto'): string;
declare function joinTexts(texts: MetaText[], which?: 'ukr' | 'auto'): string;
declare function pointInPolygon(p: Point, polygon: Point[]): boolean;

/**
 * Операції зі станом редактора: нормалізація збереженого стану, нові блоки й латки,
 * переробка бульбашки чи вільного тексту з metadata, стиль за фоном, оновлення перекладу для бекенду.
 */

declare const DEFAULT_BLOCK: Omit<TextBlock, 'id' | 'x' | 'y' | 'width' | 'height'>;
declare function uid(prefix: string): string;
declare function createEmptyState(): EditorState;
/** Стан із бекенду → повний стан (значення за замовчуванням для відсутніх полів, сміття відкидається) */
declare function normalizeState(raw: unknown): EditorState;
declare function newBlock(box: {
    x: number;
    y: number;
    width: number;
    height: number;
}, overrides?: Partial<TextBlock>): TextBlock;
interface BackgroundStats {
    /** Середня яскравість 0..255 */
    mean: number;
    /** Частка темних пікселів (< 100) */
    darkShare: number;
}
interface PixelData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}
declare function sampleBackground(pixels: PixelData, box: Box, step?: number): BackgroundStats;
/** Колір тексту й обводка за фоном — та сама логіка, що в тайпсетері */
declare function chooseTextStyle(stats: BackgroundStats, kind: 'bubble' | 'free', fontSize: number): Pick<TextBlock, 'color' | 'stroke'>;
interface ReworkOptions {
    font: FontInfo;
    pageWidth: number;
    pageHeight: number;
    /** Пікселі очищеної сторінки (для кольору тексту); немає — чорний текст без обводки */
    background?: PixelData | null;
    /** Джерело латки: очищена сторінка, а якщо її немає — білий колір */
    patchSource: PatchSource;
}
/** Латка, що стирає текст тайпсетера в області, і новий блок із перекладом області */
declare function reworkRegion(region: MetaRegion, options: ReworkOptions): {
    patch: Patch;
    block: TextBlock;
};
interface TextUpdate {
    textId: string;
    ukr: string;
}
/** Текст блоку для metadata: ручні переноси рядків → пробіли */
declare function plainText(text: string): string;
/**
 * Змінені переклади для бекенду. Текст блоку записується в перший вузол-джерело, решта вузлів блоку
 * отримують порожній переклад (весь текст репліки — в одному вузлі). Блок без змін не чіпає metadata.
 * Текст, повернутий до автоматичного перекладу, повертає кожному вузлу його автоматичний переклад.
 */
declare function textUpdatesFor(state: EditorState, regions: MetaRegion[]): TextUpdate[];

export { type BackgroundStats as B, DEFAULT_BLOCK as D, type MetaRegion as M, type PixelData as P, type ReworkOptions as R, type TextUpdate as T, type MetaText as a, createEmptyState as b, chooseTextStyle as c, normalizeState as d, plainText as e, pointInPolygon as f, reworkRegion as g, joinTexts as j, newBlock as n, parseRegions as p, regionText as r, sampleBackground as s, textUpdatesFor as t, uid as u };
