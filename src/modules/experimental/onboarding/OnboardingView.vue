<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { playChord, playTone, unlockTone } from '@/composables/useTone'
import { hashMelody, MELODY_NOTES, powerWordFrom } from '@/domain/melody'
import { digitSum, nameNumber, personalNumber, signLabels, signRevealPhrases, signSymbols, zodiacFor } from '@/domain/zodiac'
import { defaultProfile, useProfileStore } from '@/stores/profile'
import { localDateKey } from '@/domain/umbral'

type Step = 'welcome' | 'privacy' | 'name' | 'origin' | 'reveal' | 'email' | 'melody' | 'spaces' | 'threshold'

const profile = useProfileStore()
const step = ref<Step>('welcome')
const welcomeReady = ref(false)
const name = ref('')
const day = ref('')
const month = ref('')
const year = ref('')
const hour = ref('')
const place = ref('')
const showOriginExtra = ref(false)
const originPulse = ref(false)
const careActive = ref(false)
const email = ref('')
const melody = ref<string[]>([])
const melodyPulse = ref(false)
const reveal = reactive({ symbol: false, number: false, sign: false, phrase: false, action: false, preview: false })
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let timers: number[] = []

const birthDate = computed(() => {
  const y = Number(year.value)
  const m = Number(month.value)
  const d = Number(day.value)
  if (!y || !m || !d || y < 1900 || y > new Date().getFullYear() || m > 12 || d > 31) return ''
  const value = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const parsed = new Date(`${value}T12:00:00`)
  if (parsed.getFullYear() !== y || parsed.getMonth() + 1 !== m || parsed.getDate() !== d) return ''
  return value
})
const signKey = computed(() => zodiacFor(birthDate.value))
const signLabel = computed(() => signLabels[signKey.value] ?? 'Aries')
const signSymbol = computed(() => signSymbols[signKey.value] ?? '♈')
const signPhrase = computed(() => signRevealPhrases[signKey.value] ?? 'El umbral ya te reconoce.')
const personal = computed(() => birthDate.value ? personalNumber(birthDate.value) : 0)
const emailReady = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))

function later(ms: number, fn: () => void) {
  if (reduced) { fn(); return }
  timers.push(window.setTimeout(fn, ms))
}

function go(next: Step) {
  timers.forEach(clearTimeout)
  timers = []
  step.value = next
  if (next === 'welcome') startWelcome()
  if (next === 'origin' && birthDate.value) showOriginExtra.value = true
  if (next === 'reveal') startReveal()
  if (next === 'threshold') later(3000, complete)
}

function startWelcome() {
  welcomeReady.value = reduced
  later(4200, () => { welcomeReady.value = true })
}

function startReveal() {
  Object.assign(reveal, { symbol: false, number: false, sign: false, phrase: false, action: false, preview: false })
  if (reduced) {
    Object.assign(reveal, { symbol: true, number: true, sign: true, phrase: true, action: true })
    return
  }
  later(1000, () => {
    reveal.symbol = true
    playTone(noteFromPersonal(), 0.55)
  })
  later(2200, () => {
    reveal.number = true
    playTone(noteFromPersonal(), 0.4)
  })
  later(3200, () => { reveal.sign = true })
  later(4000, () => { reveal.phrase = true })
  later(4800, () => { reveal.action = true })
}

function acknowledgeSign() {
  reveal.preview = true
  later(3000, () => go('email'))
}

function noteFromPersonal() {
  const map = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
  return map[(Math.max(personal.value, 1) - 1) % 7] ?? 'La'
}

function submitName() {
  if (!name.value.trim()) return
  go('origin')
}

function submitOrigin() {
  if (!birthDate.value) {
    originPulse.value = true
    later(700, () => { originPulse.value = false })
    return
  }
  if (!showOriginExtra.value) {
    showOriginExtra.value = true
    return
  }
  go('reveal')
}

function pressNote(note: string) {
  unlockTone()
  if (melodyPulse.value) return
  if (melody.value.length >= 3) melody.value = []
  melody.value.push(note)
  playTone(note)
  if (melody.value.length !== 3) return
  melodyPulse.value = true
  playChord(melody.value)
  later(900, () => {
    melodyPulse.value = false
    go('spaces')
  })
}

