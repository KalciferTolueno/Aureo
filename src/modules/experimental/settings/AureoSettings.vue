<script setup lang="ts">
import { computed, ref } from 'vue'
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

async function wipe() {
  if (!wipeArmed.value) {
    wipeArmed.value = true
    tell('Toca otra vez para borrar este Áureo.')
    return
  }
  await clearAureoData()
  window.location.reload()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="settings-layer" role="presentation" @click.self="open = false" @keydown.esc.stop="open = false">
      <section class="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="aureo-settings-title">
        <header>
          <div>
            <h2 id="aureo-settings-title">Configuración de mi Áureo</h2>
            <p>{{ profile.name || 'Tu espacio' }}</p>
          </div>
          <button type="button" aria-label="Cerrar configuración" @click="open = false"><AppIcon name="close" /></button>
        </header>
        <div class="settings-scroll">
          <article class="promise">
            <h3>Mi promesa de privacidad</h3>
            <p>Tu universo vive solo en ti. Núcleo nunca sale de este dispositivo. Si eliminas la app, todo lo tuyo desaparece contigo.</p>
            <p class="gold">Esto no es una limitación. Es una promesa.</p>
          </article>
          <article>
            <h3>Tu espacio</h3>
            <button type="button" class="space-toggle" :aria-pressed="careOn" @click="toggleCare">
              <span>
                <strong>Lo que cuido</strong>
                <small>Compañeros y plantas. Podrás cambiarlo cuando quieras.</small>
              </span>
              <span class="dot" :class="{ on: careOn }" />
            </button>
          </article>
          <article>
            <h3>Tu respaldo</h3>
            <p>Exporta o restaura todos tus datos como un archivo. Es tu único respaldo en esta etapa local.</p>
            <div class="actions">
              <button type="button" @click="saveCopy">Guardar copia</button>
              <button type="button" class="quiet" @click="fileField?.click()">Restaurar copia</button>
              <input ref="fileField" type="file" accept="application/json" hidden @change="restoreCopy" />
            </div>
            <button type="button" class="danger" @click="wipe">Borrar este Áureo</button>
          </article>
        </div>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-layer { position: fixed; z-index: 75; inset: 0; display: grid; align-items: end; justify-items: center; padding: 1rem; background: rgba(4, 6, 10, .55); }
.settings-sheet { position: relative; width: min(100%, 28rem); max-height: min(88svh, 42rem); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; border: 1px solid rgba(201,168,106,.28); border-radius: 1.7rem 1.2rem 2.2rem 1.2rem / 1.3rem 1.8rem 1.1rem 1.8rem; background: linear-gradient(160deg, rgba(18,24,36,.97), rgba(8,11,17,.96)); box-shadow: 0 24px 70px rgba(0,0,0,.48); }
.settings-sheet header { display: flex; justify-content: space-between; gap: 1rem; padding: 1.2rem 1.2rem .8rem; }
.settings-sheet h2 { margin: 0; color: #f4efe5; font: 300 1.55rem/1.1 Fraunces, 'Aureo Serif', Georgia, serif; }
.settings-sheet header p { margin: .35rem 0 0; color: #c9a86a; font: 300 .9rem/1 Spectral, 'Aureo Serif', Georgia, serif; }
.settings-sheet header > button { width: 44px; height: 44px; border: 0; background: transparent; color: #d8d1c6; cursor: pointer; }
.settings-scroll { overflow: auto; padding: 0 1.2rem 1.4rem; display: grid; gap: 1.15rem; }
.settings-scroll::after { content: ''; position: sticky; bottom: 0; display: block; height: 1.6rem; margin: 0 -1.2rem -1.4rem; pointer-events: none; background: linear-gradient(transparent, #080b11); }
.settings-sheet h3 { margin: 0 0 .55rem; color: #ead6a7; font: 300 1.05rem/1.2 Fraunces, 'Aureo Serif', Georgia, serif; }
.settings-sheet p { margin: 0; color: #d8d1c6; font: 300 .92rem/1.55 Spectral, 'Aureo Serif', Georgia, serif; }
.promise { padding: 1rem 1rem 1.1rem; border: 1px solid rgba(201,168,106,.22); border-radius: 1.2rem; }
.gold { margin-top: .8rem !important; color: #c9a86a !important; }
.space-toggle { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; min-height: 52px; padding: .7rem 0; border: 0; border-top: 1px solid rgba(201,168,106,.16); background: transparent; color: inherit; text-align: left; cursor: pointer; }
.space-toggle strong { display: block; font: 300 1rem/1.2 Fraunces, 'Aureo Serif', Georgia, serif; color: #f4efe5; }
.space-toggle small { display: block; margin-top: .2rem; color: #b9b3aa; font: 300 .82rem/1.35 Spectral, 'Aureo Serif', Georgia, serif; }
.dot { width: .85rem; height: .85rem; border: 1px solid rgba(201,168,106,.4); border-radius: 50%; }
.dot.on { background: #c9a86a; box-shadow: 0 0 10px rgba(201,168,106,.45); }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; margin-top: .85rem; }
.actions button, .danger { min-height: 44px; border: 1px solid #c9a86a; border-radius: 999px; background: rgba(201,168,106,.12); color: #ead6a7; font: 300 .88rem/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; }
.quiet { background: transparent; }
.danger { width: 100%; margin-top: .65rem; border-color: rgba(184,109,93,.7); background: transparent; color: #f2aaa0; }
.notice { margin: 0; padding: .7rem 1.2rem 1rem; color: #ead6a7; font: 300 .88rem/1.3 Spectral, 'Aureo Serif', Georgia, serif; }
@media (min-width: 1024px) {
  .settings-layer { align-items: center; }
}
</style>
