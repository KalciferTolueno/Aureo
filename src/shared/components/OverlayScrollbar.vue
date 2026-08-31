<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const track = ref<HTMLElement | null>(null)
const visible = ref(false)
const thumbTop = ref(0)
const thumbHeight = ref(36)
const dragging = ref(false)
let dragOffset = 0
let frame = 0
let resizeObserver: ResizeObserver | undefined

function refresh() {
  const root = document.documentElement
  const view = root.clientHeight
  const total = root.scrollHeight
  const overflow = total - view
  const trackHeight = track.value?.clientHeight ?? view
  if (overflow <= 1) {
    visible.value = false
    return
  }
  const height = Math.max(36, (view / total) * trackHeight)
  const maxThumb = Math.max(1, trackHeight - height)
  thumbHeight.value = height
  thumbTop.value = (root.scrollTop / overflow) * maxThumb
  visible.value = true
}

function scheduleRefresh() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(refresh)
}

function scrollToRatio(ratio: number) {
  const root = document.documentElement
  const overflow = root.scrollHeight - root.clientHeight
  root.scrollTop = Math.min(1, Math.max(0, ratio)) * Math.max(0, overflow)
}

function onThumbPointerDown(event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  dragging.value = true
  dragOffset = event.clientY - (event.currentTarget as HTMLElement).getBoundingClientRect().top
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onThumbPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const trackHeight = track.value?.clientHeight ?? document.documentElement.clientHeight
  const y = event.clientY - (track.value?.getBoundingClientRect().top ?? 0) - dragOffset
  scrollToRatio(y / Math.max(1, trackHeight - thumbHeight.value))
}

function onThumbPointerUp(event: PointerEvent) {
  dragging.value = false
  try { (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId) } catch { /* already released */ }
}

onMounted(async () => {
  await nextTick()
  refresh()
  window.addEventListener('scroll', scheduleRefresh, { passive: true })
  window.addEventListener('resize', scheduleRefresh)
  resizeObserver = new ResizeObserver(scheduleRefresh)
  resizeObserver.observe(document.documentElement)
  resizeObserver.observe(document.body)
  const main = document.getElementById('main-content')
  if (main) resizeObserver.observe(main)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', scheduleRefresh)
  window.removeEventListener('resize', scheduleRefresh)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="track"
    class="overlay-scrollbar"
    :class="{ visible, dragging }"
    aria-hidden="true"
  >
    <div
      class="overlay-scrollbar-thumb"
      :style="{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }"
      @pointerdown="onThumbPointerDown"
      @pointermove="onThumbPointerMove"
      @pointerup="onThumbPointerUp"
      @pointercancel="onThumbPointerUp"
    />
  </div>
</template>

<style scoped>
.overlay-scrollbar {
  position: fixed;
  z-index: 55;
  top: .4rem;
  right: 0;
  bottom: .4rem;
  width: 12px;
  pointer-events: none;
  opacity: 0;
}
.overlay-scrollbar.visible { opacity: 1; }
.overlay-scrollbar-thumb {
  position: absolute;
  top: 0;
  right: 3px;
  width: 5px;
  border-radius: 999px;
  background: rgba(201,168,106,.48);
  box-shadow: 0 0 10px rgba(8,11,17,.35);
  pointer-events: none;
  touch-action: none;
  cursor: grab;
}
.overlay-scrollbar.visible .overlay-scrollbar-thumb { pointer-events: auto; }
.overlay-scrollbar.dragging .overlay-scrollbar-thumb,
.overlay-scrollbar.visible .overlay-scrollbar-thumb:hover { background: rgba(201,168,106,.72); }
.overlay-scrollbar.dragging .overlay-scrollbar-thumb { cursor: grabbing; }
@media (max-width: 1023px) {
  .overlay-scrollbar { bottom: calc(4.15rem + env(safe-area-inset-bottom, 0px)); }
}
@media (prefers-reduced-motion: reduce) {
  .overlay-scrollbar-thumb { transition: none; }
}
</style>
