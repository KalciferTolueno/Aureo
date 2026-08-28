<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { defaultProfile, useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { personalNumber, signSymbols, zodiacFor } from '@/domain/zodiac'
import type { OptionalSection } from '@/domain/types'
import AppIcon from '@/shared/components/AppIcon.vue'

type MusicalNote = 'Do' | 'Re' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si'

const router = useRouter()
const profiles = useProfileStore()
const auth = useAuthStore()
const step = ref(0)
const saving = ref(false)
const otpSent = ref(false)
const otp = ref('')
const emailVerified = ref(false)
const errorMessage = ref('')
const notes = ref<MusicalNote[]>([])
const musicalNotes: { name: MusicalNote; frequency: number }[] = [
  { name: 'Do', frequency: 261.63 }, { name: 'Re', frequency: 293.66 },
  { name: 'Mi', frequency: 329.63 }, { name: 'Fa', frequency: 349.23 },
  { name: 'Sol', frequency: 392 }, { name: 'La', frequency: 440 },
  { name: 'Si', frequency: 493.88 },
]
const form = reactive({
  email: '', nombre: '', fecha: '', hora: '', lugar: '', palabra: 'Presencia',
  sections: [] as OptionalSection[],
})
const zodiac = computed(() => zodiacFor(form.fecha))
const number = computed(() => personalNumber(form.fecha))
const steps = ['Bienvenida', 'Privacidad', 'Tu nombre', 'Tu nacimiento', 'Tu signo', 'Tu cuenta', 'Tu melodía', 'Tus espacios', 'Umbral']
const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
const canContinue = computed(() => {
  if (step.value <= 1 || step.value === 4 || step.value === 7) return true
  if (step.value === 2) return Boolean(form.nombre.trim())
  if (step.value === 3) return Boolean(form.fecha)
  if (step.value === 5) return validEmail.value && (!auth.configured || emailVerified.value || auth.authenticated)
  if (step.value === 6) return notes.value.length === 3
  return false
})
const continueLabel = computed(() => [
  'Entrar', 'Es mío y solo mío', 'Así me llamo', 'Este es mi origen',
  'Reconozco lo que soy', 'Continuar', 'Esta es mi melodía', 'Este es mi universo', '',
][step.value])

function toggle(section: OptionalSection) {
  const index = form.sections.indexOf(section)
  index < 0 ? form.sections.push(section) : form.sections.splice(index, 1)
}

function playNote(frequency: number) {
  const AudioContextClass = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = frequency
  oscillator.type = 'sine'
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.45)
  oscillator.addEventListener('ended', () => { void context.close() })
}

function addNote(note: MusicalNote, frequency: number) {
  if (notes.value.length >= 3) return
  notes.value.push(note)
  playNote(frequency)
}

async function hashMusicalKey() {
  const bytes = new TextEncoder().encode(notes.value.join('|'))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function sendOtp() {
  if (!validEmail.value || auth.loading) return
  errorMessage.value = ''
  try {
    await auth.requestOtp(form.email.trim())
    otpSent.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No pudimos enviar el código. Inténtalo nuevamente.'
  }
}

async function confirmOtp() {
  if (otp.value.trim().length < 6 || auth.loading) return
  errorMessage.value = ''
  try {
    await auth.verifyOtp(form.email.trim(), otp.value.trim())
    emailVerified.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'El código no es válido o ya venció.'
  }
}

async function finish() {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const profile = {
      ...defaultProfile(),
      email: form.email.trim(),
      nombre: form.nombre.trim(),
      fecha_nacimiento: form.fecha,
      hora_nacimiento: form.hora || null,
      lugar_nacimiento: form.lugar.trim() || null,
      signo: zodiac.value,
      numero_personal: number.value,
      palabraPoder: form.palabra.trim() || 'Presencia',
      clave_app_hash: await hashMusicalKey(),
      secciones_activas: form.sections,
      onboarding_completo: true,
    }
    await profiles.save(profile)
    if (auth.authenticated) await profiles.syncToRemote()
    step.value = 8
    window.setTimeout(() => { void router.replace('/') }, 2600)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No pudimos terminar la configuración.'
  } finally { saving.value = false }
}

async function advance() {
  if (!canContinue.value || saving.value) return
  if (step.value === 7) await finish()
  else step.value += 1
}
</script>

