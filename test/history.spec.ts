import { describe, expect, it } from 'vitest'
import { COALESCE_MS, EditorHistory } from '../src/history'

describe('EditorHistory', () => {
  it('undo and redo snapshots', () => {
    const h = new EditorHistory<{ v: number }>()
    h.record({ v: 1 })
    h.record({ v: 2 })
    expect(h.undo({ v: 3 })).toEqual({ v: 2 })
    expect(h.undo({ v: 2 })).toEqual({ v: 1 })
    expect(h.undo({ v: 1 })).toBeNull()
    expect(h.redo({ v: 1 })).toEqual({ v: 2 })
    expect(h.redo({ v: 2 })).toEqual({ v: 3 })
    expect(h.canRedo).toBe(false)
  })

  it('coalesces changes with the same key within the window', () => {
    let now = 0
    const h = new EditorHistory<number>(() => now)
    expect(h.record(1, 'text')).toBe(true)
    now += 100
    expect(h.record(2, 'text')).toBe(false)
    now += COALESCE_MS + 1
    expect(h.record(3, 'text')).toBe(true)
    expect(h.record(4, 'other')).toBe(true)
    h.breakCoalescing()
    expect(h.record(5, 'other')).toBe(true)
  })

  it('a new change clears redo', () => {
    const h = new EditorHistory<number>()
    h.record(1)
    h.undo(2)
    h.record(1)
    expect(h.canRedo).toBe(false)
  })

  it('snapshots are independent copies', () => {
    const h = new EditorHistory<{ a: number[] }>()
    const value = { a: [1] }
    h.record(value)
    value.a.push(2)
    expect(h.undo(value)).toEqual({ a: [1] })
  })
})
