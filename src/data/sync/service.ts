import type { EntityBase } from '@/domain/types'
import { storage } from '@/data/storage'
import { remoteAxisFor, remoteCollections } from './catalog'
import { supabase } from '@/data/supabase/client'
import type { RemoteRecord, RemoteRecordChange } from '@/data/supabase/types'

const SYNC_FIELDS = new Set(['sync_id', 'device_id', 'mutation_id', 'synced_mutation_id', 'updated_at', 'deleted_at'])

function payloadFor(item: EntityBase) {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !SYNC_FIELDS.has(key)))
}

function fromRemote(record: RemoteRecord): EntityBase {
  return {
    ...record.payload,
    sync_id: record.id,
    device_id: record.device_id,
    mutation_id: record.mutation_id,
    synced_mutation_id: record.mutation_id,
    updated_at: record.client_updated_at,
    deleted_at: record.deleted_at ?? undefined,
  } as EntityBase
}

export class SyncService {
  async syncCollection(collection: string) {
    const axis = remoteAxisFor(collection)
    if (!axis || !supabase) return { pushed: 0, pulled: 0 }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { pushed: 0, pulled: 0 }

    const local = (await storage.get<EntityBase[]>(collection)) ?? []
    const pending = local.filter((item) => item.sync_id && item.mutation_id !== item.synced_mutation_id)
    const changes: RemoteRecordChange[] = pending.map((item) => ({
      id: item.sync_id!,
      axis,
      collection,
      payload: payloadFor(item),
      device_id: item.device_id!,
      mutation_id: item.mutation_id!,
      client_updated_at: item.updated_at!,
      ...(item.fecha_creacion ? { created_at: item.fecha_creacion } : {}),
      deleted_at: item.deleted_at ?? null,
    }))

    if (changes.length) {
      const { error } = await supabase.rpc('sync_aureo_records', { changes })
      if (error) throw error
    }

    const { data, error } = await supabase
      .from('aureo_records')
      .select('*')
      .eq('axis', axis)
      .eq('collection', collection)
    if (error) throw error

    const bySyncId = new Map(local.filter((item) => item.sync_id).map((item) => [item.sync_id!, item]))
    for (const record of (data ?? []) as RemoteRecord[]) {
      const current = bySyncId.get(record.id)
      const remoteWins = !current
        || current.mutation_id === current.synced_mutation_id
        || new Date(record.client_updated_at).getTime() >= new Date(current.updated_at ?? 0).getTime()
      if (remoteWins) bySyncId.set(record.id, fromRemote(record))
    }

    const withoutSyncId = local.filter((item) => !item.sync_id)
    await storage.set(collection, [...withoutSyncId, ...bySyncId.values()])
    return { pushed: changes.length, pulled: data?.length ?? 0 }
  }

  async syncAll() {
    const results = await Promise.all(remoteCollections().map((collection) => this.syncCollection(collection)))
    return results.reduce((total, result) => ({
      pushed: total.pushed + result.pushed,
      pulled: total.pulled + result.pulled,
    }), { pushed: 0, pulled: 0 })
  }
}

export const syncService = new SyncService()
