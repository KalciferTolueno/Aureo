import type { Profile } from '@/domain/types'
import { profileRepository } from '@/data/repositories'
import { supabase } from './client'
import type { RemoteProfile } from './types'

function toRemote(profile: Profile, userId: string): RemoteProfile {
  return {
    user_id: userId,
    display_name: profile.nombre,
    birth_date: profile.fecha_nacimiento || null,
    birth_time: profile.hora_nacimiento,
    birth_place: profile.lugar_nacimiento,
    zodiac_sign: profile.signo,
    personal_number: profile.numero_personal,
    power_word: profile.palabraPoder,
    app_key_hash: profile.clave_app_hash,
    active_sections: profile.secciones_activas,
    premium_active: profile.capaPremiumActiva,
    onboarding_complete: profile.onboarding_completo,
  }
}

function fromRemote(remote: RemoteProfile, email: string): Profile {
  return {
    email,
    nombre: remote.display_name,
    fecha_nacimiento: remote.birth_date ?? '',
    hora_nacimiento: remote.birth_time,
    lugar_nacimiento: remote.birth_place,
    signo: remote.zodiac_sign,
    numero_personal: remote.personal_number,
    palabraPoder: remote.power_word,
    clave_app_hash: remote.app_key_hash,
    secciones_activas: remote.active_sections.filter((value): value is Profile['secciones_activas'][number] =>
      value === 'companeros' || value === 'plantas'),
    capaPremiumActiva: remote.premium_active,
    onboarding_completo: remote.onboarding_complete,
  }
}

export async function pushProfile(profile: Profile) {
  if (!supabase) return false
  const { data } = await supabase.auth.getUser()
  if (!data.user) return false
  const { error } = await supabase.from('aureo_profiles').upsert(toRemote(profile, data.user.id))
  if (error) throw error
  return true
}

export async function pullProfile() {
  if (!supabase) return null
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data, error } = await supabase
    .from('aureo_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const profile = fromRemote(data as RemoteProfile, userData.user.email ?? '')
  await profileRepository.save(profile)
  return profile
}
