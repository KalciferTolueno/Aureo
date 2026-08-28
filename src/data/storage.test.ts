import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageDriver } from './storage'
import { CollectionRepository } from './repositories'

describe('almacenamiento compatible', () => {
  beforeEach(() => localStorage.clear())

  it('mantiene el prefijo histórico aureo_', async () => {
    const driver = new LocalStorageDriver()
    await driver.set('hobbies', [{ id: '1', nombre: 'Pintar' }])
    expect(localStorage.getItem('aureo_hobbies')).toContain('Pintar')
  })

  it('crea, edita y elimina sin afectar otros registros', async () => {
    const repository = new CollectionRepository<{ id: string; texto: string }>(new LocalStorageDriver(), 'intenciones')
    await repository.add({ id: 'a', texto: 'Respirar' })
    await repository.add({ id: 'b', texto: 'Caminar' })
    await repository.update('a', { texto: 'Descansar' })
    await repository.remove('b')
    expect(await repository.all()).toHaveLength(1)
    expect((await repository.all())[0]).toMatchObject({ id: 'a', texto: 'Descansar' })
    expect(await repository.rawItems()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'b', deleted_at: expect.any(String) }),
    ]))
  })

  it('mantiene Núcleo exclusivamente local y sin metadatos de sincronización', async () => {
    const repository = new CollectionRepository<{ id: string; texto: string }>(new LocalStorageDriver(), 'nucleo_pensamientos')
    await repository.add({ id: 'privado', texto: 'Esto nunca sale del dispositivo' })

    expect(await repository.rawItems()).toEqual([
      { id: 'privado', texto: 'Esto nunca sale del dispositivo' },
    ])

    await repository.remove('privado')
    expect(await repository.rawItems()).toEqual([])
  })
})
