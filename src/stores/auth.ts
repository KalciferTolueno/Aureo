import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/data/supabase/client'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const message = ref('')
  const user = computed<User | null>(() => session.value?.user ?? null)
  const authenticated = computed(() => Boolean(user.value))

  async function initialize() {
    if (initialized.value) return
    if (!supabase) { initialized.value = true; return }
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    session.value = data.session
    supabase.auth.onAuthStateChange((_event, nextSession) => { session.value = nextSession })
    initialized.value = true
  }

  async function requestOtp(email: string) {
    if (!supabase) throw new Error('Supabase todavía no está configurado en este entorno.')
    loading.value = true
    message.value = ''
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      message.value = 'Te enviamos un código de acceso a tu correo.'
    } finally { loading.value = false }
  }

  async function verifyOtp(email: string, token: string) {
    if (!supabase) throw new Error('Supabase todavía no está configurado en este entorno.')
    loading.value = true
    message.value = ''
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw error
      session.value = data.session
      return data.user
    } finally { loading.value = false }
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    session.value = null
  }

  return {
    session, user, authenticated, initialized, loading, message,
    configured: isSupabaseConfigured,
    initialize, requestOtp, verifyOtp, signOut,
  }
})
