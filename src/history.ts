/**
 * Історія змін для undo/redo: знімки стану (JSON). Послідовні зміни з тим самим ключем
 * (набір тексту, перетягування повзунка, одне перетягування блоку) об'єднуються в один крок.
 */

export const HISTORY_LIMIT = 200
/** Зміни з тим самим ключем у межах цього часу — один крок історії, мс */
export const COALESCE_MS = 1200

export class EditorHistory<T> {
  private past: string[] = []
  private future: string[] = []
  private lastKey: string | null = null
  private lastAt = 0

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Запам'ятати стан перед зміною. Повертає false, якщо зміну об'єднано з попередньою */
  record(before: T, key?: string): boolean {
    const at = this.now()
    const coalesce = key !== undefined && key === this.lastKey && at - this.lastAt < COALESCE_MS
    this.lastKey = key ?? null
    this.lastAt = at
    if (coalesce) return false
    this.past.push(JSON.stringify(before))
    if (this.past.length > HISTORY_LIMIT) this.past.shift()
    this.future = []
    return true
  }

  /** Завершити об'єднання: наступна зміна з тим самим ключем стане новим кроком */
  breakCoalescing(): void {
    this.lastKey = null
  }

  undo(current: T): T | null {
    const previous = this.past.pop()
    if (previous === undefined) return null
    this.future.push(JSON.stringify(current))
    this.lastKey = null
    return JSON.parse(previous)
  }

  redo(current: T): T | null {
    const next = this.future.pop()
    if (next === undefined) return null
    this.past.push(JSON.stringify(current))
    this.lastKey = null
    return JSON.parse(next)
  }

  clear(): void {
    this.past = []
    this.future = []
    this.lastKey = null
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }
}
