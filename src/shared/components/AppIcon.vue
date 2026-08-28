<script setup lang="ts">
defineProps<{ name: string; label?: string }>()
</script>

<template>
  <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" :aria-hidden="label ? undefined : 'true'" :aria-label="label" :role="label ? 'img' : undefined">
    <template v-if="name === 'sun'"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></template>
    <template v-else-if="name === 'worlds'"><circle cx="12" cy="12" r="1.5"/><path d="M12 10c-3-1-4.5-3.4-3.4-5.4C10 2 13.1 4.7 12 10Zm2 2c1-3 3.4-4.5 5.4-3.4C22 10 19.3 13.1 14 12Zm-2 2c3 1 4.5 3.4 3.4 5.4C14 22 10.9 19.3 12 14Zm-2-2c-1 3-3.4 4.5-5.4 3.4C2 14 4.7 10.9 10 12Z"/></template>
    <template v-else-if="name === 'balance'"><path d="M12 3v17M7 6h10M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6ZM7 20h10"/></template>
    <template v-else-if="name === 'moon'"><path d="M19 15.3A8 8 0 0 1 8.7 5 8 8 0 1 0 19 15.3Z"/></template>
    <template v-else-if="name === 'star'"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></template>
    <template v-else-if="name === 'back'"><path d="m15 18-6-6 6-6"/></template>
    <template v-else-if="name === 'close'"><path d="m7 7 10 10M17 7 7 17"/></template>
    <template v-else-if="name === 'edit'"><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM13.8 7.2l3 3"/></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14"/></template>
    <template v-else-if="name === 'constellation'"><circle cx="6" cy="7" r="1.5"/><circle cx="17" cy="5" r="1.5"/><circle cx="13" cy="17" r="1.5"/><circle cx="20" cy="15" r="1.5"/><path d="m7.5 6.7 8-1.4M7 8.2l5 7.5m2.5.5 4-1"/></template>
    <template v-else-if="name === 'companions'"><circle cx="8" cy="8" r="1.7"/><circle cx="16" cy="8" r="1.7"/><circle cx="5" cy="13" r="1.5"/><circle cx="19" cy="13" r="1.5"/><path d="M8.5 18c0-2.3 1.6-4.2 3.5-4.2s3.5 1.9 3.5 4.2c0 1.3-1 2-2.1 1.5a3.3 3.3 0 0 0-2.8 0C9.5 20 8.5 19.3 8.5 18Z"/></template>
    <template v-else-if="name === 'decree'"><path d="m12 3 7 9-7 9-7-9 7-9Z"/><path d="M9 12h6"/></template>
    <template v-else-if="name === 'plants'"><path d="M12 21V9M12 13c-5 0-7-2.4-7-6 4 0 7 1.7 7 6Zm0 3c5 0 7-2.4 7-6-4 0-7 1.7-7 6Z"/></template>
    <template v-else-if="name === 'hobbies'"><circle cx="12" cy="12" r="8"/><path d="M8.5 14.5c1.8 1.5 5.2 1.5 7 0M9 9h.01M15 9h.01"/></template>
    <template v-else-if="name === 'journeys'"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></template>
    <template v-else-if="name === 'book'"><path d="M4 5.5c3-1 5.7-.5 8 1.5v13c-2.3-2-5-2.5-8-1.5v-13Zm16 0c-3-1-5.7-.5-8 1.5v13c2.3-2 5-2.5 8-1.5v-13Z"/></template>
    <template v-else-if="name === 'movement'"><circle cx="12" cy="5" r="2"/><path d="m9 21 2-6-3-3 3-3 3 3 3 1M13 15l3 6"/></template>
    <template v-else-if="name === 'silence'"><path d="M12 20c-4-1-6-4-6-7 3 0 5 1 6 3 1-2 3-3 6-3 0 3-2 6-6 7Zm0-4c-2.5-2-2.5-5 0-8 2.5 3 2.5 6 0 8Z"/></template>
    <circle v-else cx="12" cy="12" r="7"/>
  </svg>
</template>
