<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Journey } from '@/domain/types'

interface MapLocation { lat: number; lng: number }

const props = defineProps<{ journeys: Journey[]; draft: MapLocation | null }>()
const emit = defineEmits<{ pick: [coords: MapLocation] }>()

const mapElement = ref<HTMLElement | null>(null)
let map: L.Map | undefined
let journeyLayer: L.LayerGroup | undefined
let draftMarker: L.Marker | undefined

function markerIcon(state: Journey['estado'] | 'draft') {
  return L.divIcon({
    className: 'journey-leaflet-icon',
    html: `<span class="${state}"></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

function renderJourneys() {
  if (!map || !journeyLayer) return
  journeyLayer.clearLayers()
  for (const journey of props.journeys) {
    const position: L.LatLngExpression = [journey.lat, journey.lng]
    const stateLabel = journey.estado === 'visitado' ? 'lugar vivido' : 'lugar que llamas'
    const markerLabel = `${journey.nombre}, ${stateLabel}`
    const marker = L.marker(position, { icon: markerIcon(journey.estado), keyboard: true, title: markerLabel, alt: markerLabel }).addTo(journeyLayer)
    const popup = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = journey.nombre
    popup.append(name)
    if (journey.momento) {
      const moment = document.createElement('p')
      moment.textContent = journey.momento
      popup.append(moment)
    }
    marker.bindPopup(popup)
    const element = marker.getElement()
    element?.setAttribute('role', 'button')
    element?.setAttribute('aria-label', markerLabel)
  }
}

function renderDraft() {
  if (!map) return
  draftMarker?.remove()
  draftMarker = undefined
  if (!props.draft) return
  draftMarker = L.marker([props.draft.lat, props.draft.lng], { icon: markerIcon('draft'), keyboard: false }).addTo(map)
}

onMounted(async () => {
  await nextTick()
  if (!mapElement.value) return
  map = L.map(mapElement.value, { minZoom: 2, worldCopyJump: true, zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, dragging: true }).setView([18, -15], 2)
  map.attributionControl.setPrefix(false)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)
  journeyLayer = L.layerGroup().addTo(map)
  map.on('click', ({ latlng }) => emit('pick', { lat: latlng.lat, lng: latlng.lng }))
  renderJourneys()
  renderDraft()
})

watch(() => props.journeys, renderJourneys, { deep: true })
watch(() => props.draft, renderDraft, { deep: true })
onBeforeUnmount(() => { map?.remove() })
</script>

<template>
  <section class="journey-map" aria-label="Mapa interactivo de Travesías">
    <div ref="mapElement" class="journey-map-canvas" aria-label="Selecciona una ubicación en el mapa" />
    <p v-if="!journeys.length" class="journey-empty">Cada lugar que conoces lleva algo tuyo para siempre.</p>
  </section>
</template>

<style scoped>
.journey-map{position:relative;grid-column:1/-1;isolation:isolate;overflow:hidden;border:1px solid rgba(125,167,151,.24);border-radius:1.6rem 1rem 2.3rem 1.15rem;background:#090e15;box-shadow:0 24px 58px rgba(0,0,0,.22)}
.journey-map-canvas{height:clamp(22rem,48svh,34rem);background:#090e15}
.journey-empty{position:absolute;z-index:500;left:50%;bottom:2rem;width:min(90%,32rem);margin:0;padding:.6rem 1rem;border-radius:999px;background:rgba(8,11,17,.78);color:#c5d5cd;font-style:italic;text-align:center;transform:translateX(-50%);pointer-events:none}
:deep(.leaflet-control-zoom a){border-color:rgba(125,167,151,.2);background:#10151f;color:#ead6a7}
:deep(.leaflet-control-attribution){background:rgba(8,11,17,.8);color:#b9b3aa}
:deep(.leaflet-control-attribution a){color:#d5c18c}
:deep(.leaflet-tile-pane){filter:saturate(.55) brightness(.62) contrast(1.12) sepia(.1)}
:deep(.leaflet-popup-content-wrapper),:deep(.leaflet-popup-tip){background:#10151f;color:#f4efe5}
:deep(.leaflet-popup-content strong){color:#ead6a7;font-size:1rem;font-weight:400}
:deep(.leaflet-popup-content p){margin:.45rem 0 0;color:#c7d4ce;font-style:italic}
:deep(.journey-leaflet-icon){display:grid!important;place-items:center;background:transparent;border:0}
:deep(.journey-leaflet-icon>span){display:block;width:12px;height:12px;border:2px solid #e3f0e8;border-radius:50%;background:#7da797;box-shadow:0 0 0 7px rgba(125,167,151,.14),0 5px 18px rgba(125,167,151,.8)}
:deep(.journey-leaflet-icon>span.visitado){background:#c9a86a;box-shadow:0 0 0 7px rgba(201,168,106,.14),0 5px 18px rgba(201,168,106,.8)}
:deep(.journey-leaflet-icon>span.draft){background:#f4efe5;box-shadow:0 0 0 7px rgba(234,214,167,.2),0 5px 20px rgba(234,214,167,.9)}
:deep(.journey-leaflet-icon:focus-visible){outline:2px solid #ead6a7;outline-offset:2px;border-radius:50%}
@media(max-width:560px){.journey-map-canvas{height:min(28rem,60svh)}.journey-empty{bottom:2.5rem;font-size:.88rem}}
</style>