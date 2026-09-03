<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { clearAureoData, exportBackup, importBackup } from '@/data/repositories'
import { useProfileStore } from '@/stores/profile'

const open = defineModel<boolean>('open', { default: false })
const profile = useProfileStore()
const notice = ref('')
const fileField = ref<HTMLInputElement | null>(null)
const careOn = computed(() => (profile.profile?.secciones_activas ?? []).includes('companeros') || (profile.profile?.secciones_activas ?? []).includes('plantas'))

function tell(message: string) {
  notice.value = message
  window.setTimeout(() => { if (notice.value === message) notice.value = '' }, 2800)
}

async function toggleCare() {
  const next = careOn.value ? [] : (['companeros', 'plantas'] as const)
  await profile.update({ secciones_activas: [...next] })
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

// La hoja recibe el foco al abrir: sin esto, Escape no llega a ningún oyente.
const sheet = ref<HTMLElement | null>(null)
watch(open, async (isOpen) => {
  if (!isOpen) {
    wipeArmed.value = false
    window.clearTimeout(wipeArmedTimer)
    return
  }
  await nextTick()
  sheet.value?.focus()
})

function onSheetKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.stopPropagation()
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="settings-layer" @click.self="open = false">
      <section
        ref="sheet"
        class="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aureo-settings-title"
        tabindex="-1"
        @keydown="onSheetKeydown"
      >
        <header>
          <div>
            <p class="settings-who">{{ profile.name || 'Tu espacio' }}</p>
            <h2 id="aureo-settings-title">Configuración de mi Áureo</h2>
          </div>
          <button type="button" class="settings-close" aria-label="Cerrar configuración" @click="open = false"><AppIcon name="close" /></button>
        </header>
        <div class="settings-scroll">
          <article class="promise">
            <h3>Mi promesa de privacidad</h3>
            <p>Tu universo vive solo en ti. Núcleo nunca sale de este dispositivo. Si eliminas la app, todo lo tuyo desaparece contigo.</p>
            <p class="gold">Esto no es una limitación. Es una promesa.</p>
          </article>
          <article>
            <h3>Tu espacio</h3>
            <button type="button" class="space-toggle" role="switch" :aria-checked="careOn" @click="toggleCare">
              <span class="space-copy">
                <strong>Lo que cuido</strong>
                <small>Compañeros y plantas. Podrás cambiarlo cuando quieras.</small>
              </span>
              <span class="switch" :class="{ on: careOn }" aria-hidden="true"><i /></span>
            </button>
          </article>
          <article>
            <h3>Tu respaldo</h3>
            <p>Exporta o restaura todos tus datos como un archivo. Es tu único respaldo en esta etapa local.</p>
            <div class="actions">
              <button type="button" class="primary" @click="saveCopy">Guardar copia</button>
              <button type="button" class="quiet" @click="fileField?.click()">Restaurar copia</button>
              <input ref="fileField" type="file" accept="application/json" hidden @change="restoreCopy" />
            </div>
          </article>
          <article class="settings-farewell">
            <button type="button" class="danger" :class="{ armed: wipeArmed }" @click="wipe">
              {{ wipeArmed ? 'Confirmar: borrar todo' : 'Borrar este Áureo' }}
            </button>
            <small>Borra todo lo que has guardado en este dispositivo. No se puede deshacer.</small>
          </article>
        </div>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-layer { position: fixed; z-index: 75; inset: 0; display: grid; align-items: end; justify-items: center; padding: var(--espacio-2); background: rgba(4, 6, 10, .68); backdrop-filter: blur(6px); animation: settings-veil var(--dur-2) var(--ease-out) both; }
.settings-sheet { position: relative; width: min(100%, 25rem); max-height: min(86svh, 36rem); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; border: 1px solid var(--borde); border-radius: var(--radio-organico-2); background: radial-gradient(circle at 92% 0, rgba(201,168,106,.1), transparent 34%), var(--surface-strong); box-shadow: 0 24px 70px rgba(0,0,0,.55); animation: settings-rise var(--capa) both; }
.settings-sheet:focus { outline: none; }
.settings-sheet::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 1px; background: linear-gradient(transparent, #c9a86a, transparent); }

.settings-sheet header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--espacio-2); padding: var(--espacio-3) var(--espacio-3) var(--espacio-2); }
.settings-who { margin: 0 0 .2rem; color: var(--oro); font: 500 var(--texto-1)/1 system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; }
.settings-sheet h2 { margin: 0; color: var(--texto); font: 300 var(--texto-5)/1.15 Fraunces, 'Aureo Serif', Georgia, serif; letter-spacing: -.02em; }
.settings-close { display: grid; width: var(--toque); height: var(--toque); flex: 0 0 auto; place-items: center; margin: -.55rem -.55rem 0 0; border: 0; border-radius: var(--radio-pill); background: transparent; color: var(--texto-suave); cursor: pointer; transition: color var(--respuesta), background-color var(--respuesta); }
.settings-close:hover { background: rgba(255,255,255,.05); color: var(--texto); }
.settings-close svg { width: .95rem; }
.settings-sheet :is(button):focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 2px; }

