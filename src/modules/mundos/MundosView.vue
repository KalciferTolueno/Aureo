<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { storage } from '@/data/storage'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { EntityBase, Plant } from '@/domain/types'

const profile=useProfileStore();const router=useRouter();const showGrid=ref(false);const counts=ref<Record<string,number>>({});const careReminder=ref('')
const definitions=[
  {key:'vinculos',title:'Mi Constelación',text:'Personas y vínculos que forman parte de tu cielo.',icon:'constellation',path:'/mundos/constelacion',petal:'petal-top',color:'oro',labelAngle:-90,labelX:150,labelY:74},
  {key:'decretos',title:'Decretos',text:'Palabras que eliges para ser, vivir y tener.',icon:'decree',path:'/mundos/decretos',petal:'petal-lower-right',color:'lavanda',labelAngle:54,labelX:195,labelY:212},
  {key:'hobbies',title:'Hobbies',text:'Actividades que te devuelven a ti.',icon:'hobbies',path:'/mundos/hobbies',petal:'petal-lower-left',color:'oro',labelAngle:126,labelX:105,labelY:212},
  {key:'travesias',title:'Travesías',text:'Lugares vividos y destinos que llamas.',icon:'journeys',path:'/mundos/travesias',petal:'petal-upper-right',color:'salvia',labelAngle:-18,labelX:222,labelY:127},
  {key:'cuidado',title:'Lo que cuido',text:'Lo que cuido, también me cuida.',icon:'companions',path:'/mundos/cuidado',petal:'petal-upper-left',color:'ciruela',labelAngle:198,labelX:78,labelY:127},
]
const careActive=computed(()=>profile.activeSections.has('companeros')||profile.activeSections.has('plantas'))
const worlds=computed(()=>definitions.filter(item=>item.key!=='cuidado'||careActive.value))
function active(key:string){return (counts.value[key]??0)>0}
async function loadState(){
  const keys=['vinculos','travesias','decretos','hobbies','companeros','plantas']
  const values=await Promise.all(keys.map(key=>storage.get<EntityBase[]>(key)))
  const next:Record<string,number>=Object.fromEntries(keys.map((key,index)=>[key,(values[index]??[]).filter(item=>!item.deleted_at).length]))
  next.cuidado=(next.companeros??0)+(next.plantas??0);counts.value=next
  const plants=(values[keys.indexOf('plantas')] as Plant[]|null)??[];const now=Date.now()
  const due=plants.filter(plant=>{if(plant.deleted_at||!plant.ultimo_riego||!plant.frecuencia_dias)return false;return new Date(plant.ultimo_riego).getTime()+plant.frecuencia_dias*86400000<=now})
  if(due.length)careReminder.value=due.length===1?`🌿 ${due[0]?.nombre} espera un poco de cuidado.`:`🌿 ${due.length} plantas esperan un poco de cuidado.`
}
onMounted(loadState)
</script>

<template>
  <main class="app-shell worlds-view">
    <header class="topbar"><div><h1>Mis Mundos</h1></div><RouterLink class="icon-link" to="/ajustes" aria-label="Ajustes"><AppIcon name="settings" /></RouterLink></header>
    <RouterLink v-if="careReminder" class="care-reminder" to="/mundos/cuidado"><span>{{ careReminder }}</span><AppIcon name="plants" /></RouterLink>
    <section v-if="!showGrid" class="worlds-gateway" aria-labelledby="worlds-phrase">
      <div class="world-flower-stage">
        <svg class="world-flower" viewBox="0 0 300 300" role="group" aria-label="Accesos a tus mundos">
          <defs><radialGradient id="petal-oro" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#f5e9c6" /><stop offset=".56" stop-color="#c9a86a" /><stop offset="1" stop-color="#805e27" /></radialGradient><radialGradient id="petal-salvia" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#e3f0e8" /><stop offset=".56" stop-color="#7da797" /><stop offset="1" stop-color="#456457" /></radialGradient><radialGradient id="petal-lavanda" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#e6e1f3" /><stop offset=".56" stop-color="#8173b7" /><stop offset="1" stop-color="#4e426f" /></radialGradient><radialGradient id="petal-ciruela" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#f0dcef" /><stop offset=".56" stop-color="#9b7d9b" /><stop offset="1" stop-color="#634a63" /></radialGradient><radialGradient id="flower-core-glow" cx="35%" cy="28%" r="70%"><stop offset="0" stop-color="#fff9e8" /><stop offset=".52" stop-color="#e8d29a" /><stop offset="1" stop-color="#9d7135" /></radialGradient></defs>
          <ellipse class="flower-shadow" cx="150" cy="166" rx="91" ry="46" />
          <g v-for="world in definitions" :key="world.key" class="world-petal" :class="[world.petal,world.color,{active:active(world.key),disabled:world.key==='cuidado'&&!careActive}]" role="button" :aria-label="world.title" :aria-disabled="world.key==='cuidado'&&!careActive" :tabindex="world.key==='cuidado'&&!careActive?-1:0" @click="world.key!=='cuidado'||careActive?router.push(world.path):undefined" @keydown.enter.space.prevent="world.key!=='cuidado'||careActive?router.push(world.path):undefined">
            <ellipse class="petal-shadow" cx="150" cy="83" rx="38" ry="66" />
            <ellipse class="petal-surface" cx="150" cy="83" rx="38" ry="66" :fill="`url(#petal-${world.color})`" />
            <text class="petal-label" :x="world.labelX" :y="world.labelY" text-anchor="middle" :transform="`rotate(${world.labelAngle} ${world.labelX} ${world.labelY})`">{{ world.title }}</text>
          </g>
          <circle class="flower-core" cx="150" cy="150" r="31" fill="url(#flower-core-glow)" /><circle class="flower-seed" cx="150" cy="150" r="10" />
        </svg>
      </div>
      <p id="worlds-phrase" class="seccion-frase">Todo lo que ya es tuyo.</p><RouterLink v-if="!careActive" class="worlds-helper" to="/ajustes">Lo que cuido se activa en Ajustes.</RouterLink><button class="text-action" type="button" :aria-expanded="showGrid" aria-controls="worlds-grid" @click="showGrid=true">Ver todos</button>
    </section>
    <section v-else><div id="worlds-grid" class="world-grid"><RouterLink v-for="world in worlds" :key="world.path" class="world-card" :class="`world-card--${world.key}`" :to="world.path"><AppIcon :name="world.icon" /><h2>{{ world.title }}</h2><p>{{ world.text }}</p></RouterLink></div><button class="text-action centered-action" type="button" :aria-expanded="showGrid" aria-controls="worlds-grid" @click="showGrid=false">Volver a la flor</button></section>
  </main>
</template>
