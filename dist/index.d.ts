import { T as TextBlock, a as TextLayout, P as Patch, E as EditorImages, b as EditorState, F as FontInfo } from './layout-D-3YewUD.js';
export { B as Box, c as EDITOR_STATE_VERSION, H as HYPHEN_SIZE_GAIN, L as LayoutLine, M as MAX_FONT_SIZE, d as MIN_FONT_SIZE, e as PatchShape, f as PatchSource, g as Point, h as TextAlign, i as TextStroke, j as fitFontSize, l as layoutBlock, w as wrapText } from './layout-D-3YewUD.js';
export { B as BackgroundStats, D as DEFAULT_BLOCK, M as MetaRegion, a as MetaText, P as PixelData, R as ReworkOptions, T as TextUpdate, c as chooseTextStyle, b as createEmptyState, j as joinTexts, n as newBlock, d as normalizeState, p as parseRegions, e as plainText, f as pointInPolygon, r as regionText, g as reworkRegion, s as sampleBackground, t as textUpdatesFor, u as uid } from './state-BUhmp2Gl.js';

/**
 * Нормалізація тексту під шрифт Anime Ace — ті самі заміни, що й у тайпсетера (font-manager.ts):
 * ґ→г (гліфа немає), апострофи, тире, відсутні знаки, великі літери.
 * На відміну від тайпсетера, ручні переноси рядків ('\n') зберігаються.
 */
declare function normalizeText(text: string, uppercase: boolean): string;

/** Позиції в слові, перед якими можна поставити перенос (word.slice(0, pos) + '-') */
declare function hyphenationPoints(word: string): number[];

/**
 * Малювання сторінки редактора: картинка тайпсетера → латки → текстові блоки.
 * Той самий код малює і попередній перегляд, і фінальну картинку, що йде на бекенд.
 */

declare const EDITOR_FONT_FAMILY = "Anime Ace Editor";
type Ctx = CanvasRenderingContext2D;
declare function drawPatch(ctx: Ctx, patch: Patch, images: EditorImages): void;
declare function drawTextBlock(ctx: Ctx, block: TextBlock, layout: TextLayout, fontFamily?: string): void;
interface RenderOptions {
    /** Розкладка блоку (кешується викликачем) */
    layoutOf: (block: TextBlock) => TextLayout;
    fontFamily?: string;
    /** Не малювати латки й текст — лише картинку тайпсетера */
    baseOnly?: boolean;
}
declare function renderPage(ctx: Ctx, state: EditorState, images: EditorImages, options: RenderOptions): void;

/**
 * Історія змін для undo/redo: знімки стану (JSON). Послідовні зміни з тим самим ключем
 * (набір тексту, перетягування повзунка, одне перетягування блоку) об'єднуються в один крок.
 */
declare const HISTORY_LIMIT = 200;
/** Зміни з тим самим ключем у межах цього часу — один крок історії, мс */
declare const COALESCE_MS = 1200;
declare class EditorHistory<T> {
    private readonly now;
    private past;
    private future;
    private lastKey;
    private lastAt;
    constructor(now?: () => number);
    /** Запам'ятати стан перед зміною. Повертає false, якщо зміну об'єднано з попередньою */
    record(before: T, key?: string): boolean;
    /** Завершити об'єднання: наступна зміна з тим самим ключем стане новим кроком */
    breakCoalescing(): void;
    undo(current: T): T | null;
    redo(current: T): T | null;
    clear(): void;
    get canUndo(): boolean;
    get canRedo(): boolean;
}

/**
 * Метрики шрифту редактора через будь-який 2D-контекст canvas: у браузері — звичайний canvas,
 * на сервері — @napi-rs/canvas. Сам файл шрифту пакет не містить: його підключає застосунок.
 */

/** Те, що потрібно від контексту для вимірювання: спільне для браузера й @napi-rs/canvas */
interface MeasureContext {
    font: string;
    measureText(text: string): {
        width: number;
        actualBoundingBoxAscent: number;
        actualBoundingBoxDescent: number;
    };
}
declare function createFontInfo(ctx: MeasureContext, fontFamily?: string): FontInfo;

export { COALESCE_MS, EDITOR_FONT_FAMILY, EditorHistory, EditorImages, EditorState, FontInfo, HISTORY_LIMIT, type MeasureContext, Patch, type RenderOptions, TextBlock, TextLayout, createFontInfo, drawPatch, drawTextBlock, hyphenationPoints, normalizeText, renderPage };
