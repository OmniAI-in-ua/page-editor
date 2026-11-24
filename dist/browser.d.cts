import { F as FontInfo } from './layout-D-3YewUD.cjs';

declare function loadEditorFont(fontUrl: string, fontFamily?: string): Promise<FontInfo>;
declare function createCanvasFontInfo(fontFamily?: string): FontInfo;

export { createCanvasFontInfo, loadEditorFont };
