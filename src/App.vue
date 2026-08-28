<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import BottomNav from '@/shared/components/BottomNav.vue'
import ReloadPrompt from '@/shared/components/ReloadPrompt.vue'
import QuickCapture from '@/shared/components/QuickCapture.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { syncService } from '@/data/sync/service'

const route = useRoute()
const router = useRouter()
const profile = useProfileStore()
const auth = useAuthStore()
const ui = useUiStore()
const showNavigation = computed(() => !route.meta.full)
const showQuickCapture = computed(() => showNavigation.value && route.name !== 'nucleo')
const transitionName = ref('app-forward')

function routeRank(path: string) {
  const meta = router.resolve(path).meta
  return Number(meta.order ?? 0) * 10 + Number(meta.depth ?? 0)
}

watch(() => route.fullPath, (currentPath, previousPath) => {
  transitionName.value = routeRank(currentPath) < routeRank(previousPath) ? 'app-back' : 'app-forward'
})

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
  <div class="shell" :class="{ 'with-nav': showNavigation }">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <div id="main-content" class="route-content" tabindex="-1">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <Transition :name="transitionName">
          <KeepAlive :max="16">
            <component :is="Component" :key="viewRoute.name ?? viewRoute.path" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </div>
    <QuickCapture v-if="showQuickCapture" />
    <BottomNav v-if="showNavigation" />
    <ReloadPrompt v-if="route.name !== 'laboratorio-tailwind'" />
  </div>
</template>
