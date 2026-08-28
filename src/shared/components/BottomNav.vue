<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useProfileStore } from '@/stores/profile'

const route = useRoute()
const profile = useProfileStore()
const tailwindOrigin = window.location.port === '4175'
const initial = computed(() => profile.name.trim().charAt(0).toLocaleUpperCase('es') || 'Á')
const sections = [
  { id: 'umbral', label: 'Umbral', icon: 'sun', path: '/' },
  { id: 'mundos', label: 'Mundos', icon: 'worlds', path: '/mundos' },
  { id: 'balance', label: 'Mi Balance', icon: 'balance', path: '/balance' },
  { id: 'nucleo', label: 'Núcleo', icon: 'moon', path: '/nucleo' },
  { id: 'edad-dorada', label: 'Edad Dorada', icon: 'star', path: '/edad-dorada' },
]
function active(path: string) { return path === '/' ? route.path === '/' : route.path.startsWith(path) }
function destination(section: typeof sections[number]) {
  return tailwindOrigin ? { name: 'laboratorio-tailwind', query: { axis: section.id } } : section.path
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Ejes de Áureo">
    <RouterLink class="nav-brand" :to="destination(sections[0]!)" aria-label="Ir al Umbral">
      <span class="nav-brand-mark" aria-hidden="true"><span /></span>
      <span><strong>Áureo</strong><small>Tu universo personal</small></span>
    </RouterLink>
    <div class="nav-sections">
      <RouterLink v-for="section in sections" :key="section.id" :to="destination(section)" :class="{ active: active(section.path) }" :aria-current="active(section.path) ? 'page' : undefined">
        <AppIcon :name="section.icon" /><span>{{ section.label }}</span>
      </RouterLink>
    </div>
    <div class="nav-account">
      <RouterLink to="/ajustes" :class="{ active: active('/ajustes') }" :aria-current="active('/ajustes') ? 'page' : undefined">
        <AppIcon name="settings" /><span>Configuración</span>
      </RouterLink>
      <div class="nav-person">
        <span class="nav-avatar" aria-hidden="true">{{ initial }}</span>
        <span><strong>{{ profile.name || 'Mi espacio' }}</strong><small>Mi cuenta de Áureo</small></span>
      </div>
    </div>
  </nav>
</template>
