import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'laboratorio-tailwind',
      component: () => import('@/modules/experimental/TailwindPreviewView.vue'),
      meta: { full: true, order: 0, depth: 0 },
    },
    {
      path: '/configuracion',
      name: 'configuracion-aureo',
      component: () => import('@/modules/experimental/TailwindPreviewView.vue'),
      meta: { full: true, order: 0, depth: 0 },
    },
    { path: '/laboratorio-tailwind', redirect: '/' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const { useProfileStore } = await import('@/stores/profile')
  const profile = useProfileStore()
  if (!profile.loaded) await profile.load()
})

export default router
