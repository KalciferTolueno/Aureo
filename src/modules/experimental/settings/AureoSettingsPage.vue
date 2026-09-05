<script setup lang="ts">
import { computed, ref } from 'vue'
import { clearAureoData, exportBackup, importBackup } from '@/data/repositories'
import { personalNumber, SIGN_ORDER, signColors, signLabels, zodiacFor } from '@/domain/zodiac'
import { useProfileStore } from '@/stores/profile'

type SettingsTab = 'tu' | 'color' | 'avisos' | 'espacio' | 'promesa' | 'respaldo'

const TABS: { id: SettingsTab; label: string; short: string }[] = [
  { id: 'tu', label: 'Tú', short: 'Tú' },
  { id: 'color', label: 'Color de interfaz', short: 'Color' },
  { id: 'avisos', label: 'Avisos', short: 'Avisos' },
  { id: 'espacio', label: 'Tu espacio', short: 'Espacio' },
  { id: 'promesa', label: 'Privacidad', short: 'Promesa' },
  { id: 'respaldo', label: 'Respaldo', short: 'Copia' },
]

const profile = useProfileStore()
const tab = ref<SettingsTab>('tu')
const notice = ref('')
const fileField = ref<HTMLInputElement | null>(null)
const nombre = ref(profile.profile?.nombre ?? '')
const email = ref(profile.profile?.email ?? '')
const nacimiento = ref(profile.profile?.fecha_nacimiento ?? '')

const careOn = computed(() =>
  (profile.profile?.secciones_activas ?? []).some((section) => section === 'companeros' || section === 'plantas'),
)
const noticesOn = computed(() => Boolean(profile.profile?.notificaciones))
const signo = computed(() => profile.profile?.signo?.toLowerCase() ?? 'aries')
const signoLabel = computed(() => signLabels[signo.value] ?? signLabels.aries)
const matiz = computed(() => signColors[signo.value] ?? signColors.aries)

function destelloStyle(index: number) {
  const angle = (index / SIGN_ORDER.length) * 2 * Math.PI - Math.PI / 2
  return {
    left: `${50 + 33 * Math.cos(angle)}%`,
    top: `${50 + 33 * Math.sin(angle)}%`,
  }
}

function tell(message: string) {
  notice.value = message
  window.setTimeout(() => { if (notice.value === message) notice.value = '' }, 2800)
}

function selectTab(id: SettingsTab) {
  tab.value = id
}

function onTabKey(event: KeyboardEvent, index: number) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
  if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = TABS.length - 1
  const id = TABS[next]!.id
  selectTab(id)
  requestAnimationFrame(() => document.getElementById(`sp-tab-${id}`)?.focus())
}

async function saveNombre() {
  const next = nombre.value.trim()
  if (!next || next === (profile.profile?.nombre ?? '')) return
  await profile.update({ nombre: next })
  tell('Quedó guardado.')
}

async function saveEmail() {
  const next = email.value.trim()
  if (next && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
    tell('Ese correo no se puede guardar así.')
    email.value = profile.profile?.email ?? ''
    return
  }
  if (next === (profile.profile?.email ?? '')) return
  await profile.update({ email: next })
  tell('Quedó guardado. Vive solo en este dispositivo.')
}

async function saveNacimiento() {
  const next = nacimiento.value
  if (!next || next === (profile.profile?.fecha_nacimiento ?? '')) return
  await profile.update({
    fecha_nacimiento: next,
    signo: zodiacFor(next),
    numero_personal: personalNumber(next),
  })
  tell(`Tu matiz ahora es ${signLabels[zodiacFor(next)] ?? 'el tuyo'}.`)
}

async function chooseMatiz(sign: string) {
  if (sign === signo.value) return
  try {
    await profile.update({ signo: sign })
    tell(`El aire toma ${signLabels[sign] ?? 'tu matiz'}.`)
  } catch {
    tell('Ese matiz no pudo guardarse ahora.')
  }
}

