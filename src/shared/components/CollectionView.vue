<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ModuleHeader from './ModuleHeader.vue'
import AppDialog from './AppDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import AppIcon from './AppIcon.vue'
import { useCollection } from '@/composables/useCollection'
import type { EntityBase } from '@/domain/types'

export interface CollectionField { key: string; label: string; type?: 'text' | 'textarea' | 'date' | 'number' | 'select'; required?: boolean; options?: { value: string; label: string }[]; placeholder?: string; min?: number; max?: number }
const props = defineProps<{ storageKey: string; title: string; intro: string; icon: string; fields: CollectionField[]; primary: string; secondary?: string; empty: string }>()
type Entry = EntityBase & Record<string, string | number | boolean | undefined>
const collection = useCollection<Entry>(props.storageKey)
const dialog = ref(false)
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const saving = ref(false)
const returnFocus = ref<HTMLElement | null>(null)
const form = reactive<Record<string, string | number>>({})
const dialogTitle = computed(() => editingId.value ? `Editar registro de ${props.title}` : `Nuevo registro en ${props.title}`)
function reset() { for (const field of props.fields) form[field.key] = ''; editingId.value = null }
function create(event: Event) { returnFocus.value = event.currentTarget as HTMLElement; reset(); dialog.value = true }
function edit(item: Entry, event: Event) { returnFocus.value = event.currentTarget as HTMLElement; reset(); editingId.value = item.id; for (const field of props.fields) form[field.key] = item[field.key] as string | number ?? ''; dialog.value = true }
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const value = Object.fromEntries(props.fields.map((field) => [field.key, form[field.key]]))
    editingId.value ? await collection.update(editingId.value, value) : await collection.add({ ...value, fecha_creacion: new Date().toISOString() } as Omit<Entry, 'id'>)
    dialog.value = false
  } finally { saving.value = false }
}
async function remove() { if (deletingId.value) await collection.remove(deletingId.value); deletingId.value = null }
</script>

<template>
  <main class="app-shell collection-view">
    <ModuleHeader :title="title" back="/mundos" />
    <section class="module-intro"><AppIcon class="large-symbol" :name="icon" /><p>{{ intro }}</p><button class="primary-action" type="button" @click="create"><AppIcon name="plus" /> Agregar</button></section>
    <p v-if="collection.loaded.value && !collection.items.value.length" class="empty-state">{{ empty }}</p>
    <section v-else class="record-list" :aria-label="title">
      <article v-for="item in collection.items.value" :key="item.id" class="record-card">
        <div><h2>{{ item[primary] }}</h2><p v-if="secondary && item[secondary]">{{ item[secondary] }}</p></div>
        <div class="record-actions"><button class="icon-button" type="button" aria-label="Editar" @click="edit(item, $event)"><AppIcon name="edit" /></button><button class="icon-button danger" type="button" aria-label="Eliminar" @click="deletingId = item.id"><AppIcon name="close" /></button></div>
      </article>
    </section>
    <AppDialog :open="dialog" :title="dialogTitle" :return-focus="returnFocus" @close="dialog = false">
      <form class="dialog-form" @submit.prevent="save">
        <label v-for="field in fields" :key="field.key" class="field"><span>{{ field.label }}</span>
          <textarea v-if="field.type === 'textarea'" v-model="form[field.key]" :name="field.key" autocomplete="off" :required="field.required" :placeholder="field.placeholder" rows="4" />
          <select v-else-if="field.type === 'select'" v-model="form[field.key]" :name="field.key" autocomplete="off" :required="field.required"><option value="">Seleccionar</option><option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option></select>
          <input v-else v-model="form[field.key]" :name="field.key" autocomplete="off" :type="field.type ?? 'text'" :required="field.required" :placeholder="field.placeholder" :min="field.min" :max="field.max" />
        </label>
        <button class="primary-action" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
      </form>
    </AppDialog>
    <ConfirmDialog :open="Boolean(deletingId)" title="Eliminar registro" message="Esta acción elimina el registro de este dispositivo." confirm-label="Eliminar" @cancel="deletingId = null" @confirm="remove" />
  </main>
</template>
