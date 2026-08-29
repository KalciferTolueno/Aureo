<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ReloadPrompt from '@/shared/components/ReloadPrompt.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const profile = useProfileStore()
const auth = useAuthStore()
const ui = useUiStore()

onMounted(async () => {
  await Promise.all([profile.load(), ui.load(), auth.initialize()])
})
</script>

<template>
  <div class="shell">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <div id="main-content" class="route-content" tabindex="-1">
      <RouterView />
    </div>
    <ReloadPrompt />
  </div>
</template>
