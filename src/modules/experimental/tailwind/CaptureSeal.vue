<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps<{ visible: boolean; step: 'write' | 'classify' }>()
const open = defineModel<boolean>('open', { default: false })
const text = defineModel<string>('text', { default: '' })
const emit = defineEmits<{ submit: []; classify: ['hoy' | 'guardar'] }>()
const field = ref<HTMLTextAreaElement | null>(null)

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
              <label for="aureo-capture-text">Lo que aparece ahora</label>
              <textarea id="aureo-capture-text" ref="field" v-model="text" rows="3" maxlength="400" placeholder="una palabra, una imagen, una sensación..." />
              <button v-if="text.trim()" type="submit">Sellar</button>
            </form>
            <div v-else class="capture-seal-choice">
              <p>{{ text }}</p>
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
.capture-seal-layer { position: fixed; z-index: 70; inset: 0; display: grid; align-items: end; justify-items: end; padding: 1rem 1rem calc(6.05rem + env(safe-area-inset-bottom)); background: rgba(4, 6, 10, .46); }
.capture-seal-panel { width: min(100%, 22.5rem); padding: 1.15rem 1.2rem 1.25rem; border: 1px solid rgba(201, 168, 106, .28); border-radius: 1.6rem 1.1rem 2.2rem 1.2rem / 1.2rem 1.8rem 1.1rem 1.7rem; outline: 0; background: linear-gradient(145deg, rgba(18, 24, 36, .96), rgba(8, 11, 17, .94)); box-shadow: 0 24px 70px rgba(0, 0, 0, .48); }
.capture-seal-panel header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.capture-seal-panel h2 { margin: 0; color: #f4efe5; font: 300 1.45rem/1.1 Georgia, 'Times New Roman', serif; }
.capture-seal-panel header > button { display: grid; width: 44px; height: 44px; place-items: center; margin: -.55rem -.45rem 0 0; border: 0; background: transparent; color: #d8d1c6; cursor: pointer; }
.capture-seal-panel header > button svg { width: 1rem; }
.capture-seal-form { display: grid; gap: .7rem; }
.capture-seal-form label { color: #b9b3aa; font: 300 .82rem/1.35 Georgia, 'Times New Roman', serif; }
.capture-seal-form textarea { width: 100%; min-height: 6.5rem; box-sizing: border-box; resize: vertical; padding: .7rem .1rem; border: 0; border-bottom: 1px solid rgba(201, 168, 106, .4); border-radius: 0; outline: 0; background: transparent; color: #f4efe5; font: 1.05rem/1.55 Georgia, 'Times New Roman', serif; caret-color: #ead6a7; }
.capture-seal-form textarea:focus { border-bottom-color: #ead6a7; }
.capture-seal-form button, .capture-seal-choice button { min-height: 44px; border: 1px solid #c9a86a; border-radius: 999px; background: rgba(201, 168, 106, .14); color: #ead6a7; font: 300 .92rem/1 Georgia, 'Times New Roman', serif; cursor: pointer; }
.capture-seal-choice { display: grid; gap: 1rem; }
.capture-seal-choice p { margin: 0; color: #ead6a7; font: 300 1.05rem/1.5 Georgia, 'Times New Roman', serif; }
.capture-seal-choice > div { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
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
