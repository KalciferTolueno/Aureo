import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '@/data/storage'
import type { ThemePreference } from '@/domain/types'

export const useUiStore = defineStore('ui', () => {
  const preference = ref<ThemePreference>('auto')
  const media = window.matchMedia('(prefers-color-scheme: light)')
  const systemLight = ref(media.matches)
  const resolved = computed(() => preference.value === 'auto' ? (systemLight.value ? 'light' : 'dark') : preference.value)
  function apply() {
    document.documentElement.dataset.modo = resolved.value
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', resolved.value === 'light' ? '#f5f0e8' : '#080b11')
  }
  function onSystemTheme(event: MediaQueryListEvent) { systemLight.value = event.matches; if (preference.value === 'auto') apply() }
  async function load() { preference.value = (await storage.get<ThemePreference>('ui_modo')) ?? 'auto'; media.removeEventListener('change', onSystemTheme); media.addEventListener('change', onSystemTheme); apply() }
  async function setTheme(value: ThemePreference) { preference.value = value; await storage.set('ui_modo', value); apply() }
  return { preference, resolved, load, setTheme }
})
