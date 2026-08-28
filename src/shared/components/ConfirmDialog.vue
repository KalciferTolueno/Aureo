<script setup lang="ts">
import AppDialog from './AppDialog.vue'
withDefaults(defineProps<{ open: boolean; title?: string; message: string; confirmLabel?: string }>(), { confirmLabel: 'Eliminar' })
const emit = defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template>
  <AppDialog :open="open" :title="title ?? 'Confirmar'" @close="emit('cancel')">
    <p class="dialog-copy">{{ message }}</p>
    <div class="dialog-actions"><button class="secondary-action" type="button" @click="emit('cancel')">Cancelar</button><button class="danger-action" type="button" @click="emit('confirm')">{{ confirmLabel }}</button></div>
  </AppDialog>
</template>
