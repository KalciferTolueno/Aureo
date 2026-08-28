import { createRouter, createWebHashHistory } from 'vue-router'

const scrollPositions = new Map<string, { left: number; top: number }>()

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/modules/onboarding/OnboardingView.vue'),
      meta: { full: true, order: -1, depth: 0 },
    },
    {
      path: '/',
      name: 'umbral',
      component: () => import('@/modules/umbral/UmbralView.vue'),
      meta: { order: 0, depth: 0 },
    },
    { path: '/mundos', name: 'mundos', component: () => import('@/modules/mundos/MundosView.vue'), meta: { order: 1, depth: 0 } },
    { path: '/mundos/cuidado', name: 'cuidado', component: () => import('@/modules/mundos/CuidadoView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/mundos/constelacion', name: 'constelacion', component: () => import('@/modules/mundos/ConstelacionView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/mundos/companeros', name: 'companeros', component: () => import('@/modules/mundos/CompanerosView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/mundos/decretos', name: 'decretos', component: () => import('@/modules/mundos/DecretosView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/mundos/plantas', name: 'plantas', component: () => import('@/modules/mundos/PlantasView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/mundos/hobbies', name: 'hobbies', component: () => import('@/modules/mundos/HobbiesView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/mundos/travesias', name: 'travesias', component: () => import('@/modules/mundos/TravesiasView.vue'), meta: { order: 1, depth: 1 } },
    { path: '/balance', name: 'balance', component: () => import('@/modules/placeholder/FinanzasView.vue'), meta: { order: 2, depth: 0 } },
    { path: '/finanzas', redirect: '/balance', meta: { order: 2, depth: 0 } },
    { path: '/nucleo', name: 'nucleo', component: () => import('@/modules/placeholder/NucleoView.vue'), meta: { order: 3, depth: 0 } },
    { path: '/edad-dorada', name: 'edad-dorada', component: () => import('@/modules/placeholder/ConocimientoView.vue'), meta: { order: 4, depth: 0 } },
    { path: '/conocimiento', redirect: '/edad-dorada', meta: { order: 4, depth: 0 } },
    { path: '/ajustes', name: 'ajustes', component: () => import('@/modules/settings/SettingsView.vue'), meta: { order: 5, depth: 0 } },
    {
      path: '/laboratorio-tailwind',
      name: 'laboratorio-tailwind',
      component: () => import('@/modules/experimental/TailwindPreviewView.vue'),
      meta: { full: true, order: 6, depth: 0 },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (from.name) scrollPositions.set(from.fullPath, { left: window.scrollX, top: window.scrollY })
    return savedPosition ?? scrollPositions.get(to.fullPath) ?? { left: 0, top: 0 }
  },
})

router.beforeEach(async (to) => {
  const { useProfileStore } = await import('@/stores/profile')
  const profile = useProfileStore()
  if (!profile.loaded) await profile.load()
  const tailwindOrigin = window.location.port === '4175'
  if (to.name === 'laboratorio-tailwind' || (tailwindOrigin && to.name !== 'onboarding')) return
  if (to.name !== 'onboarding' && !profile.onboardingComplete) return { name: 'onboarding' }
  if (to.name === 'onboarding' && profile.onboardingComplete) return { name: 'umbral' }
})

export default router
