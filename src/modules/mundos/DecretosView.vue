<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import ModuleHeader from '@/shared/components/ModuleHeader.vue'
import { useCollection } from '@/composables/useCollection'
import type { Decree } from '@/domain/types'

const decrees = useCollection<Decree>('decretos')
const adding = ref(false); const ritual = ref<Decree | null>(null); const taps = ref(0)
const form = reactive<{ texto: string; categoria: Decree['categoria'] }>({ texto: '', categoria: 'ser' })
const placeholder = computed(() => ({ ser: 'Soy…', vivir: 'Disfruto de…', tener: 'Tengo…' }[form.categoria]))
const inspirations: Record<Decree['categoria'], string> = { ser: 'Soy exactamente lo que necesito ser en este momento.', vivir: 'Vivo cerca de lo que me hace sentir real.', tener: 'Tengo todo lo que construí con mis propias manos.' }
async function add() { if (!form.texto.trim()) return; await decrees.add({ texto: form.texto.trim(), categoria: form.categoria, activaciones: 0, cumplido: false, fecha_cumplimiento: null, fecha_creacion: new Date().toISOString() }); form.texto = ''; form.categoria = 'ser'; adding.value = false }
function openRitual(item: Decree) { ritual.value = item; taps.value = 0 }
async function tapRitual() { if (!ritual.value || taps.value >= 3) return; taps.value += 1; if (taps.value === 3) { await decrees.update(ritual.value.id, { activaciones: (ritual.value.activaciones ?? 0) + 1 }); window.setTimeout(() => { ritual.value = null; taps.value = 0 }, 1800) } }
</script>
<template>
  <main class="app-shell decrees-view"><ModuleHeader title="Decretos" back="/mundos" />
    <section class="decree-intro"><p>Palabras que eliges para ser, vivir y tener.</p><button class="primary-action" type="button" @click="adding = true">Lo decreto</button></section>
    <p v-if="decrees.loaded.value && !decrees.items.value.length" class="empty-state">Escribe tu primer decreto cuando estés lista.</p>
    <section v-else class="decree-list" aria-label="Decretos"><button v-for="item in decrees.items.value" :key="item.id" class="decree-row" :style="{ '--decree-intensity': Math.min(1, .5 + (item.activaciones ?? 0) * .08) }" @click="openRitual(item)"><span>{{ item.texto }}</span><small>{{ item.categoria }}</small></button></section>
    <section class="decree-inspiration" aria-label="Inspiración"><em v-for="(text, category) in inspirations" :key="category">{{ text }}</em></section>
    <AppDialog :open="adding" title="Un nuevo decreto" @close="adding = false"><form class="dialog-form" @submit.prevent="add"><label class="field"><span>Dimensión</span><select v-model="form.categoria"><option value="ser">Ser</option><option value="vivir">Vivir</option><option value="tener">Tener</option></select></label><label class="field"><span>Tu decreto</span><textarea v-model="form.texto" :placeholder="placeholder" required rows="4" /></label><button class="primary-action" type="submit">Lo decreto</button></form></AppDialog>
    <section v-if="ritual" class="decree-ritual" role="dialog" aria-modal="true" aria-label="Ritual de decreto" tabindex="0" @click="tapRitual" @keydown.enter.space.prevent="tapRitual"><p>{{ ritual.texto }}</p><div class="ritual-points" aria-label="Tres pulsaciones para decretar"><span v-for="point in 3" :key="point" :class="{ lit: point <= taps }" /></div><strong v-if="taps === 3">Decretado.</strong><small v-else>Haz tres pulsaciones para afirmarlo.</small></section>
  </main>
</template>
