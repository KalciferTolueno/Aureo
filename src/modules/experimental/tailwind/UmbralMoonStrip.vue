<script setup lang="ts">
import { LUNAR_PHASES } from '@/domain/umbral'

defineProps<{ activeIndex: number; label: string }>()
</script>

<template>
  <div class="moon-strip-wrap">
    <ol class="moon-strip" aria-label="Fases lunares">
      <li v-for="(phase, index) in LUNAR_PHASES" :key="phase" :class="{ current: index === activeIndex }">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <clipPath :id="`moon-strip-disc-${index}`"><circle cx="16" cy="16" r="12.5"/></clipPath>
          </defs>
          <g :clip-path="`url(#moon-strip-disc-${index})`">
            <circle class="strip-light" cx="16" cy="16" r="12.5"/>
            <circle v-if="index === 0" class="strip-shadow" cx="16" cy="16" r="13"/>
            <circle v-else-if="index === 1" class="strip-shadow" cx="12" cy="16" r="13"/>
            <rect v-else-if="index === 2" class="strip-shadow" x="3" y="3" width="13" height="26"/>
            <ellipse v-else-if="index === 3" class="strip-shadow" cx="8" cy="16" rx="6" ry="13"/>
            <ellipse v-else-if="index === 5" class="strip-shadow" cx="24" cy="16" rx="6" ry="13"/>
            <rect v-else-if="index === 6" class="strip-shadow" x="16" y="3" width="13" height="26"/>
            <circle v-else-if="index === 7" class="strip-shadow" cx="20" cy="16" r="13"/>
          </g>
          <circle class="strip-rim" cx="16" cy="16" r="12.5"/>
        </svg>
        <span class="sr-only">{{ phase }}{{ index === activeIndex ? ', fase de hoy' : '' }}</span>
      </li>
    </ol>
    <p class="moon-strip-name">{{ label }}</p>
  </div>
</template>

<style scoped>
.moon-strip-wrap { display: grid; justify-items: center; gap: .45rem; pointer-events: none; }
.moon-strip { display: flex; width: min(100%, 18.5rem); margin: 0; padding: 0; list-style: none; justify-content: space-between; gap: .2rem; }
.moon-strip li { display: grid; width: 1.55rem; place-items: center; opacity: .25; }
.moon-strip li.current { opacity: 1; }
.moon-strip svg { width: 1.45rem; height: 1.45rem; overflow: visible; }
.strip-light { fill: #ead6a7; }
.current .strip-light { fill: #c9a86a; }
.strip-shadow { fill: #080b11; }
.strip-rim { fill: none; stroke: rgba(234, 214, 167, .55); stroke-width: .7; }
.current .strip-rim { stroke: #c9a86a; }
.moon-strip-name { margin: 0; color: #c9a86a; font: 300 .78rem/1.3 Georgia, 'Times New Roman', serif; letter-spacing: .04em; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
</style>
