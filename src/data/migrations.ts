import { storage } from './storage'
import type { EntityBase } from '@/domain/types'
import { remoteCollections } from './sync/catalog'
import { getDeviceId } from './sync/device'

export const CURRENT_SCHEMA_VERSION = 4

export async function runMigrations() {
  const current = (await storage.get<number>('schema_version')) ?? 1
  if (current < 2) {
    // Version 2 intentionally keeps every legacy key and only records the schema.
    // Future migrations can transform one collection at a time behind repositories.
    await storage.set('schema_version', 2)
  }
  if (current < 3) {
    const deviceId = await getDeviceId()
    for (const collection of remoteCollections()) {
      const items = await storage.get<EntityBase[]>(collection)
      if (!items?.length) continue
      const migrated = items.map((item) => {
        if (item.sync_id && item.mutation_id && item.updated_at) return item
        const updatedAt = item.updated_at ?? item.fecha_creacion ?? new Date().toISOString()
        return {
          ...item,
          sync_id: item.sync_id ?? crypto.randomUUID(),
          device_id: item.device_id ?? deviceId,
          mutation_id: item.mutation_id ?? crypto.randomUUID(),
          updated_at: updatedAt,
        }
      })
      await storage.set(collection, migrated)
    }
    await storage.set('schema_version', 3)
  }
  if (current < 4) {
    const hobbies = await storage.get<Array<EntityBase & { momentos?: unknown }>>('hobbies')
    if (hobbies?.length) {
      await storage.set('hobbies', hobbies.map((item) => ({
        ...item,
        momentos: Array.isArray(item.momentos) ? item.momentos : [],
      })))
    }
    await storage.set('schema_version', 4)
  }
}
