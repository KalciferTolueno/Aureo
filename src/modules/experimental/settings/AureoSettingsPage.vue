<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import { clearAureoData, exportBackup, importBackup } from '@/data/repositories'
import { useProfileStore } from '@/stores/profile'

const router = useRouter()
const profile = useProfileStore()
const notice = ref('')
const fileField = ref<HTMLInputElement | null>(null)

const careOn = ref(
  (profile.profile?.secciones_activas ?? []).some((s: string) => s === 'companeros' || s === 'plantas'),
)

function tell(message: string) {
  notice.value = message
  window.setTimeout(() => { if (notice.value === message) notice.value = '' }, 2800)
}

async function toggleCare() {
  const next = careOn.value ? [] : (['companeros', 'plantas'] as const)
  await profile.update({ secciones_activas: [...next] })
  careOn.value = !careOn.value
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
  <div class="sp-root tw:min-h-svh tw:bg-noche tw:font-aureo tw:text-marfil">
    <!-- Fondo suave compartido con el resto de la app -->
    <div class="sp-aura" aria-hidden="true" />

    <header class="sp-header">
      <button type="button" class="sp-back" aria-label="Volver" @click="router.back()">
        <AppIcon name="arrow-left" />
      </button>
      <div class="sp-identity">
        <p class="sp-who">{{ profile.name || 'Tu espacio' }}</p>
        <h1 class="sp-title">Configuración de mi Áureo</h1>
      </div>
    </header>

    <main class="sp-body">
      <!-- Promesa -->
      <section class="sp-section sp-promise">
        <h2>Mi promesa de privacidad</h2>
        <p>Tu universo vive solo en ti. Núcleo nunca sale de este dispositivo. Si eliminas la app, todo lo tuyo desaparece contigo.</p>
        <p class="sp-gold">Esto no es una limitación. Es una promesa.</p>
      </section>

      <!-- Tu espacio -->
      <section class="sp-section">
        <h2>Tu espacio</h2>
        <button type="button" class="sp-toggle" role="switch" :aria-checked="careOn" @click="toggleCare">
          <span class="sp-toggle-copy">
            <strong>Lo que cuido</strong>
            <small>Compañeros y plantas. Podrás cambiarlo cuando quieras.</small>
          </span>
          <span class="sp-switch" :class="{ on: careOn }" aria-hidden="true"><i /></span>
        </button>
      </section>

      <!-- Tu respaldo -->
      <section class="sp-section">
        <h2>Tu respaldo</h2>
        <p>Exporta o restaura todos tus datos como un archivo. Es tu único respaldo en esta etapa local.</p>
        <div class="sp-actions">
          <button type="button" class="sp-btn-primary" @click="saveCopy">Guardar copia</button>
          <button type="button" class="sp-btn-quiet" @click="fileField?.click()">Restaurar copia</button>
          <input ref="fileField" type="file" accept="application/json" hidden @change="restoreCopy" />
        </div>
      </section>

      <!-- Despedida -->
      <section class="sp-section sp-farewell">
        <button type="button" class="sp-danger" :class="{ armed: wipeArmed }" @click="wipe">
          {{ wipeArmed ? 'Confirmar: borrar todo' : 'Borrar este Áureo' }}
        </button>
        <small>Borra todo lo que has guardado en este dispositivo. No se puede deshacer.</small>
      </section>
    </main>

    <p v-if="notice" class="sp-notice" role="status">{{ notice }}</p>
  </div>
</template>

<style scoped>
/* ── raíz ── */
.sp-root { position: relative; isolation: isolate; }
.sp-aura {
  position: fixed; z-index: -1; inset: 0;
  background:
    radial-gradient(ellipse at 80% 0, rgba(201,168,106,.12), transparent 55%),
    radial-gradient(ellipse at 20% 100%, rgba(201,168,106,.06), transparent 45%);
  pointer-events: none;
}

/* ── encabezado ── */
.sp-header {
  display: flex; align-items: flex-start; gap: var(--espacio-3);
  padding: var(--espacio-3) var(--espacio-4) var(--espacio-2);
  /* Filete dorado inferior */
  border-bottom: 1px solid rgba(201,168,106,.18);
}
.sp-back {
  display: grid; width: var(--toque); height: var(--toque); flex: 0 0 auto;
  place-items: center; margin: -.3rem 0 0; border: 0;
  border-radius: var(--radio-pill); background: transparent;
  color: var(--oro-claro); cursor: pointer;
  transition: background-color var(--respuesta);
}
.sp-back:hover { background: rgba(201,168,106,.1); }
.sp-back svg { width: 1.05rem; }
.sp-back:focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 2px; }

.sp-identity { min-width: 0; }
.sp-who {
  margin: 0 0 .2rem; color: var(--oro);
  font: 500 var(--texto-1)/1 system-ui, sans-serif;
  letter-spacing: .14em; text-transform: uppercase;
}
.sp-title {
  margin: 0; color: var(--texto);
  font: 300 var(--texto-6)/1.15 Fraunces, 'Aureo Serif', Georgia, serif;
  letter-spacing: -.02em;
}

/* ── cuerpo ── */
.sp-body {
  display: grid; gap: 0;
  max-width: 32rem; margin: 0 auto;
  padding: var(--espacio-4) var(--espacio-4) calc(var(--espacio-6) + 3rem);
}

