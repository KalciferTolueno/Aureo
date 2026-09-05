<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps<{ visible: boolean; step: 'write' | 'classify' }>()
const open = defineModel<boolean>('open', { default: false })
const text = defineModel<string>('text', { default: '' })
const emit = defineEmits<{ submit: []; classify: ['hoy' | 'guardar'] }>()
const field = ref<HTMLTextAreaElement | null>(null)
const canSeal = computed(() => Boolean(text.value.trim()))

watch(() => props.visible && open.value && props.step === 'write', async (shouldFocus) => {
  if (!shouldFocus) return
  await nextTick()
  field.value?.focus()
})

function close() {
  open.value = false
}
</script>

<template>
  <Transition name="fab-slot">
    <div v-if="visible" class="capture-seal">
      <button type="button" class="capture-seal-trigger" :aria-expanded="open" aria-controls="aureo-capture-panel" aria-label="Capturar un destello" @click="open = !open">
        <span aria-hidden="true" />
      </button>
      <Teleport to="body">
        <Transition name="capture-seal">
          <div v-if="open" class="capture-seal-layer" role="presentation" @click.self="close" @keydown.esc.stop="close">
            <section id="aureo-capture-panel" class="capture-seal-panel" role="dialog" aria-modal="true" aria-labelledby="aureo-capture-title" tabindex="-1" @keydown.esc.stop="close">
              <header>
                <h2 id="aureo-capture-title">{{ step === 'classify' ? '¿Para hoy o para guardar?' : 'Un destello' }}</h2>
                <button type="button" aria-label="Cerrar captura" @click="close"><AppIcon name="close" /></button>
              </header>
              <form v-if="step === 'write'" class="capture-seal-form" @submit.prevent="emit('submit')">
                <label class="capture-seal-field" for="aureo-capture-text">
                  <span>Lo que aparece ahora</span>
                  <textarea id="aureo-capture-text" ref="field" v-model="text" rows="4" maxlength="400" placeholder="una palabra, una imagen, una sensación..." />
                </label>
                <button type="submit" :disabled="!canSeal">Sellar</button>
              </form>
              <div v-else class="capture-seal-choice">
                <blockquote>{{ text }}</blockquote>
                <div>
                  <button type="button" @click="emit('classify', 'hoy')">Para hoy</button>
                  <button type="button" class="quiet" @click="emit('classify', 'guardar')">Para guardar</button>
                </div>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>
    </div>
  </Transition>
</template>

