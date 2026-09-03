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
.settings-layer { position: fixed; z-index: 75; inset: 0; display: grid; align-items: end; justify-items: center; padding: .75rem; background: rgba(4, 6, 10, .62); }
.settings-sheet { position: relative; width: min(100%, 23.5rem); max-height: min(82svh, 32rem); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; border: 1px solid rgba(201,168,106,.3); border-radius: 1.05rem .85rem 1.25rem .9rem; background: radial-gradient(circle at 92% 0, rgba(201,168,106,.1), transparent 32%), #0d121b; box-shadow: 0 24px 70px rgba(0,0,0,.55); }
.settings-sheet::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 1px; background: linear-gradient(transparent, #c9a86a, transparent); }
.settings-sheet header { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; padding: .65rem .8rem .35rem; }
.settings-sheet h2 { margin: 0; color: #f4efe5; font: 300 1.02rem/1.15 Fraunces, 'Aureo Serif', Georgia, serif; letter-spacing: -.02em; }
.settings-sheet header p { margin: .06rem 0 0; color: #c9a86a; font: 300 .7rem/1.15 Spectral, 'Aureo Serif', Georgia, serif; }
.settings-sheet header > button { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; margin: -.4rem -.4rem 0 0; border: 0; background: transparent; color: #d8d1c6; cursor: pointer; }
.settings-sheet header > button svg { width: .92rem; }
.settings-sheet :is(button):focus-visible { outline: 2px solid #ead6a7; outline-offset: 2px; }
.settings-scroll { overflow: auto; padding: 0 .8rem .8rem; display: grid; gap: .45rem; }
.settings-sheet h3 { margin: 0 0 .15rem; color: #ead6a7; font: 300 .72rem/1.15 Fraunces, 'Aureo Serif', Georgia, serif; }
.settings-sheet p { margin: 0; color: #d8d1c6; font: 300 .74rem/1.32 Spectral, 'Aureo Serif', Georgia, serif; }
.promise { padding: .48rem .58rem .5rem; border: 1px solid rgba(201,168,106,.2); border-radius: .7rem .55rem .85rem .6rem; background: rgba(7,11,17,.45); }
.promise h3 { margin: 0 0 .2rem; }
.gold { margin-top: .28rem !important; color: #c9a86a !important; font-style: italic; font-size: .76rem; }
.space-toggle { display: flex; align-items: center; justify-content: space-between; gap: .55rem; width: 100%; min-height: 44px; padding: .22rem 0; border: 0; border-top: 1px solid rgba(201,168,106,.16); background: transparent; color: inherit; text-align: left; cursor: pointer; }
.space-toggle strong { display: block; font: 300 .84rem/1.15 Fraunces, 'Aureo Serif', Georgia, serif; color: #f4efe5; }
.space-toggle small { display: block; margin-top: .08rem; color: #b9b3aa; font: 300 .68rem/1.25 Spectral, 'Aureo Serif', Georgia, serif; }
.dot { width: .68rem; height: .68rem; flex: 0 0 auto; border: 1px solid rgba(201,168,106,.4); border-radius: 50%; }
.dot.on { background: #c9a86a; box-shadow: 0 0 10px rgba(201,168,106,.45); }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem; margin-top: .35rem; }
.actions button, .danger { min-height: 44px; border: 1px solid #c9a86a; border-radius: 999px; background: rgba(201,168,106,.12); color: #ead6a7; font: 300 .76rem/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; }
.quiet { background: transparent; }
.danger { width: 100%; margin-top: .3rem; border-color: rgba(184,109,93,.7); background: transparent; color: #f2aaa0; }
.notice { margin: 0; padding: .35rem .8rem .65rem; color: #ead6a7; font: 300 .74rem/1.25 Spectral, 'Aureo Serif', Georgia, serif; }
@media (min-width: 1024px) {
  .settings-layer { align-items: center; }
}
</style>
