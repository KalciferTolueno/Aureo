<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import ModuleHeader from '@/shared/components/ModuleHeader.vue'
import { useCollection } from '@/composables/useCollection'
import type { Hobby } from '@/domain/types'

const hobbies = useCollection<Hobby>('hobbies')
const adding = ref(false)
const selectedId = ref<string | null>(null)
const returnFocus = ref<HTMLElement | null>(null)
const form = reactive({ nombre: '', sensacion: '' })
const selected = computed(() => hobbies.items.value.find((item) => item.id === selectedId.value) ?? null)
const sleepingGarden = computed(() => hobbies.items.value.length > 0 && hobbies.items.value.every((item) => !item.ultima_vez || Date.now() - new Date(item.ultima_vez).getTime() > 30 * 86400000))
function sizeFor(hobby: Hobby) { return `${Math.min(96, 48 + Math.max(0, hobby.sesiones ?? 0) * 8)}px` }
function openAdd(event: Event) { returnFocus.value = event.currentTarget as HTMLElement; adding.value = true }
async function add() { if (!form.nombre.trim() || !form.sensacion.trim()) return; await hobbies.add({ nombre: form.nombre.trim(), sensacion: form.sensacion.trim(), estado: 'activo', sesiones: 0, flow_ultimo: 1, fecha_creacion: new Date().toISOString() }); selectedId.value = hobbies.items.value.at(-1)?.id ?? null; form.nombre = ''; form.sensacion = ''; adding.value = false }
async function liveToday() { if (selected.value) await hobbies.update(selected.value.id, { estado: 'activo', sesiones: (selected.value.sesiones ?? 0) + 1, ultima_vez: new Date().toISOString() }) }
async function togglePause() { if (selected.value) await hobbies.update(selected.value.id, { estado: selected.value.estado === 'pausa' ? 'activo' : 'pausa' }) }
</script>
<template>
  <main class="app-shell hobbies-view"><ModuleHeader title="Hobbies" back="/mundos" />
    <section class="hobby-intro"><p>Un jardín para las cosas que te devuelven a ti.</p><button class="primary-action" type="button" @click="openAdd">Agregar</button></section>
    <p v-if="hobbies.loaded.value && !hobbies.items.value.length" class="empty-state">Agrega algo que disfrutes hacer por el simple gusto de hacerlo.</p>
    <section v-else class="hobby-garden" aria-label="Jardín de sensaciones"><button v-for="hobby in hobbies.items.value" :key="hobby.id" class="hobby-orb" :class="{ paused: hobby.estado === 'pausa', selected: hobby.id === selectedId }" :style="{ '--orb-size': sizeFor(hobby) }" :aria-pressed="hobby.id === selectedId" @click="selectedId = hobby.id"><span>{{ hobby.sensacion }}</span></button></section>
    <p v-if="sleepingGarden" class="garden-whisper">El jardín recuerda todo lo que sembraste.</p>
    <section v-if="selected" class="hobby-detail"><h2>{{ selected.nombre }}</h2><p>{{ selected.sensacion }}</p><div><button v-if="selected.estado === 'pausa'" class="primary-action" type="button" @click="togglePause">Quiero retomarlo</button><button v-else class="primary-action" type="button" @click="liveToday">Lo viví hoy</button><button class="text-action" type="button" @click="togglePause">{{ selected.estado === 'pausa' ? 'Volver a activarlo' : 'Poner en pausa' }}</button></div></section>
    <AppDialog :open="adding" title="Un nuevo hobby" :return-focus="returnFocus" @close="adding = false"><form class="dialog-form" @submit.prevent="add"><label class="field"><span>¿Qué es?</span><input v-model="form.nombre" required autofocus /></label><label class="field"><span>¿Cómo te hace sentir?</span><textarea v-model="form.sensacion" required rows="3" /></label><button class="primary-action" type="submit">Agregar</button></form></AppDialog>
  </main>
</template>