<style scoped>
.capture-seal { position: fixed; z-index: 45; right: max(1rem, env(safe-area-inset-right)); bottom: calc(6rem + env(safe-area-inset-bottom)); }
.capture-seal-trigger { display: grid; width: 48px; height: 48px; place-items: center; border: 1px solid rgba(201, 168, 106, .55); border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(234, 214, 167, .28), #080b11 72%); color: #ead6a7; box-shadow: 0 16px 36px rgba(0, 0, 0, .38); cursor: pointer; }
.capture-seal-trigger span { width: 14px; height: 14px; border: 1px solid #c9a86a; border-radius: 50%; box-shadow: inset 0 0 0 3px #080b11, 0 0 10px rgba(201, 168, 106, .45); background: #c9a86a; }
.capture-seal-layer { position: fixed; z-index: 70; inset: 0; display: grid; align-items: end; justify-items: end; padding: 1rem 1rem calc(6.05rem + env(safe-area-inset-bottom)); background: rgba(4, 6, 10, .7); backdrop-filter: blur(6px); }
.capture-seal-panel { position: relative; width: min(100%, 21.5rem); overflow: hidden; padding: 1.15rem 1.2rem 1.25rem 1.5rem; border: 0; border-radius: var(--radio-organico-3); outline: 0; background: radial-gradient(ellipse 92% 86% at 38% 28%, color-mix(in srgb, var(--oro) 18%, rgba(14, 20, 30, .55)), transparent 72%), #0c1118; box-shadow: inset 0 0 52px rgba(0, 0, 0, .4), 0 24px 70px rgba(0, 0, 0, .55); }
.capture-seal-panel::before { content: ''; position: absolute; left: .85rem; top: 1.2rem; bottom: 1.2rem; width: 1px; border-radius: var(--radio-pill); background: linear-gradient(transparent, #c9a86a, transparent); box-shadow: 0 0 12px color-mix(in srgb, var(--oro) 42%, transparent); }
.capture-seal-panel header { display: flex; align-items: start; justify-content: space-between; gap: .75rem; margin-bottom: .35rem; }
.capture-seal-panel h2 { position: relative; margin: 0; padding: .05rem 0 .95rem; color: #f4efe5; font: 200 var(--texto-6)/1.05 Fraunces, 'Aureo Serif', Georgia, serif; letter-spacing: -.03em; }
.capture-seal-panel h2::before { content: ''; position: absolute; left: 0; bottom: 2px; width: 8px; height: 8px; border-radius: 50%; background: var(--oro-claro, #ead6a7); box-shadow: 0 0 0 4px #080b11, 0 0 0 5px color-mix(in srgb, var(--oro) 70%, #ead6a7), 0 0 14px color-mix(in srgb, var(--oro) 55%, transparent); }
.capture-seal-panel h2::after { content: ''; position: absolute; left: 0; bottom: 5px; width: min(42%, 8.5rem); height: 1px; background: linear-gradient(90deg, var(--oro) 0 42%, transparent); }
.capture-seal-panel header > button { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; margin: -.35rem -.4rem 0 0; border: 0; background: transparent; color: #d8d1c6; cursor: pointer; }
.capture-seal-panel header > button svg { width: 1rem; }
.capture-seal-panel :is(button, textarea):focus-visible { outline: 2px solid #ead6a7; outline-offset: 2px; }
.capture-seal-form { display: grid; gap: .7rem; }
/* Un solo marco: el panel. El campo se apoya en una línea inferior, como en Umbral,
   para que el borde del textarea deje de ser la línea más fuerte de la pantalla. */
.capture-seal-field { display: grid; gap: .35rem; min-width: 0; }
.capture-seal-field span { color: var(--texto-suave); font: italic 300 var(--texto-2)/1.35 Spectral, Georgia, serif; }
.capture-seal-field textarea { width: 100%; min-height: 5rem; box-sizing: border-box; resize: none; padding: .1rem 0 .5rem; border: 0; border-bottom: 1px solid var(--borde); border-radius: 0; outline: 0; background: transparent; color: #f4efe5; font: 300 var(--texto-4)/1.5 Spectral, 'Aureo Serif', Georgia, serif; caret-color: #ead6a7; transition: border-color var(--transicion); }
.capture-seal-field textarea::placeholder { color: var(--texto-placeholder); }
.capture-seal-field:focus-within textarea { border-bottom-color: var(--oro-claro); border-bottom-width: 2px; padding-bottom: calc(.5rem - 1px); }
.capture-seal-form > button, .capture-seal-choice button { min-height: 44px; border: 1px solid #c9a86a; border-radius: var(--radio-pill); background: rgba(201, 168, 106, .16); color: #ead6a7; font: 300 var(--texto-3)/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; }
.capture-seal-form > button:is(:hover, :focus-visible) { background: rgba(201, 168, 106, .24); }
.capture-seal-form > button:disabled { cursor: not-allowed; opacity: .42; background: transparent; }
.capture-seal-choice { display: grid; gap: .85rem; }
.capture-seal-choice blockquote { margin: 0; padding: .1rem 0 .1rem .85rem; border-left: 1px solid rgba(201, 168, 106, .5); color: #ead6a7; font: italic 300 var(--texto-4)/1.5 Spectral, 'Aureo Serif', Georgia, serif; }
.capture-seal-choice > div { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; }
.capture-seal-choice button.quiet { border-color: rgba(201, 168, 106, .32); background: transparent; color: #d8d1c6; }
.capture-seal-enter-active, .capture-seal-leave-active { transition: opacity var(--dur-2) ease; }
.capture-seal-enter-active .capture-seal-panel, .capture-seal-leave-active .capture-seal-panel { transition: transform var(--dur-2) cubic-bezier(.16, 1, .3, 1); }
.capture-seal-enter-from, .capture-seal-leave-to { opacity: 0; }
.capture-seal-enter-from .capture-seal-panel, .capture-seal-leave-to .capture-seal-panel { transform: translateY(.8rem); }
.fab-slot-enter-active, .fab-slot-leave-active { transition: opacity var(--dur-4) var(--ease-in-out), transform var(--dur-4) var(--ease-in-out); }
.fab-slot-leave-active { pointer-events: none; }
.fab-slot-enter-from, .fab-slot-leave-to { opacity: 0; transform: scale(.88); }
@media (min-width: 1024px) {
  .capture-seal { bottom: 2rem; }
  .capture-seal-layer { align-items: center; justify-items: center; padding: 2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .capture-seal-enter-active, .capture-seal-leave-active, .capture-seal-enter-active .capture-seal-panel, .capture-seal-leave-active .capture-seal-panel, .fab-slot-enter-active, .fab-slot-leave-active { transition-duration: 1ms; }
}
</style>
