<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useProfileStore } from '@/stores/profile'
import ModuleHeader from '@/shared/components/ModuleHeader.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { NucleusThought } from '@/domain/types'

type Note={name:string;frequency:number}
const notes:Note[]=[{name:'Do',frequency:261.63},{name:'Re',frequency:293.66},{name:'Mi',frequency:329.63},{name:'Fa',frequency:349.23},{name:'Sol',frequency:392},{name:'La',frequency:440},{name:'Si',frequency:493.88}]
const colors:Record<string,string>={cosmos:'#7A6AAA',oro:'#C9A86A',salvia:'#7d9b8a',ocaso:'#B86B56',ciruela:'#9B7D9B',marfil:'#F5F0E6'}
const emptyWords=['Ataraxia','Logos','Epoché','Umbra','Ignis','Anima','Eudaimonia','Aponia','Aether','Terra','Aqua']
const thresholdParticles=Array.from({length:28},(_,index)=>({id:index,x:Math.cos(index*2.399)*((index%7)+34),y:Math.sin(index*2.399)*((index%7)+34),delay:(index%8)*.09,color:['#C9A86A','#7A6AAA','#9B7D9B'][index%3]!}))
const profile=useProfileStore();const thoughts=useCollection<NucleusThought>('nucleo_pensamientos');const sequence=ref<string[]>([]);const text=ref('');const error=ref('');const selected=ref<string|null>(null);const threshold=ref(false);const clothVisible=ref(false);const textInput=ref<HTMLTextAreaElement|null>(null)
let thresholdTimer:number|undefined
const band=()=>{const hour=new Date().getHours();return hour>=6&&hour<12?'dia':hour<20?'tarde':'noche'}
const unlocked=ref(sessionStorage.getItem(`aureo_nucleo_${band()}`)==='1'||!profile.profile?.clave_app_hash)
clothVisible.value=unlocked.value
const ordered=computed(()=>thoughts.items.value)
const selectedThought=computed(()=>ordered.value.find(thought=>thought.id===selected.value)??null)
const emptyWord=computed(()=>emptyWords[Math.floor(Date.now()/604800000)%emptyWords.length]!)
function tone(value:string){if(/gracias|alegr|logr|amor/i.test(value))return'oro';if(/calma|paz|respir/i.test(value))return'salvia';if(/rabia|miedo|dolor|ansiedad/i.test(value))return'ocaso';if(/siento|extraño|emoci/i.test(value))return'ciruela';if(/pienso|quizá|pregunta|entender/i.test(value))return'cosmos';return'marfil'}
function play(note:Note){const context=new AudioContext();const oscillator=context.createOscillator();const gain=context.createGain();oscillator.frequency.value=note.frequency;oscillator.type='sine';gain.gain.setValueAtTime(.12,context.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.45);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.46)}
function revealCloth(){if(thresholdTimer)window.clearTimeout(thresholdTimer);thresholdTimer=undefined;threshold.value=false;clothVisible.value=true}
function beginThreshold(){unlocked.value=true;threshold.value=true;thresholdTimer=window.setTimeout(revealCloth,3000)}
async function press(note:Note){if(sequence.value.length>=3)sequence.value=[];sequence.value.push(note.name);play(note);if(sequence.value.length===3){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sequence.value.join('|')));const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');if(hash===profile.profile?.clave_app_hash){sessionStorage.setItem(`aureo_nucleo_${band()}`,'1');error.value='';beginThreshold()}else{error.value='No es esa. Respira.';setTimeout(()=>sequence.value=[],550)}}}
async function addThought(){const value=text.value.trim();if(!value)return;const tono=tone(value);await thoughts.add({texto:value,tono,x:12+Math.random()*76,y:14+Math.random()*70,simbolo:['☾','◌','⌁','✦'][Math.floor(Math.random()*4)]!,timestamp:new Date().toISOString(),fecha_creacion:new Date().toISOString()});text.value=''}
function thoughtDate(thought:NucleusThought){return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(thought.timestamp))}
watch(clothVisible,visible=>{if(visible)nextTick(()=>textInput.value?.focus())})
onBeforeUnmount(()=>{if(thresholdTimer)window.clearTimeout(thresholdTimer)})
</script>

<template>
  <main class="app-shell nucleus-view">
    <ModuleHeader title="Núcleo"/>
    <section v-if="!unlocked&&!threshold" class="nucleus-lock">
      <AppIcon class="large-symbol respira" name="moon"/><h2>Tu sanctum</h2><p class="lead">Toca tu melodía para entrar.</p>
      <div class="melody-progress" aria-label="Notas ingresadas"><span v-for="index in 3" :key="index" :class="{filled:sequence[index-1]}" aria-hidden="true"></span></div>
      <div class="musical-grid"><button v-for="note in notes" :key="note.name" type="button" @click="press(note)">{{ note.name }}</button></div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </section>
    <section v-else-if="threshold" class="nucleus-threshold" tabindex="0" aria-label="Entrando a Núcleo. Toca para continuar." @click="revealCloth" @keydown.enter.space.prevent="revealCloth">
      <span v-for="particle in thresholdParticles" :key="particle.id" class="threshold-particle" :style="{'--particle-x':`${particle.x}vw`,'--particle-y':`${particle.y}vh`,'--particle-delay':`${particle.delay}s`,'--particle-color':particle.color}" aria-hidden="true"></span>
      <AppIcon class="threshold-moon" name="moon" aria-hidden="true"/><span class="threshold-flash" aria-hidden="true"></span>
    </section>
    <template v-else-if="clothVisible">
      <p class="nucleus-opening">Lo que no dices en voz alta también te construye.</p><p class="nucleus-subtitle">Aquí puede respirar.</p>
      <Transition name="cloth-reveal" appear>
        <section class="nucleus-cloth" aria-label="Paño de pensamientos">
          <button v-for="(thought,index) in ordered" :key="thought.id" class="thought-light" :style="{left:`${thought.x}%`,top:`${thought.y}%`,color:colors[thought.tono],'--thought-delay':`${(index%5)*.7}s`,'--thought-size':`${6+(index%3)*2}px`}" type="button" :aria-label="`Leer pensamiento: ${thought.texto}`" @click="selected=thought.id"><span/></button>
          <p v-if="!ordered.length" class="nucleus-empty"><em>{{ emptyWord }}.</em> El silencio también es válido.</p>
        </section>
      </Transition>
      <form class="nucleus-form" @submit.prevent="addThought"><textarea ref="textInput" v-model="text" rows="4" placeholder="Escríbelo. Nadie más lo verá."/><button v-if="text.trim()" class="primary-action" type="submit">Dejarlo aquí</button></form>
      <Transition name="thought-card"><div v-if="selectedThought" class="thought-backdrop" @click.self="selected=null"><article class="thought-card" :style="{ '--thought-color': colors[selectedThought.tono] }" role="dialog" aria-label="Pensamiento guardado"><header><time>{{ thoughtDate(selectedThought) }}</time><button type="button" @click="selected=null">Cerrar</button></header><span class="thought-symbol" aria-hidden="true">{{ selectedThought.simbolo }}</span><p>{{ selectedThought.texto }}</p></article></div></Transition>
    </template>
  </main>
</template>
