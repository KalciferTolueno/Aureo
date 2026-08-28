<script setup lang="ts">
import { computed } from 'vue'
import { useProfileStore } from '@/stores/profile'
import AppIcon from '@/shared/components/AppIcon.vue'

const profile=useProfileStore()
const worldsBack=window.location.port==='4175'?{name:'laboratorio-tailwind',query:{axis:'mundos'}}:'/mundos'
const spaces=computed(()=>[
  {title:'Compañeros',text:'Animales que acompañan tu recorrido.',icon:'companions',path:'/mundos/companeros',show:profile.activeSections.has('companeros')},
  {title:'Mis Plantas',text:'El cuidado cotidiano de tu naturaleza cercana.',icon:'plants',path:'/mundos/plantas',show:profile.activeSections.has('plantas')},
].filter(item=>item.show))
</script>

<template><main class="app-shell"><header class="inner-header"><RouterLink class="icon-button" :to="worldsBack" aria-label="Volver a Mis Mundos"><AppIcon name="back" /></RouterLink><div><p class="module-kicker">Mis Mundos</p><h1>Lo que cuido</h1><p class="lead">Vínculos vivos que reciben tu atención y tu presencia.</p></div></header><section v-if="spaces.length" class="world-grid"><RouterLink v-for="space in spaces" :key="space.path" class="world-card" :to="space.path"><AppIcon :name="space.icon"/><h2>{{ space.title }}</h2><p>{{ space.text }}</p></RouterLink></section><section v-else class="empty-state"><h2>Este espacio espera tu elección</h2><p>Puedes activar Compañeros o Plantas desde Configuración.</p><RouterLink class="secondary-action" to="/ajustes">Abrir configuración</RouterLink></section></main></template>
