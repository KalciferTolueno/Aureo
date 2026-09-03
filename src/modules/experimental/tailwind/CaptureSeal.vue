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
  <div v-if="visible" class="capture-seal">
    <button type="button" class="capture-seal-trigger" :aria-expanded="open" aria-controls="aureo-capture-panel" aria-label="Capturar un destello" @click="open = !open">
      <span aria-hidden="true" />
    </button>
    <Teleport to="body">
      <Transition name="capture-seal">
        <div v-if="open" class="capture-seal-layer" role="presentation" @click.self="close" @keydown.esc.stop="close">
          <section id="aureo-capture-panel" class="capture-seal-panel" role="dialog" aria-modal="true" aria-labelledby="aureo-capture-title">
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
</template>

<style scoped>
.capture-seal { position: fixed; z-index: 45; right: max(1rem, env(safe-area-inset-right)); bottom: calc(6rem + env(safe-area-inset-bottom)); }
.capture-seal-trigger { display: grid; width: 48px; height: 48px; place-items: center; border: 1px solid rgba(201, 168, 106, .55); border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(234, 214, 167, .28), #080b11 72%); color: #ead6a7; box-shadow: 0 16px 36px rgba(0, 0, 0, .38); cursor: pointer; }
.capture-seal-trigger span { width: 14px; height: 14px; border: 1px solid #c9a86a; border-radius: 50%; box-shadow: inset 0 0 0 3px #080b11, 0 0 10px rgba(201, 168, 106, .45); background: #c9a86a; }
.capture-seal-layer { position: fixed; z-index: 70; inset: 0; display: grid; align-items: end; justify-items: end; padding: 1rem 1rem calc(6.05rem + env(safe-area-inset-bottom)); background: rgba(4, 6, 10, .62); }
.capture-seal-panel { position: relative; width: min(100%, 21.5rem); overflow: hidden; padding: 1rem 1.05rem 1.05rem; border: 1px solid rgba(201, 168, 106, .32); border-radius: 1.35rem 1rem 1.75rem 1.1rem; outline: 0; background: radial-gradient(circle at 88% 0, rgba(201, 168, 106, .12), transparent 34%), #0d121b; box-shadow: 0 24px 70px rgba(0, 0, 0, .55); }
.capture-seal-panel::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 1px; background: linear-gradient(transparent, #c9a86a, transparent); }
.capture-seal-panel header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: .75rem; }
.capture-seal-panel h2 { margin: 0; color: #f4efe5; font: 300 1.22rem/1.1 Fraunces, 'Aureo Serif', Georgia, serif; letter-spacing: -.02em; }
.capture-seal-panel header > button { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; margin: -.35rem -.4rem 0 0; border: 0; background: transparent; color: #d8d1c6; cursor: pointer; }
.capture-seal-panel header > button svg { width: 1rem; }
.capture-seal-panel :is(button, textarea):focus-visible { outline: 2px solid #ead6a7; outline-offset: 2px; }
.capture-seal-form { display: grid; gap: .7rem; }
.capture-seal-field { display: grid; gap: .4rem; min-width: 0; padding: .7rem .85rem .75rem; border: 1px solid rgba(201, 168, 106, .28); border-radius: 1.05rem .8rem 1.25rem .85rem; background: rgba(7, 11, 17, .72); }
.capture-seal-field span { color: #c9c1b5; font: 300 .76rem/1.3 Spectral, 'Aureo Serif', Georgia, serif; }
.capture-seal-field textarea { width: 100%; min-height: 5rem; box-sizing: border-box; resize: none; padding: 0; border: 0; border-radius: 0; outline: 0; background: transparent; color: #f4efe5; font: 300 1rem/1.5 Spectral, 'Aureo Serif', Georgia, serif; caret-color: #ead6a7; }
.capture-seal-field textarea::placeholder { color: #8f877d; }
.capture-seal-field:focus-within { border-color: rgba(234, 214, 167, .72); box-shadow: inset 0 0 0 1px rgba(201, 168, 106, .16); }
.capture-seal-form > button, .capture-seal-choice button { min-height: 44px; border: 1px solid #c9a86a; border-radius: 999px; background: rgba(201, 168, 106, .16); color: #ead6a7; font: 300 .9rem/1 Fraunces, 'Aureo Serif', Georgia, serif; cursor: pointer; }
.capture-seal-form > button:is(:hover, :focus-visible) { background: rgba(201, 168, 106, .24); }
.capture-seal-form > button:disabled { cursor: not-allowed; opacity: .42; background: transparent; }
.capture-seal-choice { display: grid; gap: .85rem; }
.capture-seal-choice blockquote { margin: 0; padding: .8rem .9rem; border: 1px solid rgba(201, 168, 106, .22); border-radius: 1.05rem .8rem 1.25rem .85rem; background: rgba(7, 11, 17, .72); color: #ead6a7; font: italic 300 1rem/1.5 Spectral, 'Aureo Serif', Georgia, serif; }
.capture-seal-choice > div { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; }
.capture-seal-choice button.quiet { border-color: rgba(201, 168, 106, .32); background: transparent; color: #d8d1c6; }
.capture-seal-enter-active, .capture-seal-leave-active { transition: opacity 180ms ease; }
.capture-seal-enter-active .capture-seal-panel, .capture-seal-leave-active .capture-seal-panel { transition: transform 280ms cubic-bezier(.16, 1, .3, 1); }
.capture-seal-enter-from, .capture-seal-leave-to { opacity: 0; }
.capture-seal-enter-from .capture-seal-panel, .capture-seal-leave-to .capture-seal-panel { transform: translateY(.8rem); }
@media (min-width: 1024px) {
  .capture-seal { bottom: 2rem; }
  .capture-seal-layer { align-items: center; justify-items: center; padding: 2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .capture-seal-enter-active, .capture-seal-leave-active, .capture-seal-enter-active .capture-seal-panel, .capture-seal-leave-active .capture-seal-panel { transition-duration: 1ms; }
}
</style>