<template>
  <main class="onboarding-shell">
    <div class="stars" aria-hidden="true" />
    <section class="welcome-card onboarding-card" :class="{ 'entry-card': step === 8 }">
      <div class="aureo-mark respira" aria-hidden="true"><span /></div>
      <p v-if="step < 8" class="onboarding-progress" aria-live="polite">{{ steps[step] }} · {{ step + 1 }}/8</p>

      <template v-if="step === 0">
        <h1>Áureo</h1>
        <p class="lead">Mi momento de máximo esplendor.<br />Ya está ocurriendo, aunque aún no pueda verlo.</p>
      </template>
      <template v-else-if="step === 1">
        <h2>Tu espacio te pertenece</h2>
        <p class="lead">Umbral, Mundos, Mi Balance y Edad Dorada podrán acompañarte entre dispositivos. Núcleo nunca saldrá de este teléfono.</p>
        <p class="privacy-promise">Esto no es una limitación. Es una promesa.</p>
      </template>
      <template v-else-if="step === 2">
        <h2>¿Cómo quieres que te llame?</h2>
        <label class="field onboarding-line"><span>Tu nombre</span><input v-model="form.nombre" name="nombre" autocomplete="name" autofocus /></label>
      </template>
      <template v-else-if="step === 3">
        <p class="onboarding-name">{{ form.nombre }}</p>
        <h2>¿Cuándo comenzó tu recorrido?</h2>
        <label class="field onboarding-line"><span>Fecha de nacimiento</span><input v-model="form.fecha" name="fecha_nacimiento" type="date" autocomplete="bday" /></label>
      </template>
      <template v-else-if="step === 4">
        <p class="onboarding-name">{{ form.nombre }}</p>
        <div class="zodiac-reveal" aria-hidden="true">{{ signSymbols[zodiac] }}</div>
        <h2 class="capitalize">{{ zodiac }}</h2>
        <p class="lead">Tu signo será una de las formas en que Áureo reconoce tu origen.</p>
      </template>
      <template v-else-if="step === 5">
        <h2>Tu cuenta de Áureo</h2>
        <p class="lead">Usaremos tu correo para que recuperes tus espacios al cambiar de dispositivo.</p>
        <label class="field onboarding-line"><span>Correo electrónico</span><input v-model="form.email" name="email" type="email" autocomplete="email" spellcheck="false" :disabled="emailVerified" /></label>
        <template v-if="auth.configured">
          <button v-if="!otpSent" class="secondary-action account-action" type="button" :disabled="!validEmail || auth.loading" @click="sendOtp">{{ auth.loading ? 'Enviando…' : 'Enviar código' }}</button>
          <div v-else-if="!emailVerified" class="otp-block">
            <label class="field onboarding-line"><span>Código de 6 dígitos</span><input v-model="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" /></label>
            <button class="secondary-action account-action" type="button" :disabled="otp.length < 6 || auth.loading" @click="confirmOtp">{{ auth.loading ? 'Verificando…' : 'Verificar correo' }}</button>
          </div>
          <p v-else class="form-message" role="status">Tu correo quedó verificado.</p>
        </template>
        <p v-else class="privacy-note">La sincronización se activará cuando este entorno reciba la clave pública de Supabase.</p>
      </template>
      <template v-else-if="step === 6">
        <h2>Crea tu melodía</h2>
        <p class="lead">Elige tres notas. Será tu llave personal de entrada.</p>
        <div class="melody-progress" aria-label="Notas elegidas"><span v-for="index in 3" :key="index" :class="{ filled: notes[index - 1] }">{{ notes[index - 1] ?? '' }}</span></div>
        <div class="musical-grid">
          <button v-for="note in musicalNotes" :key="note.name" type="button" :disabled="notes.length >= 3" @click="addNote(note.name, note.frequency)">{{ note.name }}</button>
        </div>
        <button v-if="notes.length" class="text-action" type="button" @click="notes = []">Elegir otra melodía</button>
      </template>
      <template v-else-if="step === 7">
        <h2>Elige tus submundos</h2>
        <p class="lead">Puedes comenzar con ninguno o abrir los espacios que hoy tengan sentido.</p>
        <div class="choice-grid">
          <button v-for="item in [{ id: 'companeros', label: 'Compañeros' }, { id: 'plantas', label: 'Plantas' }]" :key="item.id" type="button" class="choice-card" :class="{ selected: form.sections.includes(item.id as OptionalSection) }" :aria-pressed="form.sections.includes(item.id as OptionalSection)" @click="toggle(item.id as OptionalSection)">{{ item.label }}</button>
        </div>
      </template>
      <template v-else>
        <AppIcon class="entry-symbol respira" name="sun" aria-hidden="true" />
        <h2>Umbral</h2>
        <p class="lead">Los primeros minutos del día que te pertenecen solo a ti.</p>
      </template>

      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <div v-if="step < 8" class="onboarding-actions">
        <button class="primary-action" type="button" :disabled="!canContinue || saving" @click="advance">{{ saving ? 'Preparando tu espacio…' : continueLabel }}</button>
      </div>
    </section>
  </main>
</template>
