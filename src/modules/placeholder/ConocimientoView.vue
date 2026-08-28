<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { storage } from '@/data/storage'
import { useProfileStore } from '@/stores/profile'
import ModuleHeader from '@/shared/components/ModuleHeader.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { GoldenDeclaration } from '@/domain/types'

const profile=useProfileStore();const declarations=useCollection<GoldenDeclaration>('edad_dorada_declaraciones');const text=ref('');const contemplative=ref(false);const selected=ref<string|null>(null);const entry=ref('Tu Edad Dorada ya está ocurriendo.')
const signClass=computed(()=>`golden-${profile.profile?.signo??'aries'}`)
function styleFor(index:number,total:number){const distance=28+Math.sqrt(total-index)*30;const angle=index*137.508*Math.PI/180;return{left:`calc(50% + ${Math.cos(angle)*distance}px)`,top:`calc(50% + ${Math.sin(angle)*distance}px)`,zIndex:String(index+1)}}
async function declare(){const value=text.value.trim();if(!value)return;await declarations.add({texto:value,timestamp:new Date().toISOString(),fecha_creacion:new Date().toISOString()});text.value=''}
onMounted(async()=>{const last=await storage.get<string>('edad_dorada_ultima_visita');if(last){const days=Math.floor((Date.now()-new Date(last).getTime())/86400000);entry.value=days===0?'Sigues aquí.':days<7?'¿Cómo está tu Edad Dorada hoy?':'Algo ha pasado. ¿Qué fue?'}await storage.set('edad_dorada_ultima_visita',new Date().toISOString())})
</script>

<template><main class="app-shell golden-view" :class="[signClass,{contemplative}]"><ModuleHeader v-if="!contemplative" title="Edad Dorada"/><section class="golden-stage"><div class="stone-surface" aria-label="Tu escultura de Edad Dorada"><span class="golden-rift golden-rift-one" aria-hidden="true"/><span class="golden-rift golden-rift-two" aria-hidden="true"/><span class="golden-rift golden-rift-three" aria-hidden="true"/><button v-for="(node,index) in declarations.items.value" :key="node.id" class="golden-node" :class="{selected:selected===node.id}" :style="styleFor(index,declarations.items.value.length)" type="button" :aria-label="`Declaración: ${node.texto||'momento dorado'}`" @click="selected=selected===node.id?null:node.id"><span/><em v-if="selected===node.id">{{ node.texto||'Un momento elegido por ti.' }}</em></button><AppIcon v-if="!declarations.items.value.length" class="golden-seed respira" name="star"/></div></section><template v-if="!contemplative"><p class="golden-entry">{{ entry }}</p><form class="golden-form" @submit.prevent="declare"><textarea v-model="text" rows="3" placeholder="Declara este momento…" aria-label="Nueva declaración"/><button v-if="text.trim()" class="primary-action" type="submit">Declarar</button></form><button class="text-action centered-action" type="button" @click="contemplative=true">Entrar en contemplación</button></template><button v-else class="contemplation-exit" type="button" @click="contemplative=false">Volver</button></main></template>
