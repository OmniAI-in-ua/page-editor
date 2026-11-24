import {
  EditorHistory,
  createEmptyState,
  newBlock,
  normalizeState,
  reworkRegion,
  uid
} from "./chunk-LQJMLAX5.js";
import {
  fitFontSize,
  layoutBlock
} from "./chunk-GJ5PGPXS.js";

// src/vue/useEditor.ts
import { computed, reactive, ref, shallowRef } from "vue";
var MIN_BLOCK_SIZE = 8;
function useEditor() {
  const state = ref(createEmptyState());
  const selectedBlockId = ref(null);
  const selectedRegionId = ref(null);
  const hoveredPatchId = ref(null);
  const tool = ref("select");
  const view = ref("result");
  const brush = reactive({ source: "cleaned", color: "#ffffff", size: 24 });
  const dirty = ref(false);
  const revision = ref(0);
  const images = shallowRef(null);
  const font = shallowRef(null);
  const regions = shallowRef([]);
  const pageSize = reactive({ width: 0, height: 0 });
  let backgroundPixels = null;
  const history = new EditorHistory();
  const selectedBlock = computed(() => state.value.blocks.find((b) => b.id === selectedBlockId.value) ?? null);
  const selectedRegion = computed(() => regions.value.find((r) => r.id === selectedRegionId.value) ?? null);
  const canUndo = computed(() => (revision.value, history.canUndo));
  const canRedo = computed(() => (revision.value, history.canRedo));
  const reworkedTextIds = computed(() => new Set(state.value.blocks.flatMap((b) => b.sourceIds)));
  const layoutCache = /* @__PURE__ */ new Map();
  function layoutOf(block) {
    const key = [
      block.text,
      block.fontSize,
      block.width,
      block.height,
      block.padding,
      block.lineHeight,
      block.letterSpacing,
      block.align,
      block.hyphenate,
      block.uppercase
    ].join("|");
    let layout = layoutCache.get(key);
    if (!layout) {
      layout = layoutBlock(block, font.value);
      if (layoutCache.size > 2e3) layoutCache.clear();
      layoutCache.set(key, layout);
    }
    return layout;
  }
  function load(input) {
    state.value = normalizeState(input.state);
    images.value = input.images;
    font.value = input.font;
    regions.value = input.regions;
    pageSize.width = input.width;
    pageSize.height = input.height;
    backgroundPixels = input.background;
    layoutCache.clear();
    history.clear();
    selectedBlockId.value = null;
    selectedRegionId.value = null;
    dirty.value = false;
    revision.value++;
  }
  function mutate(fn, key) {
    history.record(state.value, key);
    fn(state.value);
    dirty.value = true;
    revision.value++;
  }
  function updateBlock(id, patch, key) {
    mutate((s) => {
      const block = s.blocks.find((b) => b.id === id);
      if (block) Object.assign(block, patch);
    }, key);
  }
  function undo() {
    const previous = history.undo(state.value);
    if (!previous) return;
    state.value = previous;
    afterHistoryJump();
  }
  function redo() {
    const next = history.redo(state.value);
    if (!next) return;
    state.value = next;
    afterHistoryJump();
  }
  function afterHistoryJump() {
    if (selectedBlockId.value && !state.value.blocks.some((b) => b.id === selectedBlockId.value)) {
      selectedBlockId.value = null;
    }
    dirty.value = true;
    revision.value++;
  }
  function endGesture() {
    history.breakCoalescing();
  }
  function selectBlock(id) {
    selectedBlockId.value = id;
    if (id) selectedRegionId.value = null;
  }
  function selectRegion(id) {
    selectedRegionId.value = id;
    if (id) selectedBlockId.value = null;
  }
  function patchSourceAvailable(source) {
    return source === "color" || source === "auto" || Boolean(images.value?.[source]);
  }
  function reworkRegionById(regionId) {
    const region = regions.value.find((r) => r.id === regionId);
    if (!region || !font.value) return null;
    const { patch, block } = reworkRegion(region, {
      font: font.value,
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      background: backgroundPixels,
      patchSource: patchSourceAvailable("cleaned") ? "cleaned" : "color"
    });
    mutate((s) => {
      s.patches.push(patch);
      s.blocks.push(block);
    });
    selectBlock(block.id);
    tool.value = "select";
    return block;
  }
  function addBlock(box) {
    const block = newBlock(box, { text: "" });
    block.fontSize = Math.max(10, Math.round(pageSize.height * 0.02));
    block.padding = Math.round(block.fontSize * 0.15);
    mutate((s) => s.blocks.push(block));
    selectBlock(block.id);
    return block;
  }
  function duplicateBlock(id) {
    const source = state.value.blocks.find((b) => b.id === id);
    if (!source) return;
    const copy = { ...structuredClone(source), id: uid("blk"), sourceIds: [], x: source.x + 20, y: source.y + 20 };
    mutate((s) => s.blocks.push(copy));
    selectBlock(copy.id);
  }
  function deleteBlock(id) {
    mutate((s) => {
      s.blocks = s.blocks.filter((b) => b.id !== id);
    });
    if (selectedBlockId.value === id) selectedBlockId.value = null;
  }
  function fitBlock(id) {
    const block = state.value.blocks.find((b) => b.id === id);
    if (!block || !font.value) return;
    updateBlock(id, { fontSize: fitFontSize(block, font.value) });
  }
  function addPatch(patch, key) {
    const full = { ...patch, id: patch.id ?? uid("pat") };
    mutate((s) => s.patches.push(full), key);
    return full;
  }
  function extendStroke(id, x, y) {
    mutate((s) => {
      const patch = s.patches.find((p) => p.id === id);
      if (patch?.shape.type === "stroke") patch.shape.points.push(x, y);
    }, `stroke:${id}`);
  }
  function deletePatch(id) {
    mutate((s) => {
      s.patches = s.patches.filter((p) => p.id !== id);
    });
    if (hoveredPatchId.value === id) hoveredPatchId.value = null;
  }
  function markSaved() {
    dirty.value = false;
    history.breakCoalescing();
  }
  return {
    state,
    selectedBlockId,
    selectedRegionId,
    selectedBlock,
    selectedRegion,
    hoveredPatchId,
    tool,
    view,
    brush,
    dirty,
    revision,
    images,
    font,
    regions,
    pageSize,
    reworkedTextIds,
    canUndo,
    canRedo,
    layoutOf,
    load,
    mutate,
    updateBlock,
    undo,
    redo,
    endGesture,
    selectBlock,
    selectRegion,
    patchSourceAvailable,
    reworkRegionById,
    addBlock,
    duplicateBlock,
    deleteBlock,
    fitBlock,
    addPatch,
    extendStroke,
    deletePatch,
    markSaved
  };
}
export {
  MIN_BLOCK_SIZE,
  useEditor
};
