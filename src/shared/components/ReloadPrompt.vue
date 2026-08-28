<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
const { needRefresh, updateServiceWorker } = useRegisterSW()
</script>

<template>
  <Transition name="slide-up"><aside v-if="needRefresh" class="update-toast" role="status" aria-live="polite"><p>Hay una nueva versión de Áureo.</p><button type="button" @click="updateServiceWorker(true)">Actualizar ahora</button></aside></Transition>
</template>
