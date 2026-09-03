<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { openingPhrases, signLabels, signSymbols } from '@/domain/zodiac'
import { storage } from '@/data/storage'
import { localDateKey } from '@/domain/umbral'
import { useProfileStore } from '@/stores/profile'
import { playTone, unlockTone } from '@/composables/useTone'

const emit = defineEmits<{ done: [] }>()
const profile = useProfileStore()
const visible = ref(false)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const sign = computed(() => profile.profile?.signo?.toLowerCase() ?? 'aries')
const phrase = computed(() => openingPhrases[sign.value] ?? openingPhrases.aries)
const label = computed(() => signLabels[sign.value] ?? 'Aries')
const symbol = computed(() => signSymbols[sign.value] ?? '♈')

async function finish() {
  visible.value = false
  await storage.set('umbral_momento_apertura', localDateKey())
  emit('done')
}

onMounted(async () => {
  const seen = await storage.get<string>('umbral_momento_apertura')
  if (seen === localDateKey()) {
    emit('done')
    return
  }
  visible.value = true
  unlockTone()
  playTone('La', 1.1)
  window.setTimeout(finish, reduced ? 400 : 3000)
})
</script>

<template>
  <div v-if="visible" class="opening" role="dialog" aria-label="Momento de apertura" @click="finish">
    <span>{{ symbol }}</span>
    <strong>{{ label }}</strong>
    <p>{{ phrase }}</p>
  </div>
</template>

<style scoped>
.opening { position: fixed; z-index: 80; inset: 0; display: grid; place-items: center; align-content: center; gap: 1rem; background: #080b11; color: #f4efe5; text-align: center; cursor: pointer; animation: open-in 1s ease both; }
.opening span { color: #c9a86a; font-size: var(--texto-hero); line-height: 1; animation: open-scale .8s cubic-bezier(.16,1,.3,1) both; }
.opening strong { font: 200 var(--texto-7)/1 Fraunces, 'Aureo Serif', Georgia, serif; }
.opening p { margin: 0; max-width: 18rem; color: #c9a86a; font: italic 300 var(--texto-5)/1.5 Spectral, 'Aureo Serif', Georgia, serif; }
@keyframes open-in { from { opacity: 0; } }
@keyframes open-scale { from { transform: scale(.8); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .opening, .opening span { animation: none; }
}
</style>
