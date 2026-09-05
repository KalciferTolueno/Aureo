<script setup lang="ts">
import { computed } from 'vue'
import type { Journey } from '@/domain/types'
import { journeyLived, journeyPhrase } from '@/domain/mundos'

const petalPath = 'M150 148C128 110 110 74 120 42C128 22 150 12 150 12C150 12 172 22 180 42C190 74 172 110 150 148Z'
const petalTurns = [0, 72, 144, 216, 288]

const props = defineProps<{ journeys: Journey[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string | null]; live: [id: string] }>()

const lived = computed(() => props.journeys.filter((item) => journeyLived(item)))
const waiting = computed(() => props.journeys.filter((item) => !journeyLived(item)))
const phrase = computed(() => journeyPhrase(props.journeys.length))

function waitAngle(index: number, total: number) {
  if (total <= 1) return -8
  const span = Math.min(64, (total - 1) * 22)
  return -span / 2 + (index / (total - 1)) * span
}

function toggle(id: string) {
  emit('select', props.selectedId === id ? null : id)
}
</script>

<template>
  <section class="journey-trunk" aria-label="Baúl de postales">
    <p class="journey-phrase">{{ phrase }}</p>
    <div class="trunk-stage">
      <div class="trunk-well" aria-hidden="true" />
      <svg class="trunk-seal" viewBox="0 0 40 40" aria-hidden="true">
        <g transform="translate(20 21) scale(0.13) translate(-150 -150)">
          <path
            v-for="angle in petalTurns"
            :key="angle"
            class="seal-petal"
            :d="petalPath"
            :transform="`rotate(${angle} 150 150)`"
          />
          <circle class="seal-halo" cx="150" cy="150" r="26" />
          <circle class="seal-ring" cx="150" cy="150" r="17" />
          <circle class="seal-seed" cx="150" cy="150" r="8" />
        </g>
      </svg>

      <ul class="postcards waiting" aria-label="Postales por vivir">
        <li
          v-for="(item, index) in waiting"
          :key="item.id"
          :style="{ '--wait-angle': `${waitAngle(index, waiting.length)}deg` }"
        >
          <button
            type="button"
            class="postcard waiting-card"
            :class="{ active: selectedId === item.id }"
            :aria-pressed="selectedId === item.id"
            :aria-label="`${item.nombre}, postal por vivir`"
            @click="toggle(item.id)"
          >
            <strong>{{ item.nombre }}</strong>
            <small>Por vivir</small>
          </button>
        </li>
      </ul>

      <ul class="postcards inside" aria-label="Postales vividas">
        <li
          v-for="(item, index) in lived"
          :key="item.id"
          :class="{ active: selectedId === item.id }"
          :style="{ '--card-index': index, zIndex: selectedId === item.id ? 20 : index + 1 }"
        >
          <button
            type="button"
            class="postcard lived"
            :class="{ active: selectedId === item.id }"
            :aria-pressed="selectedId === item.id"
            :aria-label="`${item.nombre}, postal vivida`"
            @click="toggle(item.id)"
          >
            <strong>{{ item.nombre }}</strong>
            <p v-if="item.momento">{{ item.momento }}</p>
            <svg class="postcard-wax" viewBox="0 0 24 24" aria-hidden="true">
              <g transform="translate(12 13) scale(0.065) translate(-150 -150)">
                <path
                  v-for="angle in petalTurns"
                  :key="angle"
                  :d="petalPath"
                  :transform="`rotate(${angle} 150 150)`"
                />
                <circle class="wax-seed" cx="150" cy="150" r="16" />
              </g>
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.journey-trunk {
  display: grid;
  justify-items: center;
  gap: var(--espacio-4);
  width: min(100%, 34rem);
  min-width: 0;
  margin-inline: auto;
  text-align: center;
}
.journey-phrase {
  margin: 0;
  max-width: 28rem;
  color: var(--oro-claro);
  font: italic 300 var(--texto-4)/1.5 Spectral, 'Aureo Serif', Georgia, serif;
  text-wrap: balance;
}
.trunk-stage {
  position: relative;
  isolation: isolate;
  overflow: visible;
  width: min(100%, 30rem);
  aspect-ratio: 1;
}
.trunk-well {
  position: absolute;
  inset: 4% 6% 2%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 48%, rgba(125, 167, 151, .12), transparent 16%),
    radial-gradient(circle at 50% 50%, rgba(201, 168, 106, .08), transparent 48%),
    radial-gradient(circle at 42% 36%, #10151f, transparent 74%);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, .42);
}
.trunk-seal {
  position: absolute;
  z-index: 1;
  left: 50%;
  bottom: 6%;
  width: 3.2rem;
  overflow: visible;
  transform: translateX(-50%);
}
.seal-petal { fill: rgba(201, 168, 106, .38); }
.seal-halo { fill: rgba(201, 168, 106, .16); }
.seal-ring { fill: none; stroke: #c9a86a; stroke-width: 7; }
.seal-seed { fill: #080b11; }
.postcards {
  position: absolute;
  z-index: 2;
  margin: 0;
  padding: 0;
  list-style: none;
}
.postcards.waiting {
  inset: 0;
  pointer-events: none;
}
.postcards.waiting li {
  position: absolute;
  inset: 0;
  transform: rotate(var(--wait-angle));
  transform-origin: 50% 50%;
}
.postcards.waiting .postcard {
  position: absolute;
  left: 50%;
  top: 2%;
  pointer-events: auto;
  transform: translateX(-50%) rotate(calc(var(--wait-angle) * -1 - 6deg));
}
.postcards.inside {
  display: grid;
  place-items: center;
  left: 50%;
  top: 56%;
  width: 10.4rem;
  pointer-events: none;
  transform: translate(-50%, -42%);
}
.postcards.inside li {
  position: relative;
  grid-area: 1 / 1;
  pointer-events: auto;
  transform: rotate(calc((var(--card-index) % 7 - 3) * 6deg)) translateY(calc(var(--card-index) * .2rem));
}
.postcards.inside li.active,
.postcards.inside li:hover,
.postcards.inside li:focus-within {
  z-index: 20;
}
.postcard {
  position: relative;
  display: grid;
  align-content: start;
  gap: .4rem;
  width: 8.6rem;
  min-height: 11.4rem;
  padding: 1.05rem .9rem 1.7rem;
  border: 0;
  border-radius: var(--radio-organico-1);
  background:
    linear-gradient(180deg, rgba(244, 239, 229, .16), transparent 28%),
    linear-gradient(165deg, #1c1812 0%, #12100c 62%, #0c0a08 100%);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, .48),
    inset 0 1px 0 rgba(244, 239, 229, .2);
  color: var(--texto);
  text-align: left;
  cursor: pointer;
}
.postcard.waiting-card {
  width: 7.6rem;
  min-height: var(--toque);
  padding: .55rem .8rem .6rem;
  background:
    linear-gradient(180deg, rgba(125, 167, 151, .1), transparent 42%),
    color-mix(in srgb, #0c1118 88%, transparent);
  box-shadow:
    inset 1px 0 0 color-mix(in srgb, var(--salvia) 52%, transparent),
    0 12px 26px rgba(0, 0, 0, .32);
}
.postcard-wax {
  position: absolute;
  right: .45rem;
  bottom: .4rem;
  width: 1.15rem;
  overflow: visible;
  fill: rgba(201, 168, 106, .42);
}
.wax-seed { fill: #080b11; }
.postcard strong {
  font: 200 var(--texto-4)/1.15 Spectral, 'Aureo Serif', Georgia, serif;
  letter-spacing: -0.02em;
}
.postcard p, .postcard small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--oro-claro);
  font: italic 300 var(--texto-2)/1.4 Spectral, Georgia, serif;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.postcard small { color: color-mix(in srgb, var(--salvia) 72%, #ead6a7); }
.postcard.active, .postcard:focus-visible {
  outline: 2px solid var(--oro-claro);
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .journey-trunk { width: 100%; gap: var(--espacio-3); }
  .journey-phrase { font: italic 300 var(--texto-3)/1.45 Spectral, 'Aureo Serif', Georgia, serif; }
  .trunk-stage { width: min(100%, calc(100vw - 1.4rem)); }
  .postcard { width: 8.4rem; min-height: 11.2rem; }
  .postcard.waiting-card { width: 7rem; }
}
@media (prefers-reduced-motion: reduce) {
  .postcards.waiting .postcard {
    transform: translateX(-50%) rotate(calc(var(--wait-angle) * -1));
  }
  .postcards.inside li { transform: none; }
}
</style>
