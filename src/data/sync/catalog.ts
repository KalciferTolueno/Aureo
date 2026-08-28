import type { RemoteAxis } from '@/data/supabase/types'

const REMOTE_COLLECTIONS: Readonly<Record<string, RemoteAxis>> = {
  intenciones: 'umbral',
  pulso: 'umbral',
  ideas: 'umbral',
  cultivo: 'umbral',
  umbral_arcanos: 'umbral',
  vinculos: 'mundos',
  companeros: 'mundos',
  decretos: 'mundos',
  plantas: 'mundos',
  hobbies: 'mundos',
  travesias: 'mundos',
  balance_movimientos: 'balance',
  balance_categorias: 'balance',
  balance_darumas: 'balance',
  edad_dorada_declaraciones: 'edad_dorada',
}

export function remoteAxisFor(collection: string) {
  return REMOTE_COLLECTIONS[collection] ?? null
}

export function isRemoteCollection(collection: string) {
  return remoteAxisFor(collection) !== null
}

export function remoteCollections() {
  return Object.keys(REMOTE_COLLECTIONS)
}