.settings-scroll { overflow: auto; padding: 0 var(--espacio-3) var(--espacio-3); display: grid; gap: var(--espacio-3); }
/* Etiqueta de sección en sans; el serif queda para lo que se lee, no para rotular. */
.settings-sheet h3 { margin: 0 0 var(--espacio-1); color: var(--texto-suave); font: 500 var(--texto-1)/1 system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; }
.settings-sheet p { margin: 0; color: var(--texto-suave); font: 300 var(--texto-2)/1.5 Spectral, 'Aureo Serif', Georgia, serif; }

/* La promesa se lee, no se enmarca: sin caja dentro de la caja. */
.promise { display: grid; gap: var(--espacio-1); padding-left: var(--espacio-2); border-left: 1px solid rgba(201,168,106,.45); }
.promise p { color: var(--texto); }
.gold { color: var(--oro) !important; font-style: italic; }

.space-toggle { display: flex; align-items: center; justify-content: space-between; gap: var(--espacio-3); width: 100%; min-height: var(--toque); padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.space-copy { display: grid; gap: .12rem; min-width: 0; }
.space-toggle strong { font: 300 var(--texto-4)/1.2 Fraunces, 'Aureo Serif', Georgia, serif; color: var(--texto); }
.space-toggle small { color: var(--texto-suave); font: 300 var(--texto-2)/1.4 Spectral, 'Aureo Serif', Georgia, serif; }
/* Un interruptor de verdad: el estado se lee sin adivinar. */
.switch { display: flex; width: 2.6rem; height: 1.5rem; flex: 0 0 auto; align-items: center; padding: 2px; border: 1px solid rgba(201,168,106,.45); border-radius: var(--radio-pill); background: rgba(8,11,17,.6); transition: background-color var(--transicion), border-color var(--transicion); }
.switch i { width: 1.05rem; height: 1.05rem; border-radius: 50%; background: var(--texto-suave); transition: transform var(--transicion), background-color var(--transicion); }
.switch.on { border-color: var(--oro); background: rgba(201,168,106,.28); }
.switch.on i { transform: translateX(1.05rem); background: var(--oro-claro); box-shadow: 0 0 10px rgba(201,168,106,.5); }

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espacio-2); margin-top: var(--espacio-2); }
.actions button { min-height: var(--toque); border: 1px solid var(--oro); border-radius: var(--radio-pill); background: rgba(201,168,106,.14); color: var(--oro-claro); font: 300 var(--texto-3)/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; transition: background-color var(--respuesta), border-color var(--respuesta); }
.actions button:hover { background: rgba(201,168,106,.22); }
.quiet { border-color: var(--borde) !important; background: transparent !important; color: var(--texto-suave) !important; }
.quiet:hover { border-color: var(--oro) !important; color: var(--oro-claro) !important; }

/* Lo irreversible no compite con lo seguro: sin cápsula, sin ancho completo, y al final. */
.settings-farewell { display: grid; justify-items: start; gap: .3rem; padding-top: var(--espacio-3); border-top: 1px solid var(--borde); }
.danger { min-height: var(--toque); padding: 0; border: 0; background: none; color: var(--texto-suave); font: 300 var(--texto-2)/1 Spectral, 'Aureo Serif', Georgia, serif; text-decoration: underline; text-decoration-color: rgba(185,179,170,.4); text-underline-offset: 4px; cursor: pointer; transition: color var(--respuesta); }
.danger:hover { color: var(--peligro); text-decoration-color: var(--peligro); }
.danger.armed { color: var(--peligro); font-weight: 600; text-decoration-color: var(--peligro); }
.settings-farewell small { color: var(--texto-suave); font: 300 var(--texto-1)/1.45 Spectral, 'Aureo Serif', Georgia, serif; }

.notice { margin: 0; padding: var(--espacio-2) var(--espacio-3) var(--espacio-3); color: var(--oro-claro); font: italic 300 var(--texto-2)/1.35 Spectral, 'Aureo Serif', Georgia, serif; }

@keyframes settings-veil { from { opacity: 0; } }
@keyframes settings-rise { from { opacity: 0; transform: translateY(1.25rem); } }
@media (min-width: 1024px) {
  .settings-layer { align-items: center; }
  @keyframes settings-rise { from { opacity: 0; transform: translateY(.6rem) scale(.985); } }
}
@media (prefers-reduced-motion: reduce) {
  .settings-layer, .settings-sheet { animation: none; }
  .switch, .switch i { transition-duration: 1ms; }
}
</style>