async function complete() {
  const birth = birthDate.value
  if (!birth || melody.value.length !== 3) return
  const entry = localDateKey()
  const seal = powerWordFrom(personalNumber(birth), nameNumber(name.value), digitSum(entry, false))
  await profile.save({
    ...(profile.profile ?? defaultProfile()),
    nombre: name.value.trim(),
    email: email.value.trim(),
    fecha_nacimiento: birth,
    hora_nacimiento: hour.value || null,
    lugar_nacimiento: place.value.trim() || null,
    signo: signKey.value,
    numero_personal: personalNumber(birth),
    palabraPoder: seal,
    clave_app_hash: await hashMelody(melody.value),
    secciones_activas: careActive.value ? ['companeros', 'plantas'] : [],
    onboarding_completo: true,
  })
}

onMounted(startWelcome)
onUnmounted(() => timers.forEach(clearTimeout))
</script>

<template>
  <main class="onboarding" :data-step="step" :data-sign="signKey">
    <section v-if="step === 'welcome'" class="onboarding-step welcome">
      <img class="m6 breath" src="/icons/aureo-m6.png" alt="" />
      <p class="welcome-copy">
        <span>Mi momento de máximo esplendor.</span>
        <span>Ya está ocurriendo — aunque aún no puedas verlo.</span>
      </p>
      <button v-if="welcomeReady" type="button" class="cta" @click="go('privacy')">Entrar</button>
    </section>

    <section v-else-if="step === 'privacy'" class="onboarding-step privacy">
      <img class="m6 small breath" src="/icons/aureo-m6.png" alt="" />
      <h1>Tu universo vive solo en ti.</h1>
      <p>Áureo no tiene base de datos ni respaldo en la nube. No guardamos ni enviamos nada a ningún servidor. Todo lo que escribas vive únicamente en este dispositivo. Si eliminas la app, todo lo tuyo desaparece contigo.</p>
      <p class="gold-line">Esto no es una limitación. Es una promesa.</p>
      <p class="soft">Núcleo nunca sale de este teléfono. Ni cifrado, ni a copias, ni a nadie.</p>
      <button type="button" class="cta" @click="go('name')">Es mío y solo mío</button>
    </section>

    <section v-else-if="step === 'name'" class="onboarding-step">
      <label class="field">
        <span>¿Cómo te llamas cuando nadie te está mirando?</span>
        <input v-model="name" maxlength="40" placeholder="tu nombre íntimo" autocomplete="given-name" @keydown.enter.prevent="submitName" />
      </label>
      <p class="soft">Este nombre vivirá en tu universo.</p>
      <button type="button" class="cta" :disabled="!name.trim()" @click="submitName">Así me llamo</button>
    </section>

    <section v-else-if="step === 'origin'" class="onboarding-step" :class="{ pulse: originPulse }">
      <p class="gold-name">{{ name }}</p>
      <h1>¿Cuándo llegaste a esta dimensión?</h1>
      <div class="date-row">
        <label>Día<input v-model="day" inputmode="numeric" maxlength="2" placeholder="22" /></label>
        <label>Mes<input v-model="month" inputmode="numeric" maxlength="2" placeholder="06" /></label>
        <label>Año<input v-model="year" inputmode="numeric" maxlength="4" placeholder="1990" /></label>
      </div>
      <template v-if="showOriginExtra">
        <p class="soft">Si conoces tu hora o lugar de nacimiento, tu universo se afina aún más.</p>
        <label class="field">Hora de nacimiento<input v-model="hour" type="time" /></label>
        <label class="field">Lugar<input v-model="place" maxlength="80" placeholder="opcional" /></label>
      </template>
      <button type="button" class="cta" @click="submitOrigin">Este es mi origen</button>
    </section>

    <section v-else-if="step === 'reveal'" class="onboarding-step reveal" :class="{ preview: reveal.preview }">
      <p class="gold-name">{{ name }}</p>
      <span v-if="reveal.symbol" class="sign-glyph drop">{{ signSymbol }}</span>
      <strong v-if="reveal.number" class="sign-number">{{ personal }}</strong>
      <h1 v-if="reveal.sign">{{ signLabel }}</h1>
      <p v-if="reveal.phrase" class="gold-line">{{ signPhrase }}</p>
      <button v-if="reveal.action" type="button" class="cta" @click="acknowledgeSign">Reconozco lo que soy</button>
    </section>

    <section v-else-if="step === 'email'" class="onboarding-step">
      <h1>Tu Áureo {{ signLabel }} está listo. Para que siempre puedas encontrarlo — ¿cómo te encontramos nosotros?</h1>
      <label class="field">
        <input v-model="email" type="email" inputmode="email" autocomplete="email" placeholder="tu@correo.com" aria-label="Correo" @keydown.enter.prevent="emailReady && go('melody')" />
      </label>
      <p class="soft">Solo tú sabes que estás aquí.</p>
      <button type="button" class="cta" :disabled="!emailReady" @click="go('melody')">Así me encuentran</button>
    </section>

    <section v-else-if="step === 'melody'" class="onboarding-step">
      <h1>Tu Áureo tiene una llave.</h1>
      <p class="soft">Toca tres notas. Esa melodía abre Núcleo, y solo vive aquí.</p>
      <div class="melody-progress" aria-label="Notas de tu llave">
        <span v-for="index in 3" :key="index" :class="{ filled: melody[index - 1] }" />
      </div>
      <div class="note-grid" :class="{ pulse: melodyPulse }">
        <button v-for="note in MELODY_NOTES" :key="note" type="button" :aria-pressed="melody.includes(note) && melody.indexOf(note) < melody.length" @click="pressNote(note)">{{ note }}</button>
      </div>
    </section>

    <section v-else-if="step === 'spaces'" class="onboarding-step">
      <h1>Tu espacio, a tu medida</h1>
      <p class="soft">Activa los espacios que quieres habitar. Podrás cambiarlo cuando quieras.</p>
      <button type="button" class="space-card" :class="{ on: careActive }" @click="careActive = !careActive">
        <strong>Lo que cuido</strong>
        <span>Lo que cuido, también me cuida.</span>
      </button>
      <button type="button" class="cta" @click="go('threshold')">Este es mi universo</button>
    </section>

    <section v-else class="onboarding-step threshold">
      <span class="sun-mark breath" aria-hidden="true">☉</span>
      <h1>Umbral</h1>
      <p class="soft">Los primeros minutos del día que te pertenecen solo a ti.</p>
    </section>
  </main>
