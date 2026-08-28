import type { BackupFile, EntityBase, Profile } from '@/domain/types'
import { decryptPrivate, encryptPrivate } from './crypto'
import { storage, type StorageDriver } from './storage'
import { isRemoteCollection } from './sync/catalog'
import { getDeviceId } from './sync/device'

const PRIVATE_PROFILE_FIELDS = ['fecha_nacimiento', 'hora_nacimiento', 'lugar_nacimiento'] as const
const CONFIG_KEY = 'configuracion'
const BACKUP_VERSION = 2
const PROTECTED_KEYS = new Set(['device_secret', CONFIG_KEY])

export class CollectionRepository<T extends EntityBase> {
  constructor(private readonly driver: StorageDriver, readonly key: string, private readonly syncable = isRemoteCollection(key)) {}
  async rawItems() { return (await this.driver.get<T[]>(this.key)) ?? [] }
  async all() { return (await this.rawItems()).filter((item) => !item.deleted_at) }
  async replace(items: T[]) { await this.driver.set(this.key, items); return items }
  private async withMutation(item: T, deletedAt?: string) {
    if (!this.syncable) return item
    const now = new Date().toISOString()
    return {
      ...item,
      sync_id: item.sync_id ?? crypto.randomUUID(),
      device_id: await getDeviceId(),
      mutation_id: crypto.randomUUID(),
      updated_at: now,
      ...(deletedAt ? { deleted_at: deletedAt } : {}),
    } as T
  }
  async add(item: T) {
    const items = await this.rawItems()
    items.push(await this.withMutation(item))
    await this.replace(items)
    return this.all()
  }
  async update(id: string, patch: Partial<T>) {
    const items = await this.rawItems()
    const index = items.findIndex((item) => item.id === id)
    if (index >= 0) items[index] = await this.withMutation({ ...items[index], ...patch } as T)
    await this.replace(items)
    return this.all()
  }
  async remove(id: string) {
    const items = await this.rawItems()
    if (!this.syncable) {
      await this.replace(items.filter((item) => item.id !== id))
      return this.all()
    }
    const index = items.findIndex((item) => item.id === id)
    if (index >= 0) items[index] = await this.withMutation(items[index]!, new Date().toISOString())
    await this.replace(items)
    return this.all()
  }
}

export class ProfileRepository {
  constructor(private readonly driver: StorageDriver) {}
  async load() {
    const encrypted = await this.driver.get<Profile>(CONFIG_KEY)
    if (!encrypted) return null
    const profile = { ...encrypted } as Profile
    for (const field of PRIVATE_PROFILE_FIELDS) {
      const value = encrypted[field]
      if (typeof value === 'string' && value.length > 0) {
        try { (profile[field] as string | null) = await decryptPrivate(value) } catch { (profile[field] as string | null) = null }
      }
    }
    return profile
  }
  async save(profile: Profile) {
    const encrypted = { ...profile } as Profile
    for (const field of PRIVATE_PROFILE_FIELDS) {
      const value = profile[field]
      ;(encrypted[field] as string | null) = typeof value === 'string' && value ? await encryptPrivate(value) : value
    }
    await this.driver.set(CONFIG_KEY, encrypted)
  }
}

export const profileRepository = new ProfileRepository(storage)

export async function exportBackup() {
  const raw: Record<string, unknown> = {}
  for (const key of await storage.keys()) if (!PROTECTED_KEYS.has(key)) raw[key] = await storage.get(key)
  const backup: BackupFile = { version: BACKUP_VERSION, exportadoEn: new Date().toISOString(), configuracion: await profileRepository.load(), raw }
  return JSON.stringify(backup, null, 2)
}

export async function importBackup(value: string) {
  const backup = JSON.parse(value) as Partial<BackupFile>
  if (!backup.raw || typeof backup.raw !== 'object') throw new Error('El archivo no contiene una copia válida de Áureo.')
  if (backup.configuracion) await profileRepository.save(backup.configuracion)
  for (const [key, item] of Object.entries(backup.raw)) if (!PROTECTED_KEYS.has(key)) await storage.set(key, item)
}

export async function clearAureoData() {
  for (const key of await storage.keys()) if (key !== 'device_secret') await storage.remove(key)
}

export function makeId() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}` }
