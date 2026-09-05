<script setup lang="ts">
// Adapted from React Bits / Vue Bits Blur Text, without motion/motion-v:
// word-by-word blur and a short descent. Slower than --ease-out so the landing does not snap.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  delay?: number
  animateBy?: 'words' | 'letters'
  direction?: 'top' | 'bottom'
  stepDuration?: number
  threshold?: number
  rootMargin?: string
}>(), {
  delay: 160,
  animateBy: 'words',
  direction: 'top',
  stepDuration: 0.65,
  threshold: 0.1,
  rootMargin: '0px',
})

const root = ref<HTMLElement | null>(null)
const inView = ref(false)
let observer: IntersectionObserver | undefined

const segments = computed(() => (props.animateBy === 'letters' ? props.text.split('') : props.text.split(' ')))
const durationMs = computed(() => Math.round(props.stepDuration * 2 * 1000))

onMounted(async () => {
  await nextTick()
  const el = root.value
  if (!el) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    inView.value = true
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    inView.value = true
    observer?.disconnect()
  }, { threshold: props.threshold, rootMargin: props.rootMargin })
  observer.observe(el)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <h1
    ref="root"
    class="blur-text"
    :class="{ 'is-in': inView, 'from-bottom': direction === 'bottom' }"
  >
    <span
      v-for="(segment, index) in segments"
      :key="`${text}-${index}`"
      :style="{ '--blur-delay': `${index * delay}ms`, '--blur-duration': `${durationMs}ms` }"
    >{{ segment === ' ' ? '\u00A0' : segment }}<template v-if="animateBy === 'words' && index < segments.length - 1">&nbsp;</template></span>
  </h1>
</template>

<style scoped>
.blur-text {
  display: block;
  margin: 0;
}
.blur-text > span {
  display: inline-block;
  vertical-align: baseline;
  opacity: 0;
  transform: translateY(-0.4em);
}
.blur-text.from-bottom > span { transform: translateY(0.4em); }
.blur-text.is-in > span {
  animation: blur-text-from-top var(--blur-duration) cubic-bezier(.22, .68, .36, 1) var(--blur-delay) forwards;
}
.blur-text.is-in.from-bottom > span {
  animation-name: blur-text-from-bottom;
}
@keyframes blur-text-from-top {
  0% { filter: blur(12px); opacity: 0; transform: translateY(-0.4em); }
  58% { filter: none; opacity: 1; transform: translateY(-0.05em); }
  100% { filter: none; opacity: 1; transform: none; }
}
@keyframes blur-text-from-bottom {
  0% { filter: blur(12px); opacity: 0; transform: translateY(0.4em); }
  58% { filter: none; opacity: 1; transform: translateY(0.05em); }
  100% { filter: none; opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .blur-text > span,
  .blur-text.is-in > span,
  .blur-text.is-in.from-bottom > span {
    animation: none;
    filter: none;
    opacity: 1;
    transform: none;
  }
}
</style>