async function toggleCare() {
  const next = careOn.value ? [] : (['companeros', 'plantas'] as const)
  await profile.update({ secciones_activas: [...next] })
}

async function toggleNotices() {
  if (!noticesOn.value) {
    if ('Notification' in window) {
      if (Notification.permission === 'denied') {
        tell('Este navegador bloqueó los avisos.')
        return
      }
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          tell('Sin permiso, Áureo no puede avisarte aquí.')
          return
        }
      }
    }
    await profile.update({ notificaciones: true })
    tell('Si hay algo que decirte, será en este dispositivo.')
    return
  }
  await profile.update({ notificaciones: false })
}

async function saveCopy() {
  const blob = new Blob([await exportBackup()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `aureo-copia-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  tell('Tu copia está en este dispositivo.')
}

async function restoreCopy(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await importBackup(await file.text())
    tell('Tu universo volvió.')
    window.setTimeout(() => window.location.reload(), 900)
  } catch {
    tell('Ese archivo no pudo restaurarse.')
  }
}

const wipeArmed = ref(false)
let wipeArmedTimer = 0

async function wipe() {
  if (!wipeArmed.value) {
    wipeArmed.value = true
    tell('Toca otra vez para borrar este Áureo. No se puede deshacer.')
    window.clearTimeout(wipeArmedTimer)
    wipeArmedTimer = window.setTimeout(() => { wipeArmed.value = false }, 6000)
    return
  }
  window.clearTimeout(wipeArmedTimer)
  await clearAureoData()
  window.location.reload()
}
</script>

<template>
  <div class="sp-root">
    <div class="sp-aura" aria-hidden="true" />

    <header class="sp-header">
      <h1 class="sp-title">
        <span class="sp-title-lead">Configuración</span>
        <span class="sp-title-of">de mi Áureo</span>
      </h1>
    </header>

    <div class="sp-body">
      <div class="sp-tabs" role="tablist" aria-label="Secciones de configuración">
        <button
          v-for="(item, index) in TABS"
          :id="`sp-tab-${item.id}`"
          :key="item.id"
          type="button"
          class="sp-tab"
          role="tab"
          :aria-selected="tab === item.id"
          :aria-controls="`sp-panel-${item.id}`"
          :aria-label="item.label"
          :tabindex="tab === item.id ? 0 : -1"
          @click="selectTab(item.id)"
          @keydown="onTabKey($event, index)"
        >
          {{ item.short }}
        </button>
      </div>

      <div
        :id="`sp-panel-${tab}`"
        class="sp-panel"
        role="tabpanel"
        :aria-labelledby="`sp-tab-${tab}`"
      >
        <form v-if="tab === 'tu'" class="sp-filet" @submit.prevent>
          <label class="sp-you">¿Cómo te llamas?<input v-model="nombre" maxlength="80" autocomplete="name" @blur="saveNombre" @keydown.enter.prevent="saveNombre" /></label>
          <label>Correo<input v-model="email" type="email" maxlength="160" autocomplete="email" inputmode="email" @blur="saveEmail" @keydown.enter.prevent="saveEmail" /></label>
          <label>Fecha de nacimiento<input v-model="nacimiento" type="date" @change="saveNacimiento" /></label>
        </form>

        <section v-else-if="tab === 'color'" class="sp-matiz">
          <p>El oro permanece. Esto solo tiñe el aire.</p>
          <div class="sp-well" role="radiogroup" aria-label="Matiz de interfaz" :style="{ '--matiz': matiz }">
            <span class="sp-well-core" aria-hidden="true" />
            <button
              v-for="(sign, index) in SIGN_ORDER"
              :key="sign"
              type="button"
              class="sp-destello"
              :class="{ on: signo === sign }"
              role="radio"
              :aria-checked="signo === sign"
              :aria-label="`Matiz ${signLabels[sign]}`"
              :style="{ ...destelloStyle(index), '--matiz': signColors[sign] }"
              @pointerdown.stop
              @click.stop="chooseMatiz(sign)"
            >
              <span />
            </button>
          </div>
          <p class="sp-matiz-name">{{ signoLabel }}</p>
        </section>

        <button v-else-if="tab === 'avisos'" type="button" class="sp-toggle" role="switch" :aria-checked="noticesOn" @click="toggleNotices">
          <span class="sp-toggle-copy">
            <strong>Notificaciones</strong>
            <small>Avisos en este dispositivo. Núcleo nunca se nombra.</small>
          </span>
          <span class="sp-switch" :class="{ on: noticesOn }" aria-hidden="true"><i /></span>
        </button>

        <button v-else-if="tab === 'espacio'" type="button" class="sp-toggle" role="switch" :aria-checked="careOn" @click="toggleCare">
          <span class="sp-toggle-copy">
            <strong>Lo que cuido</strong>
            <small>Compañeros y plantas. Podrás cambiarlo cuando quieras.</small>
          </span>
          <span class="sp-switch" :class="{ on: careOn }" aria-hidden="true"><i /></span>
        </button>

        <section v-else-if="tab === 'promesa'" class="sp-promise">
          <p>Tu universo vive solo en ti. Núcleo nunca sale de este dispositivo. Si eliminas la app, todo lo tuyo desaparece contigo.</p>
          <p class="sp-gold">Esto no es una limitación. Es una promesa.</p>
        </section>

        <section v-else class="sp-backup">
          <p>Exporta o restaura todos tus datos como un archivo. Es tu único respaldo en esta etapa local.</p>
          <div class="sp-actions">
            <button type="button" class="sp-btn-primary" @click="saveCopy">Guardar copia</button>
            <button type="button" class="sp-btn-quiet" @click="fileField?.click()">Restaurar copia</button>
            <input ref="fileField" type="file" accept="application/json" hidden @change="restoreCopy" />
          </div>
          <button type="button" class="sp-danger" :class="{ armed: wipeArmed }" @click="wipe">
            {{ wipeArmed ? 'Confirmar: borrar todo' : 'Borrar este Áureo' }}
          </button>
          <small>Borra todo lo que has guardado en este dispositivo. No se puede deshacer.</small>
        </section>
      </div>
    </div>

    <p v-if="notice" class="sp-notice" role="status">{{ notice }}</p>
  </div>
</template>

<style scoped>
.sp-root {
  position: relative;
  min-height: calc(100svh - 3rem);
  color: var(--texto);
  overflow: visible;
}
.sp-aura {
  position: absolute;
  z-index: -1;
  top: -6rem;
  right: calc(50% - 50vw - 4rem);
  left: calc(50% - 50vw - 4rem);
  height: 28rem;
  pointer-events: none;
  background: radial-gradient(ellipse at 72% 8%, color-mix(in srgb, var(--zodiac-color, #c9a86a) 16%, transparent), transparent 58%);
}

.sp-header {
  position: relative;
  max-width: 32rem;
  margin-inline: auto;
  padding: .15rem .15rem .2rem;
}
.sp-title {
  position: relative;
  display: grid;
  gap: .12rem;
  margin: 0;
  padding: .05rem 0 .95rem;
}
.sp-title-lead {
  color: var(--marfil, #f4efe5);
  font: 200 clamp(var(--texto-7), 7vw, var(--texto-8)) / .96 Fraunces, 'Aureo Serif', Georgia, serif;
  letter-spacing: -.03em;
}
.sp-title-of {
  color: var(--oro-claro);
  font: italic 300 var(--texto-4) / 1.3 Spectral, 'Aureo Serif', Georgia, serif;
}
.sp-title::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 2px;
  z-index: 1;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--oro-claro);
  box-shadow:
    0 0 0 4px #080b11,
    0 0 0 5px color-mix(in srgb, var(--oro) 70%, #ead6a7),
    0 0 14px color-mix(in srgb, var(--oro) 55%, transparent);
}
.sp-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 5px;
  width: min(42vw, 8.5rem);
  height: 1px;
  background: linear-gradient(90deg, var(--oro) 0 42%, var(--zodiac-color, var(--oro)) 68%, transparent);
}

.sp-body {
  display: grid;
  gap: 1.05rem;
  max-width: 32rem;
  margin: 0 auto;
  padding: .35rem .15rem calc(var(--espacio-6) + 3rem);
}

.sp-tabs {
  position: relative;
  display: flex;
  width: 100%;
  gap: .15rem;
}
.sp-tabs::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: .42rem;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, var(--oro), color-mix(in srgb, var(--zodiac-color, var(--oro)) 70%, var(--oro)) 62%, transparent);
  opacity: .45;
}
.sp-tab {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  min-height: var(--toque);
  margin: 0;
  padding: .2rem .05rem .7rem;
  border: 0;
  background: transparent;
  color: var(--texto-suave);
  font: italic 300 var(--texto-2) / 1 Spectral, Georgia, serif;
  letter-spacing: -.02em;
  white-space: nowrap;
  cursor: pointer;
}
.sp-tab::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: .35rem;
  width: 0;
  height: 2px;
  border-radius: var(--radio-pill);
  background: linear-gradient(90deg, var(--oro) 0 42%, var(--zodiac-color, var(--oro)) 68%, transparent);
  box-shadow: 0 8px 18px -10px var(--oro-claro);
  transform: translateX(-50%);
  opacity: 0;
  transition: width var(--dur-2, .35s) var(--ease-out, cubic-bezier(.23, 1, .32, 1)), opacity var(--dur-2, .35s) ease;
}
.sp-tab[aria-selected='true'] {
  color: var(--oro-claro);
}
.sp-tab[aria-selected='true']::after {
  width: min(100%, 2.6rem);
  opacity: 1;
}
.sp-tab:hover { color: var(--marfil, #f4efe5); }
.sp-tab:focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 3px; }

.sp-panel {
  position: relative;
  display: grid;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
  justify-items: stretch;
  padding: 1.2rem 1.25rem 1.35rem 1.5rem;
  overflow: visible;
  border: 0;
  border-radius: var(--radio-organico-3);
  background:
    radial-gradient(ellipse 92% 86% at 38% 28%, color-mix(in srgb, var(--zodiac-color, var(--oro)) 18%, rgba(14, 20, 30, .55)), transparent 72%);
  box-shadow: inset 0 0 52px rgba(0, 0, 0, .4);
}
.sp-panel::before {
  content: '';
  position: absolute;
  left: .9rem;
  top: 1.35rem;
  bottom: 1.35rem;
  width: 1px;
  border-radius: var(--radio-pill);
  background: linear-gradient(transparent, var(--oro), var(--zodiac-color, var(--oro)), transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--oro) 42%, transparent);
}

.sp-filet {
  display: grid;
  gap: .95rem;
  width: 100%;
}
.sp-filet label {
  display: grid;
  gap: .18rem;
  color: var(--texto-suave);
  font: italic 300 var(--texto-2) / 1.35 Spectral, Georgia, serif;
}
.sp-filet :is(input) {
  width: 100%;
  min-height: var(--toque);
  padding: .15rem 0 .4rem;
  border: 0;
  border-bottom: 1px solid rgba(201, 168, 106, .32);
  border-radius: 0;
  background: transparent;
  color: var(--texto);
  caret-color: var(--oro-claro);
  font: 300 var(--texto-4) / 1.35 Fraunces, 'Aureo Serif', Georgia, serif;
}
.sp-you input {
  min-height: 3rem;
  padding: .05rem 0 .5rem;
  font: 200 clamp(var(--texto-7), 8.5vw, var(--texto-8)) / .96 Fraunces, 'Aureo Serif', Georgia, serif;
  letter-spacing: -.03em;
}
.sp-filet input[type='date'] { color-scheme: dark; }
.sp-filet input[type='date']::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: .72;
  filter: invert(.82) sepia(.4) saturate(2.2) hue-rotate(8deg);
}
.sp-filet :is(input):focus,
.sp-filet :is(input):focus-visible {
  outline: 0;
  border-bottom-color: var(--oro-claro);
  border-bottom-width: 2px;
  padding-bottom: calc(.4rem - 1px);
  box-shadow: 0 14px 24px -22px rgba(234, 214, 167, .75);
}
.sp-you input:focus,
.sp-you input:focus-visible { padding-bottom: calc(.5rem - 1px); }

.sp-matiz { display: grid; gap: .55rem; justify-items: center; }
.sp-matiz > p {
  margin: 0;
  justify-self: start;
  color: var(--oro-claro);
  font: italic 300 var(--texto-3) / 1.5 Georgia, 'Times New Roman', serif;
}
.sp-well {
  position: relative;
  isolation: isolate;
  width: min(22rem, 100%);
  aspect-ratio: 1;
  margin-inline: auto;
  overflow: visible;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--matiz, var(--oro)) 22%, transparent), transparent 34%),
    radial-gradient(circle at 50% 50%, rgba(201, 168, 106, .07), transparent 7%),
    radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--matiz, var(--oro)) 12%, transparent), transparent 48%),
    radial-gradient(circle at 38% 32%, #111622, #080b11 72%);
  box-shadow: inset 0 0 90px rgba(0, 0, 0, .55), 0 28px 68px rgba(0, 0, 0, .22);
}
.sp-well-core {
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 50%;
  width: 46%;
  height: 46%;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--matiz, var(--oro)) 32%, transparent), transparent 70%);
  transform: translate(-50%, -50%);
}
.sp-destello {
  position: absolute;
  z-index: 5;
  display: grid;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transform: translate(-50%, -50%);
  cursor: pointer;
}
.sp-destello > span {
  position: relative;
  display: block;
  width: 9px;
  aspect-ratio: 1;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--matiz, var(--oro)) 74%, #fff);
  border-radius: 50%;
  background: var(--matiz, var(--oro));
  box-shadow:
    0 5px 14px color-mix(in srgb, var(--matiz, var(--oro)) 48%, transparent),
    0 10px 28px color-mix(in srgb, var(--matiz, var(--oro)) 32%, transparent);
  opacity: .42;
}
.sp-destello > span::after {
  content: '';
  position: absolute;
  inset: -7px;
  border: 1px solid color-mix(in srgb, var(--matiz, var(--oro)) 22%, transparent);
  border-radius: 50%;
  transform: scale(.68);
  transition: transform var(--dur-2, .35s) cubic-bezier(.16, 1, .3, 1), border-color var(--dur-2, .35s) ease;
}
.sp-destello:is(:hover, :focus-visible, .on) > span { opacity: 1; }
.sp-destello:is(:hover, :focus-visible, .on) > span::after {
  border-color: var(--matiz, var(--oro));
  transform: scale(1);
}
.sp-destello.on > span {
  width: 12px;
  box-shadow: 0 6px 18px var(--matiz, var(--oro)), 0 14px 38px color-mix(in srgb, var(--matiz, var(--oro)) 52%, transparent);
  animation: sp-destello-pulse 3.8s var(--ease-in-out, ease-in-out) infinite;
}
.sp-destello:focus-visible { outline: 2px solid #ead6a7; outline-offset: 3px; }
@keyframes sp-destello-pulse {
  0%, 100% { filter: brightness(.86); transform: scale(.92); }
  50% { filter: brightness(1.18); transform: scale(1.12); }
}
.sp-matiz-name {
  justify-self: center;
  margin: 0;
  color: var(--oro-claro);
  font: italic 300 var(--texto-4) / 1.3 Georgia, 'Times New Roman', serif;
}

.sp-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-3);
  width: 100%;
  min-height: var(--toque);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.sp-toggle:focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 4px; border-radius: 8px; }
.sp-toggle-copy { display: grid; gap: .12rem; min-width: 0; }
.sp-toggle strong {
  font: 300 var(--texto-4) / 1.2 Fraunces, 'Aureo Serif', Georgia, serif;
  color: var(--texto);
}
.sp-toggle small {
  color: var(--texto-suave);
  font: italic 300 var(--texto-2) / 1.4 Spectral, Georgia, serif;
}
.sp-switch {
  display: flex;
  width: 2.6rem;
  height: 1.5rem;
  flex: 0 0 auto;
  align-items: center;
  padding: 2px;
  border: 1px solid rgba(201, 168, 106, .45);
  border-radius: var(--radio-pill);
  background: rgba(8, 11, 17, .6);
  transition: background-color var(--transicion), border-color var(--transicion);
}
.sp-switch i {
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 50%;
  background: var(--texto-suave);
  box-shadow: 0 0 0 1px rgba(234, 214, 167, .2);
  transition: transform var(--transicion), background-color var(--transicion), box-shadow var(--transicion);
}
.sp-switch.on { border-color: var(--oro); background: rgba(201, 168, 106, .28); }
.sp-switch.on i {
  transform: translateX(1.05rem);
  background: var(--oro-claro);
  box-shadow: 0 0 10px rgba(201, 168, 106, .5);
}

.sp-promise,
.sp-backup { display: grid; gap: .75rem; }
.sp-promise p,
.sp-backup > p {
  margin: 0;
  color: var(--texto);
  font: 300 var(--texto-3) / 1.55 Spectral, Georgia, serif;
}
.sp-gold { color: var(--oro) !important; font-style: italic; }

.sp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espacio-2); width: 100%; }
.sp-btn-primary,
.sp-btn-quiet {
  min-height: var(--toque);
  border-radius: var(--radio-pill);
  font: 300 var(--texto-3) / 1 Fraunces, 'Aureo Serif', Georgia, serif;
  cursor: pointer;
}
.sp-btn-primary {
  border: 1px solid var(--oro);
  background: rgba(201, 168, 106, .14);
  color: var(--oro-claro);
}
.sp-btn-quiet {
  border: 1px solid var(--borde);
  background: transparent;
  color: var(--texto-suave);
}
.sp-btn-primary:focus-visible,
.sp-btn-quiet:focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 2px; }

.sp-danger {
  justify-self: start;
  min-height: var(--toque);
  margin-top: .35rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--texto-suave);
  font: 300 var(--texto-2) / 1 Spectral, Georgia, serif;
  text-decoration: underline;
  text-decoration-color: rgba(185, 179, 170, .4);
  text-underline-offset: 4px;
  cursor: pointer;
}
.sp-danger.armed { color: var(--peligro); text-decoration-color: var(--peligro); }
.sp-backup small {
  color: var(--texto-suave);
  font: italic 300 var(--texto-1) / 1.45 Spectral, Georgia, serif;
}

.sp-notice {
  position: fixed;
  z-index: 40;
  bottom: calc(5.2rem + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  padding: .5rem 1.1rem;
  border-radius: var(--radio-pill);
  border: 1px solid rgba(201, 168, 106, .35);
  background: #0d121b;
  color: var(--oro-claro);
  font: italic 300 var(--texto-2) / 1.35 Spectral, Georgia, serif;
}
@media (min-width: 1024px) {
  .sp-notice { bottom: 1.5rem; }
}
@media (prefers-reduced-motion: reduce) {
  .sp-tab::after,
  .sp-destello > span::after { transition-duration: 1ms; }
  .sp-destello.on > span { animation: none; }
  .sp-switch, .sp-switch i { transition-duration: 1ms; }
}
</style>
