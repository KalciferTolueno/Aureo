import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '@/data/storage'

const LOCAL_SESSION_KEY = 'local_session'

export interface LocalSession {
  id: string
  created_at: string
  mode: 'local'
}

function isLocalSession(value: unknown): value is LocalSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LocalSession>
  return candidate.mode === 'local' && typeof candidate.id === 'string' && typeof candidate.created_at === 'string'
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<LocalSession | null>(null)
  const initialized = ref(false)
  const authenticated = computed(() => Boolean(session.value))
  const user = computed(() => session.value ? { id: session.value.id } : null)

  async function startLocalSession() {
    const next: LocalSession = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      mode: 'local',
    }
    await storage.set(LOCAL_SESSION_KEY, next)
    session.value = next
    return next
  }

  async function initialize() {
    if (initialized.value) return
    const stored = await storage.get<LocalSession>(LOCAL_SESSION_KEY)
    session.value = isLocalSession(stored) ? stored : await startLocalSession()
    initialized.value = true
  }

  async function signOut() {
    await storage.remove(LOCAL_SESSION_KEY)
    session.value = null
  }

  return {
    session, user, authenticated, initialized,
    mode: 'local' as const,
    initialize, startLocalSession, signOut,
  }
})
