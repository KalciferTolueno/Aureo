import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { profileRepository } from '@/data/repositories'
import { pullProfile, pushProfile } from '@/data/supabase/profile'
import type { OptionalSection, Profile } from '@/domain/types'

export function defaultProfile(): Profile {
  return {
    email: '', nombre: '', fecha_nacimiento: '', hora_nacimiento: null, lugar_nacimiento: null,
    signo: 'aries', numero_personal: 0, palabraPoder: '', clave_app_hash: '',
    secciones_activas: [], capaPremiumActiva: false, onboarding_completo: false,
    notificaciones: false,
  }
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null)
  const loaded = ref(false)
  const onboardingComplete = computed(() => profile.value?.onboarding_completo ?? false)
  const name = computed(() => profile.value?.nombre ?? '')
  const activeSections = computed(() => new Set(profile.value?.secciones_activas ?? []))

  async function load() { profile.value = await profileRepository.load(); loaded.value = true }
  async function save(next: Profile) {
    await profileRepository.save(next)
    profile.value = next
  }
  async function update(patch: Partial<Profile>) { await save({ ...(profile.value ?? defaultProfile()), ...patch }) }
  async function setSection(section: OptionalSection, active: boolean) {
    const sections = new Set(profile.value?.secciones_activas ?? [])
    active ? sections.add(section) : sections.delete(section)
    await update({ secciones_activas: [...sections] })
  }
  async function syncFromRemote() {
    const remote = await pullProfile()
    if (remote) profile.value = remote
    return remote
  }
  async function syncToRemote() {
    return profile.value ? pushProfile(profile.value) : false
  }
  return { profile, loaded, onboardingComplete, name, activeSections, load, save, update, setSection, syncFromRemote, syncToRemote }
})
