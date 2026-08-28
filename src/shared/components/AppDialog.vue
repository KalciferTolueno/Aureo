<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ open: boolean; title: string; returnFocus?: HTMLElement | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement | null>(null)
const titleId = `dialog-title-${useId()}`
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
const focusable = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function close() { emit('close') }
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); close(); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const elements = [...dialog.value.querySelectorAll<HTMLElement>(focusable)]
  if (!elements.length) { event.preventDefault(); dialog.value.focus(); return }
  const first = elements[0]!
  const last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
function release() {
  document.removeEventListener('keydown', onKeydown)
  document.querySelector<HTMLElement>('#app')?.removeAttribute('inert')
  document.body.style.overflow = previousOverflow
}
async function restoreFocus() {
  await nextTick()
  const target = props.returnFocus ?? previousFocus
  if (target?.isConnected) target.focus({ preventScroll: true })
}
watch(() => props.open, async (open) => {
  if (open) {
    previousFocus = props.returnFocus ?? document.activeElement as HTMLElement | null
    previousOverflow = document.body.style.overflow
    document.querySelector<HTMLElement>('#app')?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    const target = dialog.value?.querySelector<HTMLElement>('input[required]:not([disabled]), textarea[required]:not([disabled]), select[required]:not([disabled])') ?? dialog.value?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])') ?? dialog.value?.querySelector<HTMLElement>(focusable) ?? dialog.value
    target?.focus()
  } else {
    release()
  }
})
onBeforeUnmount(release)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade" @after-leave="restoreFocus">
      <div v-if="open" class="dialog-backdrop" role="presentation" @click.self="close">
        <section ref="dialog" class="dialog-card" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
          <header><h2 :id="titleId">{{ title }}</h2><button class="icon-button" type="button" aria-label="Cerrar" @click="close"><AppIcon name="close" /></button></header>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
