import { Image } from '@napi-rs/canvas';
import { b as EditorState, F as FontInfo } from './layout-D-3YewUD.js';

/**
 * Сервер: та сама картинка, що й у браузері, але зібрана на бекенді з @napi-rs/canvas.
 * Читачам не можна довіряти готову PNG з браузера, тож бекенд приймає лише стан редактора
 * і зводить сторінку сам тим самим кодом малювання.
 */

/** Зареєструвати файл шрифту (TTF/OTF) під назвою редактора; повертає метрики */
declare function registerEditorFont(fontPath: string, fontFamily?: string): FontInfo;
/** Картинка з байтів (PNG/JPEG/WebP) або з адреси */
declare function loadEditorImage(source: Buffer | string): Promise<Image>;
interface NodeRenderInput {
    state: EditorState;
    /** auto — картинка тайпсетера (основа), решта — джерела латок */
    images: {
        auto: Image;
        cleaned?: Image | null;
        original?: Image | null;
    };
    font: FontInfo;
    fontFamily?: string;
}
/** Звести сторінку в PNG розміром картинки тайпсетера */
declare function renderPagePng({ state, images, font, fontFamily }: NodeRenderInput): Buffer;

export { type NodeRenderInput, loadEditorImage, registerEditorFont, renderPagePng };
