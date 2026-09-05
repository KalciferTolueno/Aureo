<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import type { Hobby } from '@/domain/types'
import { hobbyMoments, hobbySpiralPath, hobbySpiralSparks, sortHobbiesByLastMoment } from '@/domain/mundos'

const props = defineProps<{ hobbies: Hobby[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string | null] }>()

const ordered = computed(() => sortHobbiesByLastMoment(props.hobbies))
const arm = hobbySpiralPath()
function sparksFor(hobby: Hobby) {
  return hobbySpiralSparks(hobbyMoments(hobby).length)
}

watch(() => props.selectedId, async (id) => {
  if (!id) return
  await nextTick()
  const form = document.querySelector(`#hobby-item-${id} .hobby-moment-slot`)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  form?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
})
</script>

<template>
  <section class="hobby-garden" aria-label="Espirales de hobbies">
    <p class="hobby-editorial">Lo que te devuelve a ti — ya sea viviéndolo, o extrañándolo.</p>
    <ul v-if="ordered.length" class="hobby-spiral-row" :class="{ 'is-solo': ordered.length === 1, 'is-pair': ordered.length === 2 }">
      <li v-for="hobby in ordered" :id="`hobby-item-${hobby.id}`" :key="hobby.id" :class="{ selected: selectedId === hobby.id }">
        <button
          type="button"
          class="hobby-spiral"
          :class="{ active: selectedId === hobby.id }"
          :aria-pressed="selectedId === hobby.id"
          :aria-label="`${hobby.nombre}, ${hobbyMoments(hobby).length} momentos`"
          @click="emit('select', selectedId === hobby.id ? null : hobby.id)"
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient :id="`hobby-filament-${hobby.id}`" x1="22%" y1="78%" x2="86%" y2="18%">
                <stop offset="0" stop-color="#c9a86a" stop-opacity=".2" />
                <stop offset=".5" stop-color="#ead6a7" stop-opacity=".95" />
                <stop offset="1" stop-color="#fff4c9" />
              </linearGradient>
              <filter :id="`hobby-glow-${hobby.id}`" x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="bloom" />
                <feMerge>
                  <feMergeNode in="bloom" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path class="hobby-arm-bloom" :d="arm" :filter="`url(#hobby-glow-${hobby.id})`" />
            <path class="hobby-arm" :d="arm" :stroke="`url(#hobby-filament-${hobby.id})`" />
            <circle class="hobby-origin" cx="50" cy="50" r="1.1" />
            <g v-for="(spark, index) in sparksFor(hobby)" :key="`${hobby.id}-${index}`">
              <circle
                class="hobby-spark-halo"
                :class="{ newest: spark.newest, seed: spark.seed }"
                :cx="spark.x"
                :cy="spark.y"
                :r="spark.size * 2.15"
                :style="{ opacity: spark.opacity * 0.45 }"
              />
              <circle
                class="hobby-spark"
                :class="{ newest: spark.newest, seed: spark.seed }"
                :cx="spark.x"
                :cy="spark.y"
                :r="spark.size"
                :style="{ opacity: spark.opacity }"
              />
            </g>
          </svg>
          <strong>{{ hobby.nombre }}</strong>
        </button>
        <p v-if="selectedId === hobby.id && hobby.sensacion" class="hobby-feeling">{{ hobby.sensacion }}</p>
        <div v-if="selectedId === hobby.id" class="hobby-moment-slot">
          <slot name="moment" :hobby="hobby" />
        </div>
      </li>
    </ul>
    <p v-else class="hobby-empty">Tu jardín espera algo que disfrutes por el simple gusto de hacerlo.</p>
  </section>
</template>

