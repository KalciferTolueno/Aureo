<script setup lang="ts">
import { ref } from 'vue'
import { CollectionRepository, makeId } from '@/data/repositories'
import { storage } from '@/data/storage'
import { useProfileStore } from '@/stores/profile'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { Idea, Intention } from '@/domain/types'

const profile = useProfileStore()
const open = ref(false)
const value = ref('')
const feedback = ref('')
const intentionRepository = new CollectionRepository<Intention>(storage, 'intenciones')
const ideaRepository = new CollectionRepository<Idea>(storage, 'ideas')
const dateKey = () => { const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }

function close(){open.value=false;value.value='';feedback.value=''}
async function saveToday(){const text=value.value.trim();if(!text)return;await intentionRepository.add({id:makeId(),texto:text,txt:text,completada:false,done:false,fecha:dateKey(),fecha_creacion:new Date().toISOString()});feedback.value='Quedó para hoy';setTimeout(close,650)}
async function saveForLater(){const text=value.value.trim();if(!text)return;await ideaRepository.add({id:makeId(),texto:text,txt:text,ts:Date.now(),fecha_creacion:new Date().toISOString(),...(profile.profile?.palabraPoder?{palabraPoder:profile.profile.palabraPoder}:{})});feedback.value='Quedó guardado';setTimeout(close,650)}
</script>

<template>
  <button class="quick-capture-button" type="button" aria-label="Captura rápida" :aria-expanded="open" @click="open=true"><AppIcon name="plus" /></button>
  <Transition name="capture">
    <div v-if="open" class="capture-backdrop" @click.self="close">
      <section class="capture-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <header><div><p class="module-kicker">Captura rápida</p><h2 id="capture-title">¿Qué apareció?</h2></div><button class="icon-button" type="button" aria-label="Cerrar captura" @click="close"><AppIcon name="close" /></button></header>
        <textarea v-model="value" autofocus rows="4" placeholder="Escríbelo antes de que se vaya…" aria-label="Texto de captura rápida" />
        <p v-if="feedback" class="capture-feedback" role="status">{{ feedback }}</p>
        <div v-else-if="value.trim()" class="capture-actions"><button type="button" class="secondary-action" @click="saveForLater">Para guardar</button><button type="button" class="primary-action" @click="saveToday">Para hoy</button></div>
      </section>
    </div>
  </Transition>
</template>
