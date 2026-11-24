import * as vue from 'vue';
import { f as PatchSource, h as TextAlign, b as EditorState, E as EditorImages, F as FontInfo, T as TextBlock, a as TextLayout, P as Patch } from './layout-D-3YewUD.cjs';
import { M as MetaRegion, P as PixelData } from './state-CHi9Tab3.cjs';

type EditorTool = 'select' | 'text' | 'brush' | 'rect' | 'hand';
type ViewMode = 'result' | 'auto' | 'cleaned' | 'original';
interface BrushSettings {
    source: PatchSource;
    color: string;
    size: number;
}
declare const MIN_BLOCK_SIZE = 8;
declare function useEditor(): {
    state: vue.Ref<{
        version: number;
        blocks: {
            id: string;
            sourceIds: string[];
            text: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            fontSize: number;
            lineHeight: number;
            letterSpacing: number;
            align: TextAlign;
            padding: number;
            hyphenate: boolean;
            uppercase: boolean;
            color: string;
            stroke: {
                enabled: boolean;
                color: string;
                width: number;
            };
            opacity: number;
        }[];
        patches: {
            id: string;
            source: PatchSource;
            color?: string | undefined;
            shape: {
                type: "polygon";
                points: number[];
            } | {
                type: "rect";
                x: number;
                y: number;
                width: number;
                height: number;
            } | {
                type: "stroke";
                points: number[];
                size: number;
            };
        }[];
    }, EditorState | {
        version: number;
        blocks: {
            id: string;
            sourceIds: string[];
            text: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            fontSize: number;
            lineHeight: number;
            letterSpacing: number;
            align: TextAlign;
            padding: number;
            hyphenate: boolean;
            uppercase: boolean;
            color: string;
            stroke: {
                enabled: boolean;
                color: string;
                width: number;
            };
            opacity: number;
        }[];
        patches: {
            id: string;
            source: PatchSource;
            color?: string | undefined;
            shape: {
                type: "polygon";
                points: number[];
            } | {
                type: "rect";
                x: number;
                y: number;
                width: number;
                height: number;
            } | {
                type: "stroke";
                points: number[];
                size: number;
            };
        }[];
    }>;
    selectedBlockId: vue.Ref<string | null, string | null>;
    selectedRegionId: vue.Ref<string | null, string | null>;
    selectedBlock: vue.ComputedRef<{
        id: string;
        sourceIds: string[];
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        fontSize: number;
        lineHeight: number;
        letterSpacing: number;
        align: TextAlign;
        padding: number;
        hyphenate: boolean;
        uppercase: boolean;
        color: string;
        stroke: {
            enabled: boolean;
            color: string;
            width: number;
        };
        opacity: number;
    } | null>;
    selectedRegion: vue.ComputedRef<MetaRegion | null>;
    hoveredPatchId: vue.Ref<string | null, string | null>;
    tool: vue.Ref<EditorTool, EditorTool>;
    view: vue.Ref<ViewMode, ViewMode>;
    brush: {
        source: PatchSource;
        color: string;
        size: number;
    };
    dirty: vue.Ref<boolean, boolean>;
    revision: vue.Ref<number, number>;
    images: vue.ShallowRef<EditorImages | null, EditorImages | null>;
    font: vue.ShallowRef<FontInfo | null, FontInfo | null>;
    regions: vue.ShallowRef<MetaRegion[], MetaRegion[]>;
    pageSize: {
        width: number;
        height: number;
    };
    reworkedTextIds: vue.ComputedRef<Set<string>>;
    canUndo: vue.ComputedRef<boolean>;
    canRedo: vue.ComputedRef<boolean>;
    layoutOf: (block: TextBlock) => TextLayout;
    load: (input: {
        state: unknown;
        images: EditorImages;
        font: FontInfo;
        regions: MetaRegion[];
        width: number;
        height: number;
        background: PixelData | null;
    }) => void;
    mutate: (fn: (s: EditorState) => void, key?: string) => void;
    updateBlock: (id: string, patch: Partial<TextBlock>, key?: string) => void;
    undo: () => void;
    redo: () => void;
    endGesture: () => void;
    selectBlock: (id: string | null) => void;
    selectRegion: (id: string | null) => void;
    patchSourceAvailable: (source: PatchSource) => boolean;
    reworkRegionById: (regionId: string) => TextBlock | null;
    addBlock: (box: {
        x: number;
        y: number;
        width: number;
        height: number;
    }) => TextBlock;
    duplicateBlock: (id: string) => void;
    deleteBlock: (id: string) => void;
    fitBlock: (id: string) => void;
    addPatch: (patch: Omit<Patch, "id"> & {
        id?: string;
    }, key?: string) => Patch;
    extendStroke: (id: string, x: number, y: number) => void;
    deletePatch: (id: string) => void;
    markSaved: () => void;
};
type EditorController = ReturnType<typeof useEditor>;

export { type BrushSettings, type EditorController, type EditorTool, MIN_BLOCK_SIZE, type ViewMode, useEditor };