<style scoped>
.hobby-garden {
  display: grid;
  justify-items: center;
  gap: var(--espacio-4);
  width: min(100%, 36rem);
  min-width: 0;
  margin-inline: auto;
  text-align: center;
}
.hobby-editorial {
  margin: 0;
  max-width: 28rem;
  color: var(--oro-claro);
  font: italic 300 var(--texto-4)/1.5 Georgia, 'Times New Roman', serif;
  text-wrap: balance;
}
.hobby-spiral-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--espacio-5) var(--espacio-4);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.hobby-spiral-row > li {
  display: grid;
  justify-items: center;
  gap: var(--espacio-3);
  min-width: 0;
}
.hobby-spiral-row > li.selected {
  flex: 1 1 100%;
  width: 100%;
}
.hobby-feeling {
  margin: 0;
  max-width: 22rem;
  color: var(--oro-claro);
  font: italic 300 var(--texto-3)/1.45 Georgia, 'Times New Roman', serif;
  text-wrap: balance;
}
.hobby-moment-slot {
  display: grid;
  width: min(100%, 28rem);
  min-width: 0;
  justify-items: stretch;
  text-align: left;
}
.hobby-spiral {
  display: grid;
  justify-items: center;
  gap: var(--espacio-3);
  width: 10.5rem;
  min-height: var(--toque);
  border: 0;
  background: transparent;
  color: var(--texto);
  cursor: pointer;
}
.hobby-spiral svg {
  width: 10.5rem;
  aspect-ratio: 1;
  overflow: visible;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, rgba(201, 168, 106, .1), transparent 8%),
    radial-gradient(circle at 50% 52%, rgba(201, 168, 106, .07), transparent 46%),
    radial-gradient(circle at 38% 32%, #121826, #080b11 72%);
  box-shadow: inset 0 0 70px rgba(0, 0, 0, .55), 0 28px 68px rgba(0, 0, 0, .28);
}
.hobby-spiral-row.is-solo .hobby-spiral { width: min(26rem, 100%); }
.hobby-spiral-row.is-solo .hobby-spiral svg { width: 100%; }
.hobby-spiral-row.is-pair .hobby-spiral { width: min(14rem, 46%); }
.hobby-spiral-row.is-pair .hobby-spiral svg { width: 100%; }
.hobby-arm-bloom {
  fill: none;
  stroke: #ead6a7;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: .42;
}
.hobby-arm {
  fill: none;
  stroke-width: 1.05;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.hobby-origin { fill: rgba(234, 214, 167, .55); }
.hobby-spark-halo { fill: none; stroke: rgba(234, 214, 167, .55); stroke-width: .45; }
.hobby-spark-halo.newest { stroke: #ead6a7; }
.hobby-spark-halo.seed { stroke: rgba(201, 168, 106, .28); }
.hobby-spark { fill: var(--oro); }
.hobby-spark.newest {
  fill: var(--oro-claro);
  animation: hobby-spark-pulse 3.8s var(--ease-in-out) infinite;
}
.hobby-spark-halo.newest { animation: hobby-spark-pulse 3.8s var(--ease-in-out) infinite; }
.hobby-spark.seed { fill: color-mix(in srgb, var(--oro) 55%, transparent); }
.hobby-spiral strong {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: var(--marfil, #f4efe5);
  font: 200 var(--texto-5)/1.15 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.02em;
}
.hobby-spiral:focus-visible { outline: 2px solid var(--oro-claro); outline-offset: 6px; border-radius: 50%; }
.hobby-spiral.active svg {
  box-shadow: inset 0 0 70px rgba(0, 0, 0, .45), 0 0 0 1px rgba(234, 214, 167, .28), 0 28px 68px rgba(0, 0, 0, .28);
}
.hobby-spiral.active strong { color: var(--oro-claro); }
.hobby-empty {
  margin: 0;
  max-width: 26rem;
  color: var(--texto-suave);
  font: italic 300 var(--texto-4)/1.6 Georgia, 'Times New Roman', serif;
}
@media (max-width: 760px) {
  .hobby-garden { width: 100%; gap: var(--espacio-3); }
  .hobby-editorial { font: italic 300 var(--texto-3)/1.45 Georgia, 'Times New Roman', serif; }
  .hobby-spiral { width: 9.5rem; }
  .hobby-spiral svg { width: 100%; }
  .hobby-spiral-row.is-solo .hobby-spiral { width: min(24rem, calc(100vw - 1.6rem)); }
  .hobby-spiral-row.is-pair .hobby-spiral { width: min(11.5rem, 44vw); }
}
@media (prefers-reduced-motion: reduce) {
  .hobby-spark.newest, .hobby-spark-halo.newest { filter: none; animation: none; }
}
@keyframes hobby-spark-pulse {
  0%, 100% { filter: brightness(.88) drop-shadow(0 6px 12px rgba(234, 214, 167, .35)); }
  50% { filter: brightness(1.22) drop-shadow(0 8px 18px rgba(234, 214, 167, .7)); }
}
</style>
