import { beforeEach, vi } from 'vitest'

/* Minimal in-memory localStorage for the 'node' test environment — enough for
   the achievements store. Cleared before every test. */
class MemoryStorage {
  #data = new Map<string, string>()
  get length(): number {
    return this.#data.size
  }
  clear(): void {
    this.#data.clear()
  }
  getItem(key: string): string | null {
    return this.#data.has(key) ? (this.#data.get(key) as string) : null
  }
  key(index: number): string | null {
    return [...this.#data.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.#data.delete(key)
  }
  setItem(key: string, value: string): void {
    this.#data.set(key, String(value))
  }
}

vi.stubGlobal('localStorage', new MemoryStorage())

beforeEach(() => {
  localStorage.clear()
})
