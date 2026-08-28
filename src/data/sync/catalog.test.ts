import { describe, expect, it } from 'vitest'
import { isRemoteCollection, remoteAxisFor, remoteCollections } from './catalog'

describe('catálogo de sincronización', () => {
  it('excluye todas las colecciones de Núcleo', () => {
    expect(remoteAxisFor('nucleo_pensamientos')).toBeNull()
    expect(isRemoteCollection('nucleo_pensamientos')).toBe(false)
    expect(remoteCollections()).not.toContain('nucleo_pensamientos')
    expect(remoteCollections().some((collection) => collection.startsWith('nucleo'))).toBe(false)
  })

  it('sincroniza el mazo diario de Umbral', () => {
    expect(remoteAxisFor('umbral_arcanos')).toBe('umbral')
  })
})
