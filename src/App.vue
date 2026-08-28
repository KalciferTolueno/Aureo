<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ReloadPrompt from '@/shared/components/ReloadPrompt.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { syncService } from '@/data/sync/service'

const profile = useProfileStore()
const auth = useAuthStore()
const ui = useUiStore()

onMounted(async () => {
  await Promise.all([profile.load(), ui.load(), auth.initialize()])
  if (auth.authenticated) {
    const remote = await profile.syncFromRemote()
    if (!remote && profile.profile) await profile.syncToRemote()
    try { await syncService.syncAll() } catch { /* El modo local sigue disponible. */ }
  }
  window.addEventListener('online', syncWhenOnline)
})

async function syncWhenOnline() {
  if (!auth.authenticated) return
  try { await syncService.syncAll() } catch { /* Los cambios quedan pendientes para el próximo intento. */ }
}

onBeforeUnmount(() => window.removeEventListener('online', syncWhenOnline))
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
