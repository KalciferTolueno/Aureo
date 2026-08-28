import { onMounted, ref } from 'vue'
import { CollectionRepository, makeId } from '@/data/repositories'
import { storage } from '@/data/storage'
import type { EntityBase } from '@/domain/types'

export function useCollection<T extends EntityBase>(key: string) {
  const repository = new CollectionRepository<T>(storage, key)
  const items = ref<T[]>([])
  const loaded = ref(false)
  async function load() { items.value = await repository.all(); loaded.value = true }
  async function add(value: Omit<T, 'id'>) { items.value = await repository.add({ ...value, id: makeId() } as T) }
  async function update(id: string, patch: Partial<T>) { items.value = await repository.update(id, patch) }
  async function remove(id: string) { items.value = await repository.remove(id) }
  onMounted(load)
  return { items, loaded, load, add, update, remove }
}
