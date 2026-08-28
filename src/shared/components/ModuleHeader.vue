<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
const props = withDefaults(defineProps<{ symbol?: string; title: string; phrase?: string; back?: string }>(), { symbol: '', phrase: '' })
const router = useRouter()
const resolvedBack = computed(() => {
  if (window.location.port !== '4175') return props.back || '/'
  if (props.back === '/mundos') return { name: 'laboratorio-tailwind', query: { axis: 'mundos' } }
  if (props.back === '/') return { name: 'laboratorio-tailwind', query: { axis: 'umbral' } }
  return props.back || '/'
})
</script>

<template>
  <header class="module-header">
    <RouterLink v-if="back" class="back-button" :to="resolvedBack" aria-label="Volver"><AppIcon name="back" /></RouterLink>
    <button v-else class="back-button" type="button" aria-label="Volver" @click="router.back()"><AppIcon name="back" /></button>
    <AppIcon v-if="symbol" class="module-main-symbol respira" :name="symbol" />
    <h1>{{ title }}</h1>
    <p v-if="phrase">{{ phrase }}</p>
  </header>
</template>
