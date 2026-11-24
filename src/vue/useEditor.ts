/**
 * Контролер редактора сторінки: стан, вибір, інструменти, історія змін і розкладка блоків.
 * Компоненти (полотно, панель властивостей) працюють лише через нього.
 */
import { computed, reactive, ref, shallowRef } from 'vue'
import type { EditorImages, EditorState, Patch, PatchSource, TextBlock } from '../types'
import type { MetaRegion } from '../metadata'
import { EditorHistory } from '../history'
import { createEmptyState, newBlock, normalizeState, reworkRegion, uid, type PixelData } from '../state'
import { fitFontSize, layoutBlock, type FontInfo, type TextLayout } from '../layout'

export type EditorTool = 'select' | 'text' | 'brush' | 'rect' | 'hand'
export type ViewMode = 'result' | 'auto' | 'cleaned' | 'original'

export interface BrushSettings {
  source: PatchSource
  color: string
  size: number
}

export const MIN_BLOCK_SIZE = 8

export function useEditor() {
  const state = ref<EditorState>(createEmptyState())
  const selectedBlockId = ref<string | null>(null)
  const selectedRegionId = ref<string | null>(null)
  const hoveredPatchId = ref<string | null>(null)
  const tool = ref<EditorTool>('select')
  const view = ref<ViewMode>('result')
  const brush = reactive<BrushSettings>({ source: 'cleaned', color: '#ffffff', size: 24 })
  const dirty = ref(false)
  /** Лічильник змін: перерахунок canUndo/canRedo та перемальовування */
  const revision = ref(0)

  const images = shallowRef<EditorImages | null>(null)
  const font = shallowRef<FontInfo | null>(null)
  const regions = shallowRef<MetaRegion[]>([])
  const pageSize = reactive({ width: 0, height: 0 })
  /** Пікселі очищеної сторінки (або картинки тайпсетера) — для кольору тексту нових блоків */
  let backgroundPixels: PixelData | null = null

  const history = new EditorHistory<EditorState>()

  const selectedBlock = computed(() => state.value.blocks.find((b) => b.id === selectedBlockId.value) ?? null)
  const selectedRegion = computed(() => regions.value.find((r) => r.id === selectedRegionId.value) ?? null)
  const canUndo = computed(() => (revision.value, history.canUndo))
  const canRedo = computed(() => (revision.value, history.canRedo))

  /** id текстових вузлів metadata, уже перероблених у блоки */
  const reworkedTextIds = computed(() => new Set(state.value.blocks.flatMap((b) => b.sourceIds)))

  // ---------- Розкладка (кеш за параметрами, що на неї впливають) ----------

  const layoutCache = new Map<string, TextLayout>()
  function layoutOf(block: TextBlock): TextLayout {
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
    ].join('|')
    let layout = layoutCache.get(key)
    if (!layout) {
      layout = layoutBlock(block, font.value!)
      if (layoutCache.size > 2000) layoutCache.clear()
      layoutCache.set(key, layout)
    }
    return layout
  }

  // ---------- Завантаження ----------

  function load(input: {
    state: unknown
    images: EditorImages
    font: FontInfo
    regions: MetaRegion[]
    width: number
    height: number
    background: PixelData | null
  }) {
    state.value = normalizeState(input.state)
    images.value = input.images
    font.value = input.font
    regions.value = input.regions
    pageSize.width = input.width
    pageSize.height = input.height
    backgroundPixels = input.background
    layoutCache.clear()
    history.clear()
    selectedBlockId.value = null
    selectedRegionId.value = null
    dirty.value = false
    revision.value++
  }

  // ---------- Зміни з історією ----------

  /** Будь-яка зміна стану: знімок для undo, позначка «є незбережені зміни» */
  function mutate(fn: (s: EditorState) => void, key?: string) {
    history.record(state.value, key)
    fn(state.value)
    dirty.value = true
    revision.value++
  }

  function updateBlock(id: string, patch: Partial<TextBlock>, key?: string) {
    mutate((s) => {
      const block = s.blocks.find((b) => b.id === id)
      if (block) Object.assign(block, patch)
    }, key)
  }

  function undo() {
    const previous = history.undo(state.value)
    if (!previous) return
    state.value = previous
    afterHistoryJump()
  }

  function redo() {
    const next = history.redo(state.value)
    if (!next) return
    state.value = next
    afterHistoryJump()
  }

  function afterHistoryJump() {
    if (selectedBlockId.value && !state.value.blocks.some((b) => b.id === selectedBlockId.value)) {
      selectedBlockId.value = null
    }
    dirty.value = true
    revision.value++
  }

  /** Кінець жесту (відпущена миша, втрачений фокус): наступна зміна — новий крок історії */
  function endGesture() {
    history.breakCoalescing()
  }

  // ---------- Вибір ----------

  function selectBlock(id: string | null) {
    selectedBlockId.value = id
    if (id) selectedRegionId.value = null
  }

  function selectRegion(id: string | null) {
    selectedRegionId.value = id
    if (id) selectedBlockId.value = null
  }

  // ---------- Операції ----------

  function patchSourceAvailable(source: PatchSource): boolean {
    return source === 'color' || source === 'auto' || Boolean(images.value?.[source])
  }

  function reworkRegionById(regionId: string): TextBlock | null {
    const region = regions.value.find((r) => r.id === regionId)
    if (!region || !font.value) return null
    const { patch, block } = reworkRegion(region, {
      font: font.value,
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      background: backgroundPixels,
      patchSource: patchSourceAvailable('cleaned') ? 'cleaned' : 'color'
    })
    mutate((s) => {
      s.patches.push(patch)
      s.blocks.push(block)
    })
    selectBlock(block.id)
    tool.value = 'select'
    return block
  }

  function addBlock(box: { x: number; y: number; width: number; height: number }): TextBlock {
    const block = newBlock(box, { text: '' })
    block.fontSize = Math.max(10, Math.round(pageSize.height * 0.02))
    block.padding = Math.round(block.fontSize * 0.15)
    mutate((s) => s.blocks.push(block))
    selectBlock(block.id)
    return block
  }

  function duplicateBlock(id: string) {
    const source = state.value.blocks.find((b) => b.id === id)
    if (!source) return
    // Копія не пов'язана з вузлами metadata: інакше одна репліка двічі записувала б переклад
    const copy: TextBlock = { ...structuredClone(source), id: uid('blk'), sourceIds: [], x: source.x + 20, y: source.y + 20 }
    mutate((s) => s.blocks.push(copy))
    selectBlock(copy.id)
  }

  function deleteBlock(id: string) {
    mutate((s) => {
      s.blocks = s.blocks.filter((b) => b.id !== id)
    })
    if (selectedBlockId.value === id) selectedBlockId.value = null
  }

  function fitBlock(id: string) {
    const block = state.value.blocks.find((b) => b.id === id)
    if (!block || !font.value) return
    updateBlock(id, { fontSize: fitFontSize(block, font.value) })
  }

  /** key — щоб мазок пензля (додавання + продовження) був одним кроком історії */
  function addPatch(patch: Omit<Patch, 'id'> & { id?: string }, key?: string): Patch {
    const full = { ...patch, id: patch.id ?? uid('pat') } as Patch
    mutate((s) => s.patches.push(full), key)
    return full
  }

  /** Мазок пензля росте під час руху миші — один крок історії на весь мазок */
  function extendStroke(id: string, x: number, y: number) {
    mutate((s) => {
      const patch = s.patches.find((p) => p.id === id)
      if (patch?.shape.type === 'stroke') patch.shape.points.push(x, y)
    }, `stroke:${id}`)
  }

  function deletePatch(id: string) {
    mutate((s) => {
      s.patches = s.patches.filter((p) => p.id !== id)
    })
    if (hoveredPatchId.value === id) hoveredPatchId.value = null
  }

  function markSaved() {
    dirty.value = false
    history.breakCoalescing()
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
  }
}

export type EditorController = ReturnType<typeof useEditor>