/* ── secciones ── */
.sp-section {
  display: grid; gap: var(--espacio-2);
  padding: var(--espacio-4) 0;
  border-bottom: 1px solid var(--borde);
}
.sp-section:first-child { padding-top: var(--espacio-3); }
.sp-section:last-child { border-bottom: none; }

.sp-section h2 {
  margin: 0;
  color: var(--texto-suave);
  font: 500 var(--texto-1)/1 system-ui, sans-serif;
  letter-spacing: .14em; text-transform: uppercase;
}
.sp-section p {
  margin: 0; color: var(--texto-suave);
  font: 300 var(--texto-3)/1.55 Spectral, 'Aureo Serif', Georgia, serif;
}

/* promesa */
.sp-promise {
  padding-left: var(--espacio-2);
  border-left: 1px solid rgba(201,168,106,.45);
  border-bottom: none;
  margin-bottom: var(--espacio-2);
}
.sp-promise p { color: var(--texto); }
.sp-gold { color: var(--oro) !important; font-style: italic; }

/* interruptor Lo que cuido */
.sp-toggle {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--espacio-3); width: 100%; min-height: var(--toque);
  padding: 0; border: 0; background: transparent; color: inherit;
  text-align: left; cursor: pointer;
}
.sp-toggle:focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 4px; border-radius: 4px; }
.sp-toggle-copy { display: grid; gap: .12rem; min-width: 0; }
.sp-toggle strong {
  font: 300 var(--texto-4)/1.2 Fraunces, 'Aureo Serif', Georgia, serif;
  color: var(--texto);
}
.sp-toggle small {
  color: var(--texto-suave);
  font: 300 var(--texto-2)/1.4 Spectral, 'Aureo Serif', Georgia, serif;
}

.sp-switch {
  display: flex; width: 2.6rem; height: 1.5rem; flex: 0 0 auto;
  align-items: center; padding: 2px;
  border: 1px solid rgba(201,168,106,.45); border-radius: var(--radio-pill);
  background: rgba(8,11,17,.6);
  transition: background-color var(--transicion), border-color var(--transicion);
}
.sp-switch i {
  width: 1.05rem; height: 1.05rem; border-radius: 50%;
  background: var(--texto-suave);
  transition: transform var(--transicion), background-color var(--transicion);
}
.sp-switch.on { border-color: var(--oro); background: rgba(201,168,106,.28); }
.sp-switch.on i { transform: translateX(1.05rem); background: var(--oro-claro); box-shadow: 0 0 10px rgba(201,168,106,.5); }

/* acciones de respaldo */
.sp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espacio-2); }
.sp-btn-primary, .sp-btn-quiet {
  min-height: var(--toque); border-radius: var(--radio-pill);
  font: 300 var(--texto-3)/1 Fraunces, 'Aureo Serif', Georgia, serif;
  cursor: pointer; transition: background-color var(--respuesta), border-color var(--respuesta);
}
.sp-btn-primary {
  border: 1px solid var(--oro); background: rgba(201,168,106,.14); color: var(--oro-claro);
}
.sp-btn-primary:hover { background: rgba(201,168,106,.22); }
.sp-btn-quiet {
  border: 1px solid var(--borde); background: transparent; color: var(--texto-suave);
}
.sp-btn-quiet:hover { border-color: var(--oro); color: var(--oro-claro); }
.sp-btn-primary:focus-visible, .sp-btn-quiet:focus-visible {
  outline: 2px solid var(--oro-claro); outline-offset: 2px;
}

/* despedida */
.sp-farewell { justify-items: start; gap: .3rem; padding-top: var(--espacio-4); }
.sp-danger {
  min-height: var(--toque); padding: 0; border: 0; background: none;
  color: var(--texto-suave);
  font: 300 var(--texto-2)/1 Spectral, 'Aureo Serif', Georgia, serif;
  text-decoration: underline; text-decoration-color: rgba(185,179,170,.4);
  text-underline-offset: 4px; cursor: pointer; transition: color var(--respuesta);
}
.sp-danger:hover { color: var(--peligro); text-decoration-color: var(--peligro); }
.sp-danger.armed { color: var(--peligro); font-weight: 600; text-decoration-color: var(--peligro); }
.sp-farewell small {
  color: var(--texto-suave);
  font: 300 var(--texto-1)/1.45 Spectral, 'Aureo Serif', Georgia, serif;
}

/* aviso */
.sp-notice {
  position: fixed; bottom: calc(var(--toque) + var(--espacio-3)); left: 50%;
  transform: translateX(-50%);
  padding: .5rem 1.1rem; border-radius: var(--radio-pill);
  background: rgba(201,168,106,.14); border: 1px solid rgba(201,168,106,.35);
  color: var(--oro-claro);
  font: italic 300 var(--texto-2)/1.35 Spectral, 'Aureo Serif', Georgia, serif;
  backdrop-filter: blur(8px);
  animation: sp-notice-in var(--dur-2) var(--ease-out) both;
}
@keyframes sp-notice-in { from { opacity: 0; transform: translateX(-50%) translateY(.5rem); } }

@media (prefers-reduced-motion: reduce) {
  .sp-aura { animation: none; }
  .sp-switch, .sp-switch i { transition-duration: 1ms; }
  .sp-notice { animation: none; }
}
</style>
