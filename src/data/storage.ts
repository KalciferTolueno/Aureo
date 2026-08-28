export interface StorageDriver {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  keys(): Promise<string[]>
  raw(key: string): string | null
}

export class LocalStorageDriver implements StorageDriver {
  private readonly memory = new Map<string, string>()
  private readonly available: boolean

  constructor(private readonly prefix = 'aureo_') {
    this.available = LocalStorageDriver.testAvailability()
  }

  private static testAvailability() {
    try {
      const key = '__aureo_test__'
      localStorage.setItem(key, '1')
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  raw(key: string) {
    return this.available ? localStorage.getItem(this.prefix + key) : (this.memory.get(key) ?? null)
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = this.raw(key)
    if (raw === null) return null
    try { return JSON.parse(raw) as T } catch { return null }
  }

  async set<T>(key: string, value: T) {
    const serialized = JSON.stringify(value)
    if (this.available) {
      try { localStorage.setItem(this.prefix + key, serialized); return } catch { /* memory fallback */ }
    }
    this.memory.set(key, serialized)
  }

  async remove(key: string) {
    if (this.available) localStorage.removeItem(this.prefix + key)
    this.memory.delete(key)
  }

  async keys() {
    if (!this.available) return [...this.memory.keys()]
    const result: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(this.prefix)) result.push(key.slice(this.prefix.length))
    }
    return result
  }
}

export const storage = new LocalStorageDriver()