</template>

<style scoped>
.onboarding { min-height: 100svh; display: grid; place-items: center; padding: 2rem 1.25rem calc(2rem + env(safe-area-inset-bottom)); background: #080b11; color: #f4efe5; text-align: center; }
.onboarding-step { display: grid; justify-items: center; gap: 1.15rem; width: min(100%, 26rem); }
.m6 { width: min(42vw, 9.5rem); height: auto; filter: drop-shadow(0 0 18px rgba(201,168,106,.35)); }
.m6.small { width: 3.2rem; }
.breath { animation: m6-breath 3.5s ease-in-out infinite; }
.welcome-copy { display: grid; gap: .85rem; margin: 0; max-width: 22rem; color: #f4efe5; font: 200 var(--texto-6)/1.45 Fraunces, 'Aureo Serif', Georgia, serif; }
.welcome-copy span { animation: copy-in 1.1s ease both; }
.welcome-copy span:last-child { animation-delay: 1.8s; }
h1 { margin: 0; color: #f4efe5; font: 200 var(--texto-6)/1.2 Fraunces, 'Aureo Serif', Georgia, serif; }
p { margin: 0; max-width: 36ch; color: #d8d1c6; font: 300 var(--texto-4)/1.7 Spectral, 'Aureo Serif', Georgia, serif; }
.soft { color: rgba(245,240,230,.7); font-size: var(--texto-3); }
.gold-line { margin-block: 1rem .25rem; color: #c9a86a; font: 300 var(--texto-4)/1.5 Spectral, 'Aureo Serif', Georgia, serif; }
.gold-name { color: #c9a86a; font: 200 var(--texto-5)/1 Fraunces, 'Aureo Serif', Georgia, serif; }
.cta { min-height: 48px; padding: .8rem 2.4rem; border: 1px solid #c9a86a; border-radius: var(--radio-pill); background: transparent; color: #c9a86a; font: 300 var(--texto-4)/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; animation: copy-in .6s ease both; }
.cta:disabled { opacity: .35; cursor: default; }
.field, .date-row label { display: grid; gap: .4rem; width: 100%; color: #b9b3aa; font: 300 var(--texto-2)/1.3 Spectral, 'Aureo Serif', Georgia, serif; text-align: center; }
.field input, .date-row input { width: 100%; min-height: 48px; border: 0; border-bottom: 1px solid #c9a86a; border-radius: 0; background: transparent; color: #f5f0e6; font: 300 var(--texto-5)/1.4 Fraunces, 'Aureo Serif', Georgia, serif; text-align: center; caret-color: #ead6a7; outline: 0; }
.field input::placeholder, .date-row input::placeholder { color: rgba(201,168,106,.6); }
.date-row { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: .8rem; width: 100%; }
.pulse .date-row input { animation: gold-pulse .7s ease; }
.sign-glyph { display: block; color: #c9a86a; font-size: var(--texto-hero); line-height: 1; filter: drop-shadow(0 12px 24px rgba(201,168,106,.28)); }
.sign-glyph.drop { animation: sign-drop .8s cubic-bezier(.16,1,.3,1) both; }
.sign-number { color: #f5f0e6; font: 200 var(--texto-9)/1 Fraunces, 'Aureo Serif', Georgia, serif; }
.reveal.preview { animation: sign-wash 3s ease; }
.melody-progress { display: flex; gap: .55rem; }
.melody-progress span { width: .7rem; height: .7rem; border: 1px solid rgba(201,168,106,.4); border-radius: 50%; }
.melody-progress span.filled { background: #c9a86a; }
.note-grid { display: grid; grid-template-columns: repeat(4, 4.4rem); gap: .55rem; justify-content: center; }
.note-grid button { min-height: 48px; border: 1px solid rgba(201,168,106,.4); border-radius: var(--radio-pill); background: transparent; color: #ead6a7; font: 300 var(--texto-4)/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; }
.note-grid.pulse button { animation: gold-pulse .9s ease; }
.space-card { display: grid; gap: .35rem; width: 100%; padding: 1.1rem 1rem; border: 1px solid #080b11; border-radius: var(--radio-md); background: transparent; color: rgba(245,240,230,.5); text-align: left; cursor: pointer; }
.space-card strong { font: 300 var(--texto-5)/1.2 Fraunces, 'Aureo Serif', Georgia, serif; }
.space-card span { font: 300 var(--texto-3)/1.4 Spectral, 'Aureo Serif', Georgia, serif; }
.space-card.on { border-color: #c9a86a; background: rgba(201,168,106,.1); color: #f4efe5; }
.sun-mark { color: #c9a86a; font-size: var(--texto-9); }
.threshold h1 { font-size: var(--texto-8); }
@keyframes m6-breath { 0%,100% { filter: drop-shadow(0 0 10px rgba(201,168,106,.22)); transform: scale(.98); } 50% { filter: drop-shadow(0 0 22px rgba(201,168,106,.5)); transform: scale(1.03); } }
@keyframes copy-in { from { opacity: 0; transform: translateY(.4rem); } }
@keyframes sign-drop { from { opacity: 0; transform: translateY(-1.4rem); } }
@keyframes gold-pulse { 50% { border-color: #ead6a7; box-shadow: 0 0 16px rgba(201,168,106,.35); } }
@keyframes sign-wash { 0%,100% { background: transparent; } 40% { background: color-mix(in srgb, var(--sign-color, #c9a86a) 18%, transparent); } }
@media (prefers-reduced-motion: reduce) {
  .breath, .welcome-copy span, .sign-glyph.drop, .cta, .reveal.preview { animation: none; }
}
</style>
