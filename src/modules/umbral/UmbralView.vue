<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useCollection } from '@/composables/useCollection'
import { storage } from '@/data/storage'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { Intention, Pulse } from '@/domain/types'

interface LightPoint { id: string; fecha: string }

const profile = useProfileStore(); const text = ref(''); const pulseText = ref(''); const lights = ref<LightPoint[]>([])
const heroOrbit = ref<HTMLElement | null>(null); const orbitVisible = ref(true); const pageVisible = ref(!document.hidden)
const orbitActive = computed(() => orbitVisible.value && pageVisible.value)
const intentions = useCollection<Intention>('intenciones'); const pulses = useCollection<Pulse>('pulso')
const today = computed(() =>
  new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric' }).format(new Date()),
)
const greeting = computed(() => { const hour = new Date().getHours(); return hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches' })
const dateKey = (date = new Date()) => { const year=date.getFullYear(); const month=String(date.getMonth()+1).padStart(2,'0'); const day=String(date.getDate()).padStart(2,'0'); return `${year}-${month}-${day}` }
const dayNumber = computed(() => { let n=dateKey().replace(/\D/g,'').split('').reduce((s,d)=>s+Number(d),0); while(n>9)n=String(n).split('').reduce((s,d)=>s+Number(d),0); return n })
const arcana = ['El Mago','La Sacerdotisa','La Emperatriz','El Emperador','El Hierofante','Los Enamorados','El Carro','La Fuerza','El Ermitaño','La Rueda de la Fortuna','La Justicia','El Colgado','La Muerte','La Templanza','El Diablo','La Torre','La Estrella','La Luna','El Sol','El Juicio','El Mundo','El Loco']
const card = computed(() => arcana[(new Date().getDate()+new Date().getMonth())%arcana.length])
const dailySign = computed(() => { const value=(new Date().getMonth()+1)*100+new Date().getDate(); if(value>=321&&value<=419)return'Aries';if(value<=520&&value>=420)return'Tauro';if(value<=620&&value>=521)return'Géminis';if(value<=722&&value>=621)return'Cáncer';if(value<=822&&value>=723)return'Leo';if(value<=922&&value>=823)return'Virgo';if(value<=1022&&value>=923)return'Libra';if(value<=1121&&value>=1023)return'Escorpio';if(value<=1221&&value>=1122)return'Sagitario';if(value>=1222||value<=119)return'Capricornio';if(value<=218)return'Acuario';return'Piscis' })
const lunarPhases=['Luna nueva','Creciente','Cuarto creciente','Gibosa creciente','Luna llena','Gibosa menguante','Cuarto menguante','Menguante']
const lunarPhase=computed(()=>{const cycle=29.53058867;const knownNewMoon=Date.UTC(2000,0,6,18,14);const days=(Date.now()-knownNewMoon)/86400000;return lunarPhases[Math.floor((((days%cycle)+cycle)%cycle)/cycle*8)%8]})
const prompts=['¿Qué necesita hoy mi atención?','¿Qué emoción está pidiendo espacio?','¿Qué puedo hacer hoy con más suavidad?','¿Qué quiero recordar al terminar el día?']
const dailyPrompt=computed(()=>prompts[Number(dateKey().replaceAll('-',''))%prompts.length]!)
const todayIntentions=computed(()=>intentions.items.value.filter(item=>(!item.fecha||item.fecha===dateKey())&&!(item.completada??item.done)))
const todayPulse=computed(()=>[...pulses.items.value].reverse().find(item=>item.fecha===dateKey()))
const todayLights=computed(()=>lights.value.filter(light=>light.fecha===dateKey()))
async function addIntention() { if (!text.value.trim()) return; const value=text.value.trim(); await intentions.add({texto:value,txt:value,completada:false,done:false,fecha:dateKey(),fecha_creacion:new Date().toISOString()}); text.value='' }
async function completeIntention(item:Intention){lights.value.push({id:crypto.randomUUID(),fecha:dateKey()});await storage.set('luces_hoy',lights.value);await intentions.remove(item.id)}
async function savePulse(){const respuesta=pulseText.value.trim();if(!respuesta)return;if(todayPulse.value)await pulses.update(todayPulse.value.id,{pregunta:dailyPrompt.value,respuesta});else await pulses.add({pregunta:dailyPrompt.value,respuesta,fecha:dateKey(),fecha_creacion:new Date().toISOString()});pulseText.value=''}
let orbitObserver: IntersectionObserver | undefined
function syncPageVisibility(){pageVisible.value=!document.hidden}
onMounted(async()=>{
  orbitObserver=new IntersectionObserver(([entry])=>{orbitVisible.value=entry?.isIntersecting ?? true},{threshold:.1})
  if(heroOrbit.value)orbitObserver.observe(heroOrbit.value)
  document.addEventListener('visibilitychange',syncPageVisibility)
  lights.value=(await storage.get<LightPoint[]>('luces_hoy'))??[]
})
onBeforeUnmount(()=>{orbitObserver?.disconnect();document.removeEventListener('visibilitychange',syncPageVisibility)})
</script>

<template>
  <main class="app-shell umbral-view">
    <header class="topbar">
      <div>
        <h1>{{ greeting }}<span v-if="profile.name">, {{ profile.name }}</span></h1>
      </div>
      <RouterLink class="icon-button" to="/ajustes" aria-label="Abrir ajustes"><AppIcon name="settings" /></RouterLink>
    </header>

    <section ref="heroOrbit" class="hero-orbit" :class="{ 'orbit-paused': !orbitActive }">
      <h2 class="orbit-title">El día en números</h2>
      <div class="celestial-field" aria-hidden="true">
        <svg class="constellation constellation-one" viewBox="0 0 180 120" fill="none">
          <path d="M12 94 48 58 82 72 126 24 166 48" />
          <circle cx="12" cy="94" r="2.4" /><circle cx="48" cy="58" r="3" /><circle cx="82" cy="72" r="2.2" /><circle cx="126" cy="24" r="3.2" /><circle cx="166" cy="48" r="2.4" />
        </svg>
        <svg class="constellation constellation-two" viewBox="0 0 130 120" fill="none">
          <path d="M10 30 42 52 68 18 88 70 120 96" />
          <circle cx="10" cy="30" r="2.2" /><circle cx="42" cy="52" r="2.8" /><circle cx="68" cy="18" r="2.2" /><circle cx="88" cy="70" r="3" /><circle cx="120" cy="96" r="2.4" />
        </svg>
      </div>
      <div class="orbit orbit-one" aria-hidden="true" />
      <div class="orbit orbit-middle" aria-hidden="true" />
      <div class="orbit orbit-two" aria-hidden="true" />
      <AppIcon class="sun respira" name="sun" />
      <div class="orbit-datum orbit-datum-number"><span class="orbit-motion"><span class="orbit-anchor"><span class="orbit-counter"><span class="orbit-copy"><small>Número</small><strong>{{ dayNumber }}</strong></span></span></span></span></div>
      <div class="orbit-datum orbit-datum-sign"><span class="orbit-motion"><span class="orbit-anchor"><span class="orbit-counter"><span class="orbit-copy"><small>Signo del día</small><strong>{{ dailySign }}</strong></span></span></span></span></div>
      <div class="orbit-datum orbit-datum-arcana"><span class="orbit-motion"><span class="orbit-anchor"><span class="orbit-counter"><span class="orbit-copy"><small>Arcano</small><strong>{{ card }}</strong></span></span></span></span></div>
      <span class="lunar-phase">{{ lunarPhase }}</span>
      <p>{{ today }}</p>
    </section>

    <section class="module-grid" aria-label="Módulos de Umbral">
      <article class="module-card">
        <span class="module-symbol"><AppIcon name="decree" /></span>
        <p class="module-kicker">Palabra de poder</p>
        <h2>{{ profile.profile?.palabraPoder || 'Presencia' }}</h2>
      </article>
      <article class="module-card">
        <span class="module-symbol"><AppIcon name="star" /></span>
        <p class="module-kicker">Lo que tengo en mente hoy</p>
        <form class="intention-form" @submit.prevent="addIntention"><input v-model="text" name="intencion" autocomplete="off" aria-label="Nueva intención" placeholder="Escribe una intención…" /><button v-if="text.trim()" type="submit" aria-label="Agregar intención"><AppIcon name="plus" /></button></form>
      </article>
    </section>
    <section class="daily-list intentions-list"><h2>Lo que tengo en mente hoy</h2><label v-for="item in todayIntentions" :key="item.id" class="check-row"><input name="intenciones_completadas" :value="item.id" type="checkbox" @change="completeIntention(item)" /><span>{{ item.texto ?? item.txt }}</span><button type="button" aria-label="Eliminar intención" @click="intentions.remove(item.id)"><AppIcon name="close" /></button></label><p v-if="!todayIntentions.length" class="empty-copy">El día está en blanco. También es un lujo.</p><div v-if="todayLights.length" class="light-trail" :aria-label="`${todayLights.length} intenciones completadas hoy`"><span v-for="light in todayLights" :key="light.id" class="light-point" /></div></section>
    <section class="ritual-section pulse-section"><p class="module-kicker">Mi pulso de hoy</p><h2>{{ dailyPrompt }}</h2><blockquote v-if="todayPulse">{{ todayPulse.respuesta }}</blockquote><form class="spark-form" @submit.prevent="savePulse"><textarea v-model="pulseText" name="pulso" autocomplete="off" rows="3" :placeholder="todayPulse ? 'Escribe una nueva respuesta…' : 'Escribe lo que aparece…'" aria-label="Respuesta a mi pulso de hoy"/><button v-if="pulseText.trim()" class="primary-action" type="submit">{{ todayPulse ? 'Actualizar pulso' : 'Guardar pulso' }}</button></form></section>
  </main>
</template>
