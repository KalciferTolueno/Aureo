<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { makeId } from '@/data/repositories'
import { storage } from '@/data/storage'
import { useProfileStore } from '@/stores/profile'
import AppIcon from '@/shared/components/AppIcon.vue'
import { goldenDarumaCrackPatterns } from './goldenDaruma'
import BlurText from './BlurText.vue'
import HobbySpirals from './HobbySpirals.vue'
import JourneyTrunk from './JourneyTrunk.vue'
import { activeNucleusEmotionClusters, groupNucleusThoughts, normalizeNucleusTone, nucleusEmotions, recognizeNucleusTone } from './nucleusEmotion'
import { playChord, playTone, unlockTone } from '@/composables/useTone'
import { MELODY_NOTES, recoverMelodyNotes } from '@/domain/melody'
import {
  COMPANION_SPECIES,
  DECREE_BADGES,
  DECREE_EXAMPLES,
  DECREE_PLACEHOLDERS,
  HOBBY_MOMENT_HINTS,
  PLANT_PLACES,
  companionHumanYears,
  companionSpeciesLabel,
  decreeIntensity,
  formatCareDate,
  hobbyMoments,
  intimateInitials,
  journeyLived,
  truncateNote,
} from '@/domain/mundos'
import type {
  BalanceMovement,
  CareMemory,
  Companion,
  Daruma,
  Decree,
  GoldenDeclaration,
  Hobby,
  Intention,
  Journey,
  LinkRecord,
  NucleusThought,
  Plant,
  Pulse,
} from '@/domain/types'
import { dailyPulsePrompt, isSameLocalDay, localDateKey } from '@/domain/umbral'

const props = defineProps<{ detail: string; initialAction?: string; intentionDraft?: string }>()
const emit = defineEmits<{ close: []; changed: []; 'draft-consumed': [] }>()
const profile = useProfileStore()

const intentions = useCollection<Intention>('intenciones')
const pulses = useCollection<Pulse>('pulso')
const links = useCollection<LinkRecord>('vinculos')
const decrees = useCollection<Decree>('decretos')
const hobbies = useCollection<Hobby>('hobbies')
const journeys = useCollection<Journey>('travesias')
const companions = useCollection<Companion>('companeros')
const plants = useCollection<Plant>('plantas')
const memories = useCollection<CareMemory>('locuidado_memoria')
const movements = useCollection<BalanceMovement>('balance_movimientos')
const darumas = useCollection<Daruma>('balance_darumas')
const thoughts = useCollection<NucleusThought>('nucleo_pensamientos')
const declarations = useCollection<GoldenDeclaration>('edad_dorada_declaraciones')

const worldLabels: Record<string, string> = {
  'world-vinculos': 'Mi Constelación',
  'world-decretos': 'Decretos',
  'world-hobbies': 'Hobbies',
  'world-travesias': 'Travesías',
  'world-cuidado': 'Lo que cuido',
}
const title = computed(() => worldLabels[props.detail] ?? ({
  umbral: 'Umbral', balance: 'Mi Balance', nucleo: 'Núcleo', 'edad-dorada': 'Edad Dorada',
}[props.detail] ?? 'Áureo'))
const isWorld = computed(() => props.detail.startsWith('world-'))

const worldForm = reactive({ nombre: '', categoria: 'Amistad', signo: '', texto: '', sensacion: '', estado: 'decretado', nota: '', momento: '', lat: 0, lng: 0, tipo: 'compañero', detalle: '', especie: '', lugar: 'interior' as 'interior' | 'exterior', nacimiento: '', control: '', careOpen: false, imagen: '' })
const selectedHobbyId = ref<string | null>(null)
const hobbyMomentText = ref('')
const hobbySaved = ref(false)
let hobbySavedTimer: ReturnType<typeof setTimeout> | undefined
const selectedJourneyId = ref<string | null>(null)
const journeyForget = ref<Journey | null>(null)
const carePane = ref<'mural' | 'memoria'>('mural')
const memoryForm = reactive({ nombre: '', frase: '', imagen: '' })
const memorySaving = ref(false)
const decreeGate = ref<'first' | 'own' | null>(null)
const decreeOwn = ref<Decree | null>(null)
const constellationExpanded = ref(false)
const careInitials = computed(() => intimateInitials(profile.name))
const hobbyMomentHint = computed(() => HOBBY_MOMENT_HINTS[(selectedHobbyId.value?.length ?? 0) % HOBBY_MOMENT_HINTS.length]!)
const selectedHobby = computed(() => hobbies.items.value.find((item) => item.id === selectedHobbyId.value) ?? null)
const selectedJourney = computed(() => journeys.items.value.find((item) => item.id === selectedJourneyId.value) ?? null)
const journeyEdit = reactive({ momento: '', nota: '' })
const decreeCategory = computed(() => (['ser', 'vivir', 'tener'].includes(worldForm.categoria) ? worldForm.categoria : 'ser') as Decree['categoria'])
const worldSaving = ref(false)
const careImageError = ref('')
const careImageLoading = ref(false)
const careComposerOpen = ref(false)
const careComposerPanel = ref<HTMLElement | null>(null)
const constellationComposerOpen = ref(false)
const constellationComposerPanel = ref<HTMLElement | null>(null)
const journeyComposerOpen = ref(false)
const journeyComposerPanel = ref<HTMLElement | null>(null)
const hobbyComposerOpen = ref(false)
const hobbyComposerPanel = ref<HTMLElement | null>(null)
const decreeComposerOpen = ref(false)
const decreeComposerPanel = ref<HTMLElement | null>(null)
const journeyLocationSelected = ref(false)
const journeyLocationMessage = ref('')
const selectedConstellationLink = ref<string | null>(null)
const constellationMap = ref<HTMLElement | null>(null)
const constellationActive = ref(false)
let constellationIntersecting = false
let constellationObserver: IntersectionObserver | undefined
const constellationCategories = {
  Amor: { orbit: 1, orbitLabel: 'centro', color: '#B86D5D' },
  Familia: { orbit: 2, orbitLabel: 'órbita media', color: '#8173B7' },
  Amistad: { orbit: 3, orbitLabel: 'órbita exterior', color: '#C9A86A' },
  Raíz: { orbit: 3, orbitLabel: 'órbita exterior', color: '#C9A86A' },
  Guía: { orbit: 3, orbitLabel: 'órbita exterior', color: '#C9A86A' },
} as const
const zodiacSigns = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis']
type ConstellationCategory = keyof typeof constellationCategories
function constellationCategory(value: string) {
  return value in constellationCategories ? value as ConstellationCategory : 'Amistad'
}
const constellationStars = computed(() => {
  const groups = new Map<number, LinkRecord[]>([[1, []], [2, []], [3, []]])
  for (const link of links.items.value) groups.get(constellationCategories[constellationCategory(link.categoria)].orbit)?.push(link)
  const radii = { 1: 16, 2: 28, 3: 40 } as const
  return [...groups.entries()].flatMap(([orbit, items]) => items.map((link, index) => {
    const category = constellationCategory(link.categoria)
    const definition = constellationCategories[category]
    const angle = (-90 + (360 / Math.max(items.length, 1)) * index + (orbit === 2 ? 18 : orbit === 3 ? 8 : 0)) * Math.PI / 180
    const radius = radii[orbit as keyof typeof radii]
    return { link, category, ...definition, x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius, index }
  }))
})
const currentConstellationLink = computed(() => constellationStars.value.find((star) => star.link.id === selectedConstellationLink.value) ?? null)
const constellationOrbitCounts = computed(() => [1, 2, 3].map((orbit) => constellationStars.value.filter((star) => star.orbit === orbit).length))
function updateConstellationState() { constellationActive.value = constellationIntersecting && !document.hidden }
type CareMuralItem = ((Companion & { kind: 'compañero' }) | (Plant & { kind: 'planta' })) & { demoLabel?: string }
interface WorldDisplayItem { id: string; kind?: string; nombre?: string; texto?: string; categoria?: string; activaciones?: number; cumplido?: boolean; sensacion?: string; estado?: string; tipo?: string; especie?: string; sesiones?: number }
const careItems = computed<CareMuralItem[]>(() => [
  ...companions.items.value.map((item) => ({ ...item, kind: 'compañero' as const })),
  ...plants.items.value.map((item) => ({ ...item, kind: 'planta' as const })),
])
const careDemoItems: CareMuralItem[] = [
  { id: 'demo-care-mint', kind: 'planta', nombre: 'Menta', tipo: 'Planta aromática', nota: 'La constancia también tiene aroma.', imagen: '/src/assets/care-demo/menta.webp', demoLabel: 'Muestra · Planta' },
  { id: 'demo-care-cat', kind: 'compañero', nombre: 'Sombra', especie: 'Gato', nota: 'Cuidar es ofrecer un lugar seguro.', imagen: '/src/assets/care-demo/gato.webp', demoLabel: 'Muestra · Compañero' },
  { id: 'demo-care-flowers', kind: 'planta', nombre: 'El jardín', tipo: 'Flores', nota: 'Lo que atiendo con paciencia encuentra su forma.', imagen: '/src/assets/care-demo/flores.webp', demoLabel: 'Muestra · Jardín' },
  { id: 'demo-care-corner', kind: 'compañero', nombre: 'Mi refugio', nota: 'Un rincón que cuido para volver a mí.', imagen: '/src/assets/care-demo/rincon.webp', demoLabel: 'Muestra · Refugio' },
  { id: 'demo-care-kintsugi', kind: 'compañero', nombre: 'La taza reparada', nota: 'Lo vivido no se oculta: se vuelve parte de su belleza.', imagen: '/src/assets/care-demo/taza-kintsugi.webp', demoLabel: 'Muestra · Objeto' },
]
const careDisplayItems = computed(() => import.meta.env.DEV ? [...careItems.value, ...careDemoItems] : careItems.value)
const careGalleryItems = computed(() => [...careDisplayItems.value].reverse())
const careMuralColumns = computed(() => {
  const columns: { item: CareMuralItem; index: number }[][] = [[], []]
  careGalleryItems.value.forEach((item, index) => { columns[index % 2].push({ item, index }) })
  return columns.filter((column) => column.length)
})
function carePosterShape(index: number, total: number) {
  if (total === 1) return 'is-lone'
  const desk = index % 6
  const hand = index % 4
  return [
    desk === 0 ? 'is-tall' : desk === 1 ? 'is-wide' : desk === 4 ? 'is-panorama' : desk === 5 ? 'is-narrow' : 'is-portrait',
    hand === 1 ? 'is-square' : hand === 2 ? 'is-ledge' : 'is-column',
  ].join(' ')
}
const careGalleryIndex = ref<number | null>(null)
const careGalleryPanel = ref<HTMLElement | null>(null)
const careGalleryTrack = ref<HTMLElement | null>(null)
let careGallerySyncing = false
let careGalleryScrollTimer = 0
function worldPrimary(item: WorldDisplayItem | CareMuralItem) { return String(item.nombre ?? ('texto' in item ? item.texto : '') ?? '') }
function resetWorldForm() {
  Object.assign(worldForm, { nombre: '', categoria: props.detail === 'world-decretos' ? 'ser' : 'Amistad', signo: '', texto: '', sensacion: '', estado: 'decretado', nota: '', momento: '', lat: 0, lng: 0, tipo: 'compañero', detalle: '', especie: '', lugar: 'interior', nacimiento: '', control: '', careOpen: false, imagen: '' })
  careImageError.value = ''
  journeyLocationSelected.value = false
  journeyLocationMessage.value = ''
  journeyQuery.value = ''
  journeyResults.value = []
}
function loadCareImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')) }
    image.src = url
  })
}
async function prepareCareImage(file: File, maxSide = 1400) {
  careImageError.value = ''
  if (!file.type.startsWith('image/')) { careImageError.value = 'Elige un archivo de imagen.'; return }
  if (file.size > 12 * 1024 * 1024) { careImageError.value = 'La imagen supera 12 MB. Elige una más liviana.'; return }
  careImageLoading.value = true
  try {
    const image = await loadCareImage(file)
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = Math.min(1, maxSide / longestSide)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la imagen.')
    context.fillStyle = '#080b11'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', .84)
  } catch (error) {
    careImageError.value = error instanceof Error ? error.message : 'No se pudo preparar la imagen.'
    return ''
  } finally { careImageLoading.value = false }
}
function closeCareComposer() {
  careComposerOpen.value = false
  worldForm.imagen = ''
  worldForm.nombre = ''
  worldForm.nota = ''
  worldForm.tipo = 'compañero'
  worldForm.especie = ''
  worldForm.lugar = 'interior'
  worldForm.nacimiento = ''
  worldForm.control = ''
  worldForm.careOpen = false
  careImageError.value = ''
}
function openConstellationComposer() { constellationComposerOpen.value = true }
function closeConstellationComposer() { constellationComposerOpen.value = false }
function openJourneyComposer() { journeyComposerOpen.value = true }
function closeJourneyComposer() { journeyComposerOpen.value = false }
function openHobbyComposer() {
  worldForm.nombre = ''
  worldForm.sensacion = ''
  hobbyComposerOpen.value = true
}
function closeHobbyComposer() { hobbyComposerOpen.value = false }
function openDecreeComposer() { decreeComposerOpen.value = true }
function closeDecreeComposer() { decreeComposerOpen.value = false }
async function onCareImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  carePane.value = 'mural'
  const prepared = await prepareCareImage(file)
  if (!prepared) return
  worldForm.imagen = prepared
  careComposerOpen.value = true
}
async function onCareImageDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  const prepared = await prepareCareImage(file)
  if (!prepared) return
  worldForm.imagen = prepared
  careComposerOpen.value = true
}
async function onMemoryImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) memoryForm.imagen = await prepareCareImage(file, 400) || memoryForm.imagen
  input.value = ''
}
async function addWorldItem() {
  if (worldSaving.value) return
  worldSaving.value = true
  const created = new Date().toISOString()
  try {
    if (props.detail === 'world-vinculos' && worldForm.nombre.trim()) {
      await links.add({ nombre: worldForm.nombre.trim(), categoria: worldForm.categoria, signo: worldForm.signo, nota: worldForm.nota.trim(), fecha_creacion: created })
      selectedConstellationLink.value = links.items.value.at(-1)?.id ?? null
    }
    else if (props.detail === 'world-decretos' && worldForm.texto.trim()) await decrees.add({ texto: worldForm.texto.trim(), categoria: worldForm.categoria as Decree['categoria'], activaciones: 0, cumplido: false, fecha_cumplimiento: null, fecha_creacion: created })
    else if (props.detail === 'world-hobbies' && worldForm.nombre.trim() && worldForm.sensacion.trim()) {
      await hobbies.add({ nombre: worldForm.nombre.trim(), sensacion: worldForm.sensacion.trim(), estado: 'activo', sesiones: 0, flow_ultimo: 1, momentos: [], ultima_vez: created, fecha_creacion: created })
      selectedHobbyId.value = hobbies.items.value.at(-1)?.id ?? null
    }
    else if (props.detail === 'world-travesias' && worldForm.nombre.trim()) {
      if (!journeyLocationSelected.value) { journeyLocationMessage.value = 'Busca un lugar para crear la postal.'; return }
      await journeys.add({ nombre: worldForm.nombre.trim(), estado: worldForm.estado as Journey['estado'], nota: worldForm.nota.trim(), momento: worldForm.estado === 'visitado' ? worldForm.momento.trim() : '', lat: Math.max(-90, Math.min(90, worldForm.lat)), lng: Math.max(-180, Math.min(180, worldForm.lng)), fecha_creacion: created })
    }
    else if (props.detail === 'world-cuidado' && worldForm.nombre.trim()) {
      if (worldForm.tipo === 'planta') await plants.add({ nombre: worldForm.nombre.trim(), tipo: worldForm.lugar === 'exterior' ? 'Exterior' : 'Interior', lugar: worldForm.lugar, nota: worldForm.nota.trim(), imagen: worldForm.imagen, fecha_creacion: created })
      else {
        const companion: Omit<Companion, 'id'> = {
          nombre: worldForm.nombre.trim(),
          especie: worldForm.especie,
          nota: worldForm.nota.trim(),
          imagen: worldForm.imagen,
          fecha_creacion: created,
        }
        if (worldForm.nacimiento) {
          companion.fecha_nacimiento = worldForm.nacimiento
          companion.fecha_importante = worldForm.nacimiento
        }
        if (worldForm.control) companion.proximo_control = worldForm.control
        await companions.add(companion)
      }
    } else return
    resetWorldForm()
    careComposerOpen.value = false
    constellationComposerOpen.value = false
    journeyComposerOpen.value = false
    hobbyComposerOpen.value = false
    decreeComposerOpen.value = false
    emit('changed')
  } finally { worldSaving.value = false }
}
const selectedDecree = ref<Decree | null>(null)
const decreeTaps = ref(0)
const decreeDone = ref(false)
const decreeClaim = ref<Decree | null>(null)
let decreeHoldCompleted = false
let decreeHoldTimer: ReturnType<typeof setTimeout> | undefined
async function tapDecree() {
  if (!selectedDecree.value || decreeDone.value) return
  decreeTaps.value += 1
  navigator.vibrate?.(10)
  if (decreeTaps.value < 3) return
  const activations = Number(selectedDecree.value.activaciones ?? 0) + 1
  await decrees.update(selectedDecree.value.id, { activaciones: activations })
  if (activations === 7) await declarations.add({ texto: '', timestamp: new Date().toISOString(), origen: 'decreto_mundos', fecha_creacion: new Date().toISOString() })
  decreeDone.value = true
  emit('changed')
  window.setTimeout(() => { selectedDecree.value = null; decreeTaps.value = 0; decreeDone.value = false }, 1900)
}
function startDecreeHold(item: Decree) {
  clearTimeout(decreeHoldTimer)
  decreeHoldCompleted = false
  decreeHoldTimer = setTimeout(() => { decreeHoldCompleted = true; decreeClaim.value = item }, 650)
}
function cancelDecreeHold() { clearTimeout(decreeHoldTimer) }
async function claimDecree() {
  if (!decreeClaim.value) return
  await decrees.update(decreeClaim.value.id, { cumplido: true, fecha_cumplimiento: new Date().toISOString() })
  decreeClaim.value = null
  emit('changed')
}
async function activateWorldItem(item: WorldDisplayItem) {
  if (item.kind === 'decreto') {
    if (decreeHoldCompleted) { decreeHoldCompleted = false; return }
    selectedDecree.value = decrees.items.value.find((entry) => entry.id === item.id) ?? null
    decreeTaps.value = 0
    decreeDone.value = false
    return
  }
  emit('changed')
}
async function addHobbyMoment() {
  if (!selectedHobby.value || !hobbyMomentText.value.trim()) return
  const last = new Date().toISOString()
  const momentos = [...hobbyMoments(selectedHobby.value), { id: makeId(), texto: hobbyMomentText.value.trim(), fecha: last }]
  await hobbies.update(selectedHobby.value.id, { momentos, ultima_vez: last, estado: 'activo' })
  hobbyMomentText.value = ''
  hobbySaved.value = true
  window.clearTimeout(hobbySavedTimer)
  hobbySavedTimer = window.setTimeout(() => { hobbySaved.value = false }, 2200)
  emit('changed')
}
async function liveJourney(id: string) {
  await journeys.update(id, { estado: 'visitado' })
  emit('changed')
}
async function saveJourneyMemory() {
  if (!selectedJourney.value) return
  await journeys.update(selectedJourney.value.id, { momento: journeyEdit.momento.trim(), nota: journeyEdit.nota.trim() })
  emit('changed')
}
async function confirmForgetJourney() {
  if (!journeyForget.value) return
  await journeys.remove(journeyForget.value.id)
  if (selectedJourneyId.value === journeyForget.value.id) selectedJourneyId.value = null
  journeyForget.value = null
  emit('changed')
}
async function addCareMemory() {
  if (!memoryForm.nombre.trim() || memorySaving.value) return
  memorySaving.value = true
  try {
    await memories.add({ nombre: memoryForm.nombre.trim(), frase: memoryForm.frase.trim(), imagen: memoryForm.imagen, fecha_creacion: new Date().toISOString() })
    Object.assign(memoryForm, { nombre: '', frase: '', imagen: '' })
    emit('changed')
  } finally { memorySaving.value = false }
}
async function greetDecrees() {
  if (props.detail !== 'world-decretos') { decreeGate.value = null; return }
  const seen = (await storage.get<boolean>('decretos_bienvenida')) ?? false
  if (!seen) { decreeGate.value = 'first'; return }
  if (!decrees.loaded.value) return
  if (decrees.items.value.length) {
    decreeOwn.value = decrees.items.value[Math.floor(Math.random() * decrees.items.value.length)] ?? null
    decreeGate.value = 'own'
  } else decreeGate.value = null
}
async function passDecreeGate() {
  if (decreeGate.value === 'first') await storage.set('decretos_bienvenida', true)
  if (decrees.items.value.length && decreeGate.value === 'first') {
    decreeOwn.value = decrees.items.value[Math.floor(Math.random() * decrees.items.value.length)] ?? null
    decreeGate.value = 'own'
    return
  }
  decreeGate.value = null
}
function onConstellationStar(id: string) {
  if (selectedConstellationLink.value === id) {
    constellationExpanded.value = true
    return
  }
  selectedConstellationLink.value = id
  constellationExpanded.value = false
}
function careAgeLines(item: CareMuralItem) {
  if (item.kind !== 'compañero') return []
  const birth = item.fecha_nacimiento || item.fecha_importante
  const lines: string[] = []
  const born = formatCareDate(birth)
  if (born) lines.push(born)
  const next = formatCareDate(item.proximo_control)
  if (next) lines.push(`Próximo control: ${next}`)
  const human = companionHumanYears(item.especie, birth)
  if (human != null) lines.push(`~ ${human} en años de los tuyos.`)
  return lines
}
function closeCareGallery() {
  careGalleryIndex.value = null
  document.body.style.overflow = ''
}
function openCareGallery(index: number) {
  careGalleryIndex.value = index
  document.body.style.overflow = 'hidden'
}
function scrollCareGalleryTo(index: number, behavior: ScrollBehavior = 'smooth') {
  const track = careGalleryTrack.value
  if (!track) return
  careGallerySyncing = true
  window.clearTimeout(careGalleryScrollTimer)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  track.scrollTo({ left: index * track.clientWidth, behavior: reduced ? 'instant' : behavior })
  careGalleryScrollTimer = window.setTimeout(() => { careGallerySyncing = false }, reduced ? 30 : 480)
}
function goCareGallery(delta: number) {
  const total = careGalleryItems.value.length
  if (!total || careGalleryIndex.value === null) return
  const next = (careGalleryIndex.value + delta + total) % total
  careGalleryIndex.value = next
  scrollCareGalleryTo(next)
}
function onCareGalleryWindowKey(event: KeyboardEvent) {
  if (careGalleryIndex.value === null) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeCareGallery()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goCareGallery(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    goCareGallery(1)
  }
}
function onCareGalleryScroll() {
  const track = careGalleryTrack.value
  if (!track?.clientWidth || careGallerySyncing) return
  const index = Math.round(track.scrollLeft / track.clientWidth)
  if (index !== careGalleryIndex.value) careGalleryIndex.value = index
}
function selectJourneyLocation(location: { lat: number; lng: number; name?: string; label?: string }) {
  worldForm.lat = Number(location.lat.toFixed(5))
  worldForm.lng = Number(location.lng.toFixed(5))
  worldForm.nombre = location.name ?? location.label ?? `${worldForm.lat}, ${worldForm.lng}`
  journeyLocationSelected.value = true
  journeyLocationMessage.value = ''
}
const journeyQuery = ref('')
const journeyResults = ref<{ display_name: string; lat: string; lon: string; name?: string; addresstype?: string }[]>([])
const journeySearching = ref(false)
let journeySearchController: AbortController | undefined
async function journeySearch() {
  const query = journeyQuery.value.trim()
  if (query.length < 2) { journeyLocationMessage.value = 'Escribe al menos dos caracteres.'; return }
  journeySearchController?.abort()
  journeySearchController = new AbortController()
  journeySearching.value = true
  journeyResults.value = []
  journeyLocationMessage.value = ''
  try {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', addressdetails: '1', 'accept-language': 'es' })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: journeySearchController.signal })
    if (!response.ok) throw new Error('No se pudo consultar el mapa.')
    const results = await response.json() as typeof journeyResults.value
    const localityRank = ['city', 'town', 'municipality', 'village', 'hamlet']
    const rank = (result: { addresstype?: string }) => { const index = localityRank.indexOf(result.addresstype ?? ''); return index < 0 ? localityRank.length : index }
    journeyResults.value = results.sort((a, b) => rank(a) - rank(b))
    if (!journeyResults.value.length) journeyLocationMessage.value = 'No encontramos ese lugar. Prueba con ciudad y país.'
  } catch (error) {
    if ((error as Error).name !== 'AbortError') journeyLocationMessage.value = 'La búsqueda necesita conexión.'
  } finally { journeySearching.value = false }
}
function chooseJourneyResult(result: { display_name: string; lat: string; lon: string; name?: string }) {
  const lat = Number(result.lat)
  const lng = Number(result.lon)
  const name = result.name || result.display_name.split(',')[0]?.trim()
  selectJourneyLocation(name ? { lat, lng, name, label: result.display_name } : { lat, lng, label: result.display_name })
  journeyResults.value = []
  journeyQuery.value = result.display_name
}
watch(selectedJourney, async (item) => {
  journeyEdit.momento = item?.momento ?? ''
  journeyEdit.nota = item?.nota ?? ''
  if (!item || props.detail !== 'world-travesias') return
  await nextTick()
  const form = document.querySelector('.journey-postcard-edit')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  form?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
})
watch(() => props.detail, () => {
  resetWorldForm()
  careComposerOpen.value = false
  constellationComposerOpen.value = false
  journeyComposerOpen.value = false
  hobbyComposerOpen.value = false
  decreeComposerOpen.value = false
  selectedHobbyId.value = null
  selectedJourneyId.value = null
  carePane.value = 'mural'
  closeCareGallery()
  constellationExpanded.value = false
  selectedConstellationLink.value = null
  void greetDecrees()
}, { immediate: true })
watch(carePane, (pane) => {
  if (pane !== 'mural') {
    closeCareComposer()
    closeCareGallery()
  }
})
watch(careGalleryIndex, async (index, previous) => {
  if (index === null) {
    window.removeEventListener('keydown', onCareGalleryWindowKey)
    return
  }
  window.addEventListener('keydown', onCareGalleryWindowKey)
  await nextTick()
  if (previous === null) {
    scrollCareGalleryTo(index, 'instant')
    careGalleryPanel.value?.focus()
  }
})
watch(careComposerOpen, async (open) => {
  if (!open) return
  await nextTick()
  careComposerPanel.value?.focus()
})
watch(constellationComposerOpen, async (open) => {
  if (!open) return
  await nextTick()
  constellationComposerPanel.value?.focus()
})
watch(journeyComposerOpen, async (open) => {
  if (!open) return
  await nextTick()
  journeyComposerPanel.value?.focus()
})
watch(hobbyComposerOpen, async (open) => {
  if (!open) return
  await nextTick()
  hobbyComposerPanel.value?.focus()
})
watch(decreeComposerOpen, async (open) => {
  if (!open) return
  await nextTick()
  decreeComposerPanel.value?.focus()
})
watch(() => decrees.loaded.value, (ready) => { if (ready) void greetDecrees() })

const balancePane = ref<'flujo' | 'metas'>('flujo')
const baseIncome = ref(0)
const baseIncomeEditing = ref(false)
const baseIncomeField = ref<HTMLInputElement | null>(null)
const baseIncomeSaved = ref(false)
let baseIncomeSavedTimer = 0
const movementOpen = ref(false)
const movement = reactive({ tipo: 'gasto' as 'ingreso' | 'gasto', monto: 0, categoria: 'El nido', nota: '', recurrente: false })
const goal = reactive({ nombre: '', objetivo: 0, color: '#C9A86A' })
const categories = ['El nido', 'El cuerpo', 'El movimiento', 'El cuidado', 'Lo inesperado', 'Lo que construyo']
const goalColors = [{ name: 'Suerte y fuerza', value: '#C0392B' }, { name: 'Dinero y prosperidad', value: '#C9A86A' }, { name: 'Nuevo comienzo', value: '#F5F0E6' }, { name: 'Crecimiento personal', value: '#9B7D9B' }, { name: 'Salud y bienestar', value: '#7D9B8A' }, { name: 'Trabajo y logros', value: '#5B8DB8' }, { name: 'Protección', value: '#2C2C2C' }, { name: 'Amor y cuidado propio', value: '#D4849A' }]
const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
// Mismo cálculo y misma clave de privacidad que la portada, para que las dos superficies no se contradigan.
const balanceAmountVisible = ref(false)
const balanceIn = computed(() => movements.items.value.reduce((sum, item) => sum + (item.tipo === 'ingreso' ? Number(item.monto) || 0 : 0), 0))
const balanceOut = computed(() => movements.items.value.reduce((sum, item) => sum + (item.tipo === 'gasto' ? Number(item.monto) || 0 : 0), 0))
const balanceTotal = computed(() => (Number.isFinite(baseIncome.value) ? Number(baseIncome.value) : 0) + balanceIn.value - balanceOut.value)
function maskedAmount(value: number) { return balanceAmountVisible.value ? currency.format(value) : '$•••••' }
async function toggleBalanceAmount() {
  balanceAmountVisible.value = !balanceAmountVisible.value
  await storage.set('balance_oculto', !balanceAmountVisible.value)
}
async function startBaseIncomeEdit() {
  baseIncomeEditing.value = true
  await nextTick()
  baseIncomeField.value?.focus()
  baseIncomeField.value?.select()
}
async function saveBaseIncome() {
  const amount = Number.isFinite(Number(baseIncome.value)) ? Math.max(0, Number(baseIncome.value)) : 0
  baseIncome.value = amount
  await storage.set('balance_ingreso_base', amount)
  emit('changed')
  baseIncomeEditing.value = false
  baseIncomeSaved.value = true
  window.clearTimeout(baseIncomeSavedTimer)
  baseIncomeSavedTimer = window.setTimeout(() => { baseIncomeSaved.value = false }, 2200)
}
async function onBaseIncomeAction() {
  if (!baseIncomeEditing.value) {
    await startBaseIncomeEdit()
    return
  }
  await saveBaseIncome()
}
function openMovement(tipo: 'ingreso' | 'gasto') {
  movement.tipo = tipo
  movementOpen.value = true
}
async function addMovement() {
  if (!movementOpen.value || movement.monto <= 0) return
  const now = new Date().toISOString()
  await movements.add({ ...movement, fecha: now, fecha_creacion: now })
  movement.monto = 0; movement.nota = ''; movementOpen.value = false; emit('changed')
}
async function addGoal() {
  if (!goal.nombre.trim() || goal.objetivo <= 0) return
  await darumas.add({ nombre: goal.nombre.trim(), objetivo: goal.objetivo, acumulado: 0, color: goal.color, daruma_transferido: false, fecha_creacion: new Date().toISOString() })
  goal.nombre = ''; goal.objetivo = 0; emit('changed')
}
const darumaContribution = reactive<Record<string, number>>({})
async function addDarumaProgress(item: Daruma) {
  const amount = Math.max(0, Number(darumaContribution[item.id] ?? 0)); if (!amount) return
  await darumas.update(item.id, { acumulado: Math.min(item.objetivo, item.acumulado + amount) })
  darumaContribution[item.id] = 0
  emit('changed')
}
async function transferDaruma(item: Daruma) {
  if (item.acumulado < item.objetivo || item.daruma_transferido) return
  const now = new Date().toISOString()
  await declarations.add({ texto: '', timestamp: now, origen: 'daruma_balance', daruma_color: item.color, fecha_creacion: now })
  await darumas.update(item.id, { daruma_transferido: true })
  emit('changed')
}

const thoughtText = ref('')
const selectedThought = ref<string | null>(null)
const nucleusError = ref('')
const melody = ref<string[]>([])
const notes = MELODY_NOTES
const nucleusHintNote = ref('')
const nucleusHinting = ref(false)
let nucleusHintTimer = 0
const timeBand = () => { const hour = new Date().getHours(); return hour >= 6 && hour < 12 ? 'dia' : hour < 20 ? 'tarde' : 'noche' }
const nucleusUnlocked = ref(sessionStorage.getItem(`aureo_nucleo_${timeBand()}`) === '1' || !profile.profile?.clave_app_hash)
const thoughtCloth = ref<HTMLElement | null>(null)
const thoughtDialog = ref<HTMLElement | null>(null)
const plasmaActive = ref(false)
let clothIntersecting = false
let plasmaObserver: IntersectionObserver | undefined
const groupedThoughts = computed(() => groupNucleusThoughts(thoughts.items.value))
const activeEmotionClusters = computed(() => activeNucleusEmotionClusters(groupedThoughts.value))
const currentThought = computed(() => thoughts.items.value.find((item) => item.id === selectedThought.value) ?? null)
const currentThoughtEmotion = computed(() => currentThought.value ? nucleusEmotions[normalizeNucleusTone(currentThought.value.tono)] : null)
function updatePlasmaState() { plasmaActive.value = clothIntersecting && !document.hidden }
function handleVisibilityChange() { updatePlasmaState(); updateConstellationState(); updateDarumaState() }
async function pressNote(note: string) {
  unlockTone()
  playTone(note)
  if (melody.value.length >= 3) melody.value = []
  melody.value.push(note)
  if (melody.value.length !== 3) return
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(melody.value.join('|')))
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
  if (hash === profile.profile?.clave_app_hash) {
    playChord(melody.value)
    sessionStorage.setItem(`aureo_nucleo_${timeBand()}`, '1'); nucleusUnlocked.value = true; nucleusError.value = ''
  } else { nucleusError.value = 'No es esa. Respira y vuelve a intentarlo.'; melody.value = [] }
}
async function hintNucleusMelody() {
  if (nucleusHinting.value) return
  nucleusHinting.value = true
  nucleusError.value = ''
  unlockTone()
  const recovered = await recoverMelodyNotes(profile.profile?.clave_app_hash)
  if (!recovered) {
    nucleusError.value = 'No pude recordar el orden. Prueba de nuevo más tarde.'
    nucleusHinting.value = false
    return
  }
  const wait = (ms: number) => new Promise<void>((resolve) => { nucleusHintTimer = window.setTimeout(resolve, ms) })
  for (const note of recovered) {
    nucleusHintNote.value = note
    playTone(note)
    await wait(720)
  }
  nucleusHintNote.value = ''
  nucleusHinting.value = false
}
async function addThought() {
  const value = thoughtText.value.trim(); if (!value) return
  const now = new Date().toISOString()
  await thoughts.add({ texto: value, tono: recognizeNucleusTone(value), x: 12 + Math.random() * 76, y: 14 + Math.random() * 70, simbolo: ['moon', 'star'][Math.floor(Math.random() * 2)]!, timestamp: now, fecha_creacion: now })
  thoughtText.value = ''; emit('changed')
}
function thoughtDate(value: string) { return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }

const selectedDeclaration = ref<string | null>(null)
watch(() => props.detail, () => {
  selectedThought.value = null
  selectedDeclaration.value = null
  movementOpen.value = false
  baseIncomeEditing.value = false
})
const currentDeclaration = computed(() => declarations.items.value.find((item) => item.id === selectedDeclaration.value) ?? null)
const selectedCrack = computed(() => goldenCracks.value.find((crack) => crack.declaration.id === selectedDeclaration.value) ?? null)
const darumaStage = ref<HTMLElement | null>(null)
const darumaActive = ref(false)
let darumaIntersecting = false
let darumaObserver: IntersectionObserver | undefined
const resinStyle = computed(() => ({ '--sign-color': ({ aries: '#B86D5D', leo: '#B86D5D', sagitario: '#B86D5D', tauro: '#7DA797', virgo: '#7DA797', capricornio: '#7DA797', geminis: '#5B8DB8', libra: '#5B8DB8', acuario: '#5B8DB8', cancer: '#9B7D9B', escorpio: '#9B7D9B', piscis: '#9B7D9B' } as Record<string, string>)[profile.profile?.signo ?? 'aries'] ?? '#B86D5D' }))
const goldenCracks = computed(() => declarations.items.value.map((declaration, index, items) => {
  const age = items.length - 1 - index
  const pattern = goldenDarumaCrackPatterns[age % goldenDarumaCrackPatterns.length]!
  const cycle = Math.floor(age / goldenDarumaCrackPatterns.length)
  return { declaration, age, pattern, transform: cycle ? `rotate(${cycle % 2 ? 4 : -4} 180 245) translate(${cycle % 2 ? -3 : 3} ${cycle * -2})` : undefined }
}))
function goldenDeclarationCopy(item: GoldenDeclaration) { return item.texto?.trim() || (item.origen === 'daruma_balance' ? 'Un propósito que elegiste completar.' : item.origen === 'decreto_mundos' ? 'Un decreto que encendiste.' : item.origen === 'hobby_flow_total' ? 'Un momento de plenitud.' : item.origen === 'pulso_umbral' ? 'Un pulso del día.' : 'Un momento elegido por ti.') }
function goldenDeclarationOrigin(item: GoldenDeclaration) { return item.origen === 'daruma_balance' ? 'Daruma cumplido' : item.origen === 'decreto_mundos' ? 'Decreto encendido' : item.origen === 'hobby_flow_total' ? 'Momento de flow' : item.origen === 'pulso_umbral' ? 'Pulso de hoy' : 'Declaración presente' }
function goldenDeclarationDate(value: string) { return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }
function updateDarumaState() { darumaActive.value = darumaIntersecting && !document.hidden }

const intentionText = ref('')
const pulseText = ref('')
const dateKey = () => localDateKey()
const dailyPrompt = computed(() => dailyPulsePrompt(dateKey()))
const todayIntentions = computed(() => intentions.items.value.filter((item) => (!item.fecha || item.fecha === dateKey()) && !(item.completada ?? item.done)))
const todayPulse = computed(() => [...pulses.items.value].reverse().find((item) => item.fecha === dateKey()))
async function addIntention() {
  const value = intentionText.value.trim(); if (!value) return
  await intentions.add({ texto: value, txt: value, completada: false, done: false, fecha: dateKey(), fecha_creacion: new Date().toISOString() })
  intentionText.value = ''; emit('changed')
}
async function completeIntention(item: Intention) { await intentions.remove(item.id); emit('changed') }
async function rememberPulseInGoldenAge(respuesta: string) {
  const today = dateKey()
  const existing = declarations.items.value.find((item) => item.origen === 'pulso_umbral' && isSameLocalDay(item.timestamp, today))
  const now = new Date().toISOString()
  if (existing) await declarations.update(existing.id, { texto: respuesta, timestamp: now })
  else await declarations.add({ texto: respuesta, timestamp: now, fecha_creacion: now, origen: 'pulso_umbral' })
}
async function savePulse() {
  const value = pulseText.value.trim(); if (!value) return
  if (todayPulse.value) await pulses.update(todayPulse.value.id, { pregunta: dailyPrompt.value, respuesta: value })
  else await pulses.add({ pregunta: dailyPrompt.value, respuesta: value, fecha: dateKey(), fecha_creacion: new Date().toISOString() })
  await rememberPulseInGoldenAge(value)
  pulseText.value = ''; emit('changed')
}

watch(() => props.intentionDraft, (value) => {
  if (!value) return
  intentionText.value = value
  emit('draft-consumed')
}, { immediate: true })

watch(() => props.initialAction, (action) => { balancePane.value = action === 'meta' ? 'metas' : 'flujo' }, { immediate: true })
watch(thoughtCloth, (node, previous) => { if (previous) plasmaObserver?.unobserve(previous); if (node) plasmaObserver?.observe(node) })
watch(constellationMap, (node, previous) => { if (previous) constellationObserver?.unobserve(previous); if (node) constellationObserver?.observe(node) })
watch(darumaStage, (node, previous) => { if (previous) darumaObserver?.unobserve(previous); if (node) darumaObserver?.observe(node) })
watch(selectedThought, async (value) => { if (value) { await nextTick(); thoughtDialog.value?.focus() } })
onMounted(async () => {
  baseIncome.value = (await storage.get<number>('balance_ingreso_base')) ?? 0
  balanceAmountVisible.value = !((await storage.get<boolean>('balance_oculto')) ?? true)
  plasmaObserver = new IntersectionObserver(([entry]) => { clothIntersecting = entry?.isIntersecting ?? false; updatePlasmaState() }, { threshold: .05 })
  constellationObserver = new IntersectionObserver(([entry]) => { constellationIntersecting = entry?.isIntersecting ?? false; updateConstellationState() }, { threshold: .05 })
  darumaObserver = new IntersectionObserver(([entry]) => { darumaIntersecting = entry?.isIntersecting ?? false; updateDarumaState() }, { threshold: .05 })
  if (thoughtCloth.value) plasmaObserver.observe(thoughtCloth.value)
  if (constellationMap.value) constellationObserver.observe(constellationMap.value)
  if (darumaStage.value) darumaObserver.observe(darumaStage.value)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})
onBeforeUnmount(() => { window.clearTimeout(nucleusHintTimer); window.clearTimeout(baseIncomeSavedTimer); window.clearTimeout(hobbySavedTimer); window.clearTimeout(careGalleryScrollTimer); window.removeEventListener('keydown', onCareGalleryWindowKey); document.body.style.overflow = ''; clearTimeout(decreeHoldTimer); plasmaObserver?.disconnect(); constellationObserver?.disconnect(); darumaObserver?.disconnect(); document.removeEventListener('visibilitychange', handleVisibilityChange) })

defineExpose({ onCareImageChange, careImageLoading, openConstellationComposer, openJourneyComposer, openHobbyComposer, openDecreeComposer })
</script>

<template>
  <section class="tw-workspace" :class="`detail-${detail}`" :aria-label="title">
    <span class="workspace-aura" aria-hidden="true" />
    <header class="workspace-header">
      <button type="button" class="workspace-back" :aria-label="`Volver a ${isWorld ? 'Mundos' : title}`" @click="emit('close')"><AppIcon name="back" /></button>
      <div class="workspace-title" :class="{ 'workspace-title-quiet': detail === 'edad-dorada' }">
        <nav v-if="detail === 'balance'" class="workspace-panes" role="tablist" aria-label="Espacios de Mi Balance">
          <button type="button" id="balance-tab-flujo" role="tab" aria-controls="balance-panel-flujo" :aria-selected="balancePane === 'flujo'" @click="balancePane = 'flujo'">Mi Balance</button>
          <button type="button" id="balance-tab-metas" role="tab" aria-controls="balance-panel-metas" :aria-selected="balancePane === 'metas'" @click="balancePane = 'metas'">Lo que construyo</button>
        </nav>
        <div v-else class="workspace-heading">
          <BlurText v-if="isWorld" :key="detail" :text="title" direction="top" animate-by="words" />
          <h1 v-else>{{ title }}</h1>
          <p v-if="detail === 'nucleo'">Permanece solo en este dispositivo.</p>
          <p v-else-if="detail === 'world-decretos'" class="workspace-title-of">Lo que decretas, ya es.</p>
        </div>
      </div>
    </header>

    <div v-if="isWorld && detail === 'world-cuidado'" class="care-mural-space">
      <section v-if="carePane === 'mural'" class="care-mural" aria-label="Mural de lo que cuido" @dragover.prevent @drop.prevent="onCareImageDrop">
        <button type="button" class="care-heart" aria-label="En mi corazón" @click="carePane = 'memoria'"><AppIcon name="heart" /></button>
        <div v-if="careGalleryItems.length" class="care-mural-grid">
          <div v-for="(column, col) in careMuralColumns" :key="col" class="care-mural-col">
            <article
              v-for="entry in column"
              :key="String(entry.item.id)"
              class="care-poster"
              :class="carePosterShape(entry.index, careGalleryItems.length)"
              :style="{ '--poster-index': entry.index, order: entry.index }"
              role="button"
              tabindex="0"
              :aria-label="`Ver ${worldPrimary(entry.item)}`"
              @click="openCareGallery(entry.index)"
              @keydown.enter.prevent="openCareGallery(entry.index)"
              @keydown.space.prevent="openCareGallery(entry.index)"
            >
              <img v-if="entry.item.imagen" :src="String(entry.item.imagen)" :alt="worldPrimary(entry.item)" />
              <span v-else class="care-poster-memory" aria-hidden="true"><AppIcon :name="entry.item.kind === 'planta' ? 'plants' : 'companions'" /><b>{{ worldPrimary(entry.item).slice(0, 1) }}</b></span>
              <span class="care-poster-shade" aria-hidden="true" />
              <span class="care-poster-frame" aria-hidden="true" />
              <div class="care-poster-inscription">
                <small>{{ entry.item.demoLabel ?? (entry.item.kind === 'planta' ? (entry.item.lugar === 'exterior' ? 'Exterior' : 'Interior') : companionSpeciesLabel(entry.item.especie)) }}</small>
                <h2>{{ worldPrimary(entry.item) }}</h2>
                <p v-if="entry.item.nota">{{ entry.item.nota }}</p>
                <em v-for="line in careAgeLines(entry.item)" :key="line">{{ line }}</em>
              </div>
              <span v-if="careInitials" class="care-poster-seal">{{ careInitials }}</span>
            </article>
          </div>
        </div>
        <div v-else class="care-mural-empty"><AppIcon name="plants" /><p>Lo que cuido, también me cuida.</p></div>
        <p v-if="careImageError && !careComposerOpen" class="care-image-error" role="alert">{{ careImageError }}</p>
      </section>

      <section v-else class="care-memory-space" aria-label="En mi corazón">
        <button type="button" class="workspace-back" aria-label="Volver al mural" @click="carePane = 'mural'"><AppIcon name="back" /></button>
        <p class="care-memory-lead">Lo que se queda, sin cuidados ni fechas.</p>
        <ul v-if="memories.items.value.length" class="care-memory-list">
          <li v-for="item in memories.items.value" :key="item.id">
            <img v-if="item.imagen" :src="item.imagen" :alt="item.nombre" />
            <div><strong>{{ item.nombre }}</strong><p v-if="item.frase">{{ item.frase }}</p></div>
          </li>
        </ul>
        <form class="care-poster-maker" @submit.prevent="addCareMemory">
          <div class="care-inscription-editor">
            <div class="care-image-pick" :class="{ ready: memoryForm.imagen, loading: careImageLoading }">
              <figure v-if="memoryForm.imagen" class="care-image-preview"><img :src="memoryForm.imagen" alt="Vista previa" /></figure>
              <label class="care-image-seal">
                <input type="file" accept="image/*" :disabled="careImageLoading" :aria-label="memoryForm.imagen ? 'Cambiar imagen' : 'Elegir una imagen, si la hay'" @change="onMemoryImageChange" />
                <AppIcon name="plus" />
              </label>
              <p v-if="!memoryForm.imagen">{{ careImageLoading ? 'Preparando imagen…' : 'Una imagen, si la hay' }}</p>
            </div>
            <label>Nombre<input v-model="memoryForm.nombre" required maxlength="120" /></label>
            <label>Una frase<textarea v-model="memoryForm.frase" maxlength="240" rows="3" placeholder="Lo que se queda de vos." /></label>
            <button class="care-publish" type="submit" :disabled="memorySaving || careImageLoading">{{ memorySaving ? 'Guardando…' : 'Dejarlo en el corazón' }}</button>
          </div>
        </form>
      </section>

      <Teleport to="body">
        <Transition name="care-composer">
          <div v-if="carePane === 'mural' && careComposerOpen && worldForm.imagen" class="care-composer-layer" role="presentation" @click.self="closeCareComposer">
            <section id="aureo-care-composer" ref="careComposerPanel" class="care-composer" role="dialog" aria-modal="true" aria-labelledby="aureo-care-composer-title" tabindex="-1" @keydown.esc.stop="closeCareComposer">
              <header>
                <h2 id="aureo-care-composer-title"><span class="care-composer-lead">Sumar</span> <span class="care-composer-of">al mural</span></h2>
                <button type="button" aria-label="Cerrar" @click="closeCareComposer"><AppIcon name="close" /></button>
              </header>
              <figure class="care-composer-preview">
                <img :src="worldForm.imagen" alt="Vista previa del afiche" />
              </figure>
              <form class="care-inscription-editor" @submit.prevent="addWorldItem">
                <fieldset class="care-kind-choice"><legend>¿Qué cuidas?</legend><button type="button" :class="{ active: worldForm.tipo === 'compañero' }" @click="worldForm.tipo = 'compañero'">Un compañero</button><button type="button" :class="{ active: worldForm.tipo === 'planta' }" @click="worldForm.tipo = 'planta'">Una planta</button></fieldset>
                <fieldset v-if="worldForm.tipo === 'compañero'" class="care-species"><legend>Especie</legend><button v-for="species in COMPANION_SPECIES" :key="species.id" type="button" :class="{ active: worldForm.especie === species.label }" :aria-pressed="worldForm.especie === species.label" :aria-label="species.label" @click="worldForm.especie = species.label"><AppIcon :name="species.icon" /><span>{{ species.label }}</span></button></fieldset>
                <fieldset v-else class="care-species"><legend>Lugar</legend><button v-for="place in PLANT_PLACES" :key="place.id" type="button" :class="{ active: worldForm.lugar === place.id }" :aria-pressed="worldForm.lugar === place.id" @click="worldForm.lugar = place.id"><AppIcon :name="place.icon" /><span>{{ place.label }}</span></button></fieldset>
                <label class="care-composer-name">Su nombre<input v-model="worldForm.nombre" required maxlength="120" placeholder="¿Cómo lo llamas?" /></label>
                <label>Una frase para el afiche<textarea v-model="worldForm.nota" maxlength="240" rows="3" placeholder="Lo que significa para ti…" /></label>
                <div v-if="worldForm.tipo === 'compañero'" class="care-notes">
                  <button type="button" class="care-notes-toggle" :aria-expanded="worldForm.careOpen" @click="worldForm.careOpen = !worldForm.careOpen">¿Quieres recordar algo más sobre su cuidado?</button>
                  <div v-if="worldForm.careOpen" class="care-notes-fields">
                    <label>Fecha de nacimiento<input v-model="worldForm.nacimiento" type="date" /></label>
                    <label>Próximo control<input v-model="worldForm.control" type="date" /></label>
                  </div>
                </div>
                <p v-if="careImageError" class="care-image-error" role="alert">{{ careImageError }}</p>
                <button class="care-publish" type="submit" :disabled="worldSaving || careImageLoading">{{ worldSaving ? 'Guardando…' : 'Sumar al mural' }}</button>
              </form>
            </section>
          </div>
        </Transition>
      </Teleport>
      <Teleport to="body">
        <Transition name="care-gallery">
          <div v-if="careGalleryIndex !== null" class="care-gallery-layer" role="presentation" @click.self="closeCareGallery">
            <section
              id="aureo-care-gallery"
              ref="careGalleryPanel"
              class="care-gallery"
              role="dialog"
              aria-modal="true"
              aria-label="Afiche del mural"
              tabindex="-1"
              @keydown.esc.stop="closeCareGallery"
              @keydown.left.prevent="goCareGallery(-1)"
              @keydown.right.prevent="goCareGallery(1)"
            >
              <button type="button" class="care-gallery-close" aria-label="Cerrar afiche" @click="closeCareGallery"><AppIcon name="close" /></button>
              <div ref="careGalleryTrack" class="care-gallery-track" @scroll.passive="onCareGalleryScroll">
                <article v-for="(item, index) in careGalleryItems" :key="String(item.id)" class="care-gallery-slide" :aria-hidden="index !== careGalleryIndex" @click.self="closeCareGallery">
                  <div class="care-poster care-gallery-poster">
                    <img v-if="item.imagen" :src="String(item.imagen)" :alt="worldPrimary(item)" />
                    <span v-else class="care-poster-memory" aria-hidden="true"><AppIcon :name="item.kind === 'planta' ? 'plants' : 'companions'" /><b>{{ worldPrimary(item).slice(0, 1) }}</b></span>
                    <span class="care-poster-shade" aria-hidden="true" />
                    <span class="care-poster-frame" aria-hidden="true" />
                    <div class="care-poster-inscription">
                      <small>{{ item.demoLabel ?? (item.kind === 'planta' ? (item.lugar === 'exterior' ? 'Exterior' : 'Interior') : companionSpeciesLabel(item.especie)) }}</small>
                      <h2>{{ worldPrimary(item) }}</h2>
                      <p v-if="item.nota">{{ item.nota }}</p>
                      <em v-for="line in careAgeLines(item)" :key="line">{{ line }}</em>
                    </div>
                    <span v-if="careInitials" class="care-poster-seal">{{ careInitials }}</span>
                  </div>
                </article>
              </div>
              <template v-if="careGalleryItems.length > 1">
                <button type="button" class="care-gallery-step is-prev" aria-label="Afiche anterior" @click="goCareGallery(-1)"><AppIcon name="back" /></button>
                <button type="button" class="care-gallery-step is-next" aria-label="Afiche siguiente" @click="goCareGallery(1)"><AppIcon name="back" /></button>
              </template>
            </section>
          </div>
        </Transition>
      </Teleport>
    </div>

      <div v-else-if="isWorld" class="workspace-grid" :class="{ 'constellation-workspace': detail === 'world-vinculos', 'hobby-workspace': detail === 'world-hobbies', 'journey-workspace': detail === 'world-travesias', 'decree-workspace': detail === 'world-decretos' }">
      <section v-if="detail === 'world-vinculos'" class="constellation-space" aria-label="Mapa de Mi Constelación">
        <div ref="constellationMap" class="constellation-map" :class="{ 'constellation-paused': !constellationActive }" @click="selectedConstellationLink = null; constellationExpanded = false">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle class="constellation-orbit-glow orbit-outer" cx="50" cy="50" r="40" />
            <circle class="constellation-orbit-glow orbit-middle" cx="50" cy="50" r="28" />
            <circle class="constellation-orbit-glow orbit-inner" cx="50" cy="50" r="16" />
            <circle class="constellation-orbit orbit-outer" cx="50" cy="50" r="40" />
            <circle class="constellation-orbit orbit-middle" cx="50" cy="50" r="28" />
            <circle class="constellation-orbit orbit-inner" cx="50" cy="50" r="16" />
            <line v-for="star in constellationStars" :key="`thread-${star.link.id}`" class="constellation-thread" x1="50" y1="50" :x2="star.x" :y2="star.y" :style="{ '--star-color': star.color }" />
          </svg>
          <span class="constellation-heart" aria-hidden="true"><AppIcon name="constellation" /></span>
          <button
            v-for="star in constellationStars"
            :key="star.link.id"
            type="button"
            class="constellation-star"
            :class="{ active: selectedConstellationLink === star.link.id }"
            :style="{ left: `${star.x}%`, top: `${star.y}%`, '--star-color': star.color, '--star-index': star.index }"
            :data-orbit="star.orbit"
            :aria-label="`${star.link.nombre}, ${star.category}, ${star.orbitLabel}`"
            :aria-pressed="selectedConstellationLink === star.link.id"
            @click.stop="onConstellationStar(star.link.id)"
          ><span /></button>
          <Transition name="constellation-reading">
            <article
              v-if="currentConstellationLink"
              class="constellation-reading"
              :class="{ below: currentConstellationLink.y < 48 }"
              role="status"
              :style="{ left: `${currentConstellationLink.x}%`, top: currentConstellationLink.y < 48 ? `${currentConstellationLink.y}%` : 'auto', bottom: currentConstellationLink.y >= 48 ? `${100 - currentConstellationLink.y}%` : 'auto', '--star-color': currentConstellationLink.color }"
              @click.stop
            >
              <div>
                <span :style="{ '--star-color': currentConstellationLink.color }" aria-hidden="true" />
                <strong>{{ currentConstellationLink.link.nombre }}</strong>
                <small>{{ currentConstellationLink.category }}<template v-if="currentConstellationLink.link.signo"> · {{ currentConstellationLink.link.signo }}</template></small>
              </div>
              <p v-if="currentConstellationLink.link.nota" :class="{ full: constellationExpanded }">{{ constellationExpanded ? currentConstellationLink.link.nota : truncateNote(currentConstellationLink.link.nota) }}</p>
            </article>
          </Transition>
          <p v-if="!constellationStars.length" class="constellation-empty">Tu constelación te espera.<br />Cada vínculo que agregas enciende un punto.</p>
        </div>
        <ul class="constellation-legend" aria-label="Órbitas de vínculos">
          <li><span class="legend-ocaso" aria-hidden="true" /><strong>Amor</strong><small>Centro · {{ constellationOrbitCounts[0] }}</small></li>
          <li><span class="legend-cosmos" aria-hidden="true" /><strong>Familia</strong><small>Órbita media · {{ constellationOrbitCounts[1] }}</small></li>
          <li><span class="legend-oro" aria-hidden="true" /><strong>Amistad, Raíz y Guía</strong><small>Exterior · {{ constellationOrbitCounts[2] }}</small></li>
        </ul>
      </section>
      <Teleport to="body">
        <Transition name="care-composer">
          <div v-if="detail === 'world-vinculos' && constellationComposerOpen" class="care-composer-layer" role="presentation" @click.self="closeConstellationComposer">
            <section
              id="aureo-constellation-composer"
              ref="constellationComposerPanel"
              class="care-composer constellation-composer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aureo-constellation-composer-title"
              tabindex="-1"
              @keydown.esc.stop="closeConstellationComposer"
            >
              <header>
                <h2 id="aureo-constellation-composer-title"><span class="care-composer-lead">Encender</span> <span class="care-composer-of">un vínculo</span></h2>
                <button type="button" aria-label="Cerrar" @click="closeConstellationComposer"><AppIcon name="close" /></button>
              </header>
              <form class="care-inscription-editor" @submit.prevent="addWorldItem">
                <label class="care-composer-name">¿Cómo se llama?<input v-model="worldForm.nombre" required maxlength="120" /></label>
                <label>Vínculo<select v-model="worldForm.categoria"><option v-for="value in ['Amor','Familia','Amistad','Raíz','Guía']" :key="value">{{ value }}</option></select></label>
                <label>¿Cuál es su signo?<select v-model="worldForm.signo"><option value="">Prefiero no indicarlo</option><option v-for="sign in zodiacSigns" :key="sign">{{ sign }}</option></select></label>
                <label>Una nota, si la necesitas<textarea v-model="worldForm.nota" maxlength="500" rows="3" /></label>
                <button class="care-publish" type="submit" :disabled="worldSaving">{{ worldSaving ? 'Guardando…' : 'Encender en mi constelación' }}</button>
              </form>
            </section>
          </div>
        </Transition>
      </Teleport>
      <HobbySpirals v-if="detail === 'world-hobbies'" :hobbies="hobbies.items.value" :selected-id="selectedHobbyId" @select="selectedHobbyId = $event">
        <template #moment>
          <form class="ritual-form hobby-moment-form" @submit.prevent="addHobbyMoment">
            <label>¿Qué pasó con esto, hoy?<textarea v-model="hobbyMomentText" required maxlength="500" :placeholder="hobbyMomentHint" /></label>
            <p class="hobby-moment-hint">Puede ser algo que viviste, o algo que hoy extrañaste.</p>
            <button class="workspace-primary" type="submit">Dejar un momento aquí</button>
            <p v-if="hobbySaved" class="hobby-moment-saved" role="status">Quedó guardado en tu espiral.</p>
          </form>
        </template>
      </HobbySpirals>
      <Teleport to="body">
        <Transition name="care-composer">
          <div v-if="detail === 'world-hobbies' && hobbyComposerOpen" class="care-composer-layer" role="presentation" @click.self="closeHobbyComposer">
            <section
              id="aureo-hobby-composer"
              ref="hobbyComposerPanel"
              class="care-composer hobby-composer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aureo-hobby-composer-title"
              tabindex="-1"
              @keydown.esc.stop="closeHobbyComposer"
            >
              <header>
                <h2 id="aureo-hobby-composer-title"><span class="care-composer-lead">Sumar</span> <span class="care-composer-of">una espiral</span></h2>
                <button type="button" aria-label="Cerrar" @pointerdown.stop @click.stop="closeHobbyComposer"><AppIcon name="close" /></button>
              </header>
              <form class="care-inscription-editor" @submit.prevent="addWorldItem">
                <label class="care-composer-name">¿Qué es?<input v-model="worldForm.nombre" required maxlength="120" /></label>
                <label>¿Cómo te hace sentir?<textarea v-model="worldForm.sensacion" required maxlength="400" rows="3" /></label>
                <button class="care-publish" type="submit" :disabled="worldSaving">{{ worldSaving ? 'Guardando…' : 'Agregar' }}</button>
              </form>
            </section>
          </div>
        </Transition>
      </Teleport>
      <JourneyTrunk v-if="detail === 'world-travesias'" :journeys="journeys.items.value" :selected-id="selectedJourneyId" @select="selectedJourneyId = $event" />
      <Teleport to="body">
        <Transition name="care-composer">
          <div v-if="detail === 'world-travesias' && journeyComposerOpen" class="care-composer-layer" role="presentation" @click.self="closeJourneyComposer">
            <section
              id="aureo-journey-composer"
              ref="journeyComposerPanel"
              class="care-composer journey-composer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aureo-journey-composer-title"
              tabindex="-1"
              @keydown.esc.stop="closeJourneyComposer"
            >
              <header>
                <h2 id="aureo-journey-composer-title"><span class="care-composer-lead">Guardar</span> <span class="care-composer-of">una postal</span></h2>
                <button type="button" aria-label="Cerrar" @click="closeJourneyComposer"><AppIcon name="close" /></button>
              </header>
              <form class="care-inscription-editor" @submit.prevent="addWorldItem">
                <label>Estado<select v-model="worldForm.estado"><option value="decretado">Por vivir</option><option value="visitado">Vivido</option></select></label>
                <div class="journey-picker">
                  <label for="journey-place-search">Buscar cualquier lugar</label>
                  <div>
                    <input id="journey-place-search" v-model="journeyQuery" type="search" autocomplete="off" placeholder="Ciudad, país o lugar" />
                    <button type="button" :disabled="journeySearching" @click="journeySearch">{{ journeySearching ? 'Buscando…' : 'Buscar' }}</button>
                  </div>
                  <ul v-if="journeyResults.length" class="journey-results" aria-label="Lugares encontrados">
                    <li v-for="result in journeyResults" :key="`${result.lat}-${result.lon}`">
                      <button type="button" @click="chooseJourneyResult(result)">{{ result.display_name }}</button>
                    </li>
                  </ul>
                  <div class="journey-selected-place" :class="{ empty: !journeyLocationSelected }">
                    <small>Lugar elegido</small>
                    <strong>{{ journeyLocationSelected ? worldForm.nombre : 'Busca un lugar.' }}</strong>
                  </div>
                  <p v-if="journeyLocationMessage" class="journey-location-message" role="status">{{ journeyLocationMessage }}</p>
                  <label v-if="worldForm.estado === 'visitado'">¿Qué viviste ahí?<textarea v-model="worldForm.momento" maxlength="500" placeholder="Una línea. Lo primero que recuerdes." /></label>
                </div>
                <label>Una nota, si la necesitas<textarea v-model="worldForm.nota" maxlength="500" rows="3" /></label>
                <button class="care-publish" type="submit" :disabled="worldSaving || !journeyLocationSelected">{{ worldSaving ? 'Guardando…' : 'Agregar' }}</button>
              </form>
            </section>
          </div>
        </Transition>
      </Teleport>
      <Teleport to="body">
        <Transition name="care-composer">
          <div v-if="detail === 'world-decretos' && decreeComposerOpen" class="care-composer-layer" role="presentation" @click.self="closeDecreeComposer">
            <section
              id="aureo-decree-composer"
              ref="decreeComposerPanel"
              class="care-composer decree-composer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aureo-decree-composer-title"
              tabindex="-1"
              @keydown.esc.stop="closeDecreeComposer"
            >
              <header>
                <h2 id="aureo-decree-composer-title"><span class="care-composer-lead">Escribir</span> <span class="care-composer-of">un decreto</span></h2>
                <button type="button" aria-label="Cerrar" @pointerdown.stop @click.stop="closeDecreeComposer"><AppIcon name="close" /></button>
              </header>
              <form class="care-inscription-editor" @submit.prevent="addWorldItem">
                <div class="decree-dims" role="radiogroup" aria-label="Dimensión">
                  <button
                    v-for="(meta, key) in DECREE_BADGES"
                    :key="key"
                    type="button"
                    role="radio"
                    :aria-checked="worldForm.categoria === key"
                    :style="{ '--decree-dim': meta.color }"
                    @click="worldForm.categoria = key"
                  >{{ meta.label }}</button>
                </div>
                <label class="care-composer-name">Tu decreto<textarea v-model="worldForm.texto" required maxlength="500" :placeholder="DECREE_PLACEHOLDERS[decreeCategory]" /></label>
                <p v-if="!worldForm.texto.trim()" class="decree-example">{{ DECREE_EXAMPLES[decreeCategory] }}</p>
                <button class="care-publish" type="submit" :disabled="worldSaving">{{ worldSaving ? 'Guardando…' : 'Lo decreto' }}</button>
              </form>
            </section>
          </div>
        </Transition>
      </Teleport>
      <aside v-if="detail === 'world-travesias' && selectedJourney" class="journey-postcard-edit">
        <strong>{{ selectedJourney.nombre }}</strong>
        <template v-if="journeyLived(selectedJourney)">
          <label>¿Qué viviste ahí?<textarea v-model="journeyEdit.momento" maxlength="500" placeholder="Una línea. Lo primero que recuerdes." /></label>
          <label>Una nota, si la necesitas<textarea v-model="journeyEdit.nota" maxlength="500" /></label>
          <button type="button" class="workspace-primary" @click="saveJourneyMemory">Guardar la postal</button>
        </template>
        <button v-else type="button" class="workspace-primary" @click="liveJourney(selectedJourney.id)">Ya lo viví</button>
        <button type="button" class="journey-forget" @click="journeyForget = selectedJourney">Retirar esta postal</button>
      </aside>
      <section v-if="detail === 'world-decretos'" class="workspace-records" aria-label="Decretos">
        <article v-for="item in decrees.items.value" :key="item.id" class="workspace-record decree-record" :class="{ fulfilled: item.cumplido, glow: decreeIntensity(item.activaciones).glow }" :style="{ '--decree-opacity': decreeIntensity(item.activaciones).opacity, '--decree-badge': DECREE_BADGES[item.categoria].color }">
          <span class="decree-badge">{{ DECREE_BADGES[item.categoria].label }}</span>
          <h2>{{ item.texto }}</h2>
          <time v-if="item.cumplido && item.fecha_cumplimiento">{{ formatCareDate(item.fecha_cumplimiento) }}</time>
          <button type="button" @click="activateWorldItem({ ...item, kind: 'decreto' })" @pointerdown="startDecreeHold(item)" @pointerup="cancelDecreeHold" @pointerleave="cancelDecreeHold">{{ item.cumplido ? 'Ya es mío' : 'Activar' }}</button>
        </article>
        <p v-if="!decrees.items.value.length" class="workspace-empty decree-example">{{ DECREE_EXAMPLES[decreeCategory] }}</p>
      </section>
      <Teleport to="body">
        <button v-if="decreeGate === 'first'" type="button" class="decree-ritual decree-gate" aria-label="Lo visualizo. Lo siento. Lo decreto." @click="passDecreeGate">
          <blockquote>Lo visualizo. Lo siento. Lo decreto.</blockquote>
        </button>
        <button v-else-if="decreeGate === 'own' && decreeOwn" type="button" class="decree-ritual decree-own" :aria-label="decreeOwn.texto" @click="passDecreeGate">
          <blockquote>{{ decreeOwn.texto }}</blockquote>
        </button>
        <div v-if="selectedDecree" class="decree-ritual" role="dialog" aria-modal="true" aria-label="Ritual de decreto" @click="tapDecree">
          <blockquote>{{ selectedDecree.texto }}</blockquote>
          <div aria-label="Pulsaciones del ritual"><span v-for="index in 3" :key="index" :class="{ filled: decreeTaps >= index }" /></div>
          <p v-if="decreeDone" class="decree-done">Decretado.</p>
        </div>
        <div v-if="decreeClaim" class="decree-claim" role="dialog" aria-modal="true" aria-label="Esto ya es mío"><p>¿Este decreto ya forma parte de ti?</p><strong>{{ decreeClaim.texto }}</strong><div><button type="button" @click="decreeClaim = null">Todavía no</button><button type="button" @click="claimDecree">Esto ya es mío</button></div></div>
        <div v-if="journeyForget" class="decree-claim" role="dialog" aria-modal="true" aria-label="¿Quieres que esta postal se vaya?">
          <p>¿Quieres que esta postal se vaya?</p>
          <strong>{{ journeyForget.nombre }}</strong>
          <div>
            <button type="button" @click="journeyForget = null">No, quedarse</button>
            <button type="button" @click="confirmForgetJourney">Sí, que se vaya</button>
          </div>
        </div>
      </Teleport>
    </div>

    <div v-else-if="detail === 'balance'" class="balance-workspace">
      <div v-if="balancePane === 'flujo'" id="balance-panel-flujo" class="balance-pane" role="tabpanel" aria-labelledby="balance-tab-flujo">
        <section class="balance-summary" aria-label="Lo que tengo hoy">
          <p class="balance-summary-label">Lo que tengo hoy</p>
          <div class="balance-summary-figure">
            <strong :class="{ hidden: !balanceAmountVisible }">{{ maskedAmount(balanceTotal) }}</strong>
            <button type="button" class="balance-amount-toggle" :aria-pressed="balanceAmountVisible" :aria-label="balanceAmountVisible ? 'Ocultar el dinero' : 'Mostrar el dinero'" @click="toggleBalanceAmount">
              <AppIcon :name="balanceAmountVisible ? 'eye-off' : 'eye'" />
            </button>
          </div>
          <dl class="balance-summary-split">
            <div class="entra"><dt>Entra</dt><dd>{{ maskedAmount(balanceIn) }}</dd></div>
            <div class="sale"><dt>Sale</dt><dd>{{ maskedAmount(balanceOut) }}</dd></div>
          </dl>
          <form class="balance-base-income" @submit.prevent="onBaseIncomeAction">
            <label for="balance-base-income">Mi ingreso base</label>
            <span class="balance-money-field">
              <span class="balance-money-sign" aria-hidden="true">$</span>
              <input id="balance-base-income" ref="baseIncomeField" v-model.number="baseIncome" type="number" min="0" inputmode="decimal" :readonly="!baseIncomeEditing" @focus="baseIncomeEditing || startBaseIncomeEdit()" />
            </span>
            <button type="submit" class="balance-base-edit" :aria-label="baseIncomeEditing ? 'Guardar ingreso base' : 'Editar ingreso base'"><AppIcon name="edit" /></button>
            <p v-if="baseIncomeSaved" class="balance-base-saved" role="status">Guardado</p>
          </form>
        </section>
        <form class="ritual-form compact" :class="{ open: movementOpen }" @submit.prevent="addMovement">
          <div class="segmented-block">
            <span id="balance-movement-legend" class="segmented-legend">Registrar un movimiento</span>
            <div class="segmented-choice" role="group" aria-labelledby="balance-movement-legend">
              <button type="button" :class="{ active: movementOpen && movement.tipo === 'ingreso' }" @click="openMovement('ingreso')">Entra</button>
              <button type="button" :class="{ active: movementOpen && movement.tipo === 'gasto' }" @click="openMovement('gasto')">Sale</button>
            </div>
          </div>
          <template v-if="movementOpen">
            <label>Monto<span class="balance-money-field"><span class="balance-money-sign" aria-hidden="true">$</span><input v-model.number="movement.monto" type="number" min="1" inputmode="decimal" required /></span></label>
            <label>Categoría<select v-model="movement.categoria"><option v-for="category in categories" :key="category">{{ category }}</option></select></label>
            <label>Una nota, si la necesitas<input v-model="movement.nota" maxlength="160" /></label>
            <label class="balance-recurring"><input v-model="movement.recurrente" type="checkbox" /> Es un movimiento fijo mensual</label>
            <button class="workspace-primary" type="submit" :disabled="movement.monto <= 0">Guardar</button>
          </template>
        </form>
        <section class="balance-lists balance-flow"><h2>Últimos movimientos</h2><article v-for="item in [...movements.items.value].reverse().slice(0,8)" :key="item.id" class="workspace-record" :class="item.tipo === 'ingreso' ? 'is-entra' : 'is-sale'"><div><h3>{{ item.nota || item.categoria }}</h3><p>{{ item.categoria }}<template v-if="item.recurrente"> · fijo mensual</template></p></div><strong>{{ item.tipo === 'ingreso' ? '+' : '−' }} {{ currency.format(item.monto) }}</strong></article><p v-if="!movements.items.value.length" class="workspace-empty">Sin registros aún. Ver es la primera forma de cuidarte.</p></section>
      </div>
      <div v-else id="balance-panel-metas" class="balance-pane" role="tabpanel" aria-labelledby="balance-tab-metas">
        <form class="ritual-form compact goal-composer" @submit.prevent="addGoal">
          <label class="goal-row">¿Qué estás construyendo?<input v-model="goal.nombre" required maxlength="120" /></label>
          <label class="goal-row">Meta<span class="balance-money-field"><span class="balance-money-sign" aria-hidden="true">$</span><input v-model.number="goal.objetivo" type="number" min="1" required /></span></label>
          <div class="goal-row" role="group" aria-labelledby="goal-color-label">
            <span id="goal-color-label">Color de tu Daruma</span>
            <div class="goal-swatches">
              <button v-for="color in goalColors" :key="color.value" type="button" :style="{ background: color.value }" :class="{ selected: goal.color === color.value }" :aria-label="color.name" :title="color.name" @click="goal.color = color.value" />
            </div>
          </div>
          <button class="workspace-primary" type="submit" :disabled="!goal.nombre.trim() || goal.objetivo <= 0">Crear Daruma</button>
        </form>
        <section class="balance-lists goal-ledger">
          <article v-for="item in darumas.items.value" :key="item.id" class="workspace-record daruma">
            <span :style="{ background: item.color }" />
            <div class="daruma-copy"><h3>{{ item.nombre }}</h3><p>{{ currency.format(item.acumulado) }} de {{ currency.format(item.objetivo) }}</p></div>
            <form v-if="item.acumulado < item.objetivo" class="daruma-progress" @submit.prevent="addDarumaProgress(item)"><input v-model.number="darumaContribution[item.id]" type="number" min="1" :max="item.objetivo - item.acumulado" aria-label="Aportar a la meta" /><button type="submit">Aportar</button></form>
            <button v-else-if="!item.daruma_transferido" type="button" class="daruma-transfer" @click="transferDaruma(item)"><AppIcon name="star" /> Llevar a Edad Dorada</button>
            <small v-else>Ya forma parte de tu Edad Dorada.</small>
          </article>
          <p v-if="!darumas.items.value.length" class="workspace-empty">Lo que todavía no nombraste, aquí puede tomar forma.</p>
        </section>
      </div>
    </div>

    <div v-else-if="detail === 'nucleo'" class="nucleus-workspace">
      <section v-if="!nucleusUnlocked" class="nucleus-gate"><AppIcon name="moon" /><h2>Tu sanctum</h2><p>Toca tu melodía para entrar.</p><div class="melody-progress"><span v-for="index in 3" :key="index" :class="{ filled: melody[index - 1] }" /></div><div class="note-grid"><button v-for="note in notes" :key="note" type="button" :class="{ hint: nucleusHintNote === note }" @click="pressNote(note)">{{ note }}</button></div><button type="button" class="nucleus-hint" :disabled="nucleusHinting" @click="hintNucleusMelody">{{ nucleusHinting ? 'Escucha el orden…' : 'Recordar mi melodía' }}</button><p v-if="nucleusError" role="alert">{{ nucleusError }}</p></section>
      <template v-else>
      <p class="nucleus-map-copy">Emociones afines respiran juntas.</p>
        <section ref="thoughtCloth" class="thought-cloth nucleus-emotion-field" :class="{ 'plasma-paused': !plasmaActive }" aria-label="Mapa de pensamientos agrupados por emoción">
          <span class="nucleus-plasma" aria-hidden="true"><span v-for="emotion in activeEmotionClusters" :key="emotion.tone" class="plasma-pool" :style="{ left: `${emotion.x}%`, top: `${emotion.y}%`, '--emotion-color': emotion.color, '--plasma-index': emotion.index }" /></span>
          <button v-for="entry in groupedThoughts" :key="entry.thought.id" type="button" class="thought-point" :class="{ 'is-newest': entry.newest }" :style="{ left: `${entry.x}%`, top: `${entry.y}%`, '--thought-color': entry.emotion.color, '--thought-index': entry.index, '--thought-freshness': entry.freshness }" :aria-label="`Leer ${entry.emotion.label.toLowerCase()}: ${entry.thought.texto}`" @click="selectedThought = entry.thought.id"><span /></button>
          <p v-if="!groupedThoughts.length"><em>Aponia.</em> El silencio también es válido.</p>
        </section>
        <ul v-if="activeEmotionClusters.length" class="nucleus-emotion-key" aria-label="Emociones presentes"><li v-for="emotion in activeEmotionClusters" :key="emotion.tone"><span :style="{ '--emotion-color': emotion.color }" aria-hidden="true" /><strong>{{ emotion.label }}</strong><small>{{ emotion.count }}</small></li></ul>
        <form class="nucleus-entry" @submit.prevent="addThought"><label for="tailwind-thought">Escríbelo. Nadie más lo verá.</label><textarea id="tailwind-thought" v-model="thoughtText" rows="3" maxlength="1200" placeholder="Escribe lo que aparece…" /><button v-if="thoughtText.trim()" class="workspace-primary" type="submit">Dejarlo aquí</button></form>
        <Transition name="thought-float"><div v-if="currentThought && currentThoughtEmotion" ref="thoughtDialog" class="thought-reading-layer" tabindex="-1" role="presentation" @click.self="selectedThought = null" @keydown.esc.stop="selectedThought = null"><article class="thought-reading" role="dialog" aria-modal="true" aria-label="Pensamiento guardado" :style="{ '--thought-color': currentThoughtEmotion.color }"><header><div><span class="thought-emotion-mark" aria-hidden="true" /><strong>{{ currentThoughtEmotion.label }}</strong><time>{{ thoughtDate(currentThought.timestamp) }}</time></div><button type="button" aria-label="Cerrar pensamiento" @click="selectedThought = null"><AppIcon name="close" /></button></header><AppIcon :name="currentThought.simbolo" /><p>{{ currentThought.texto }}</p></article></div></Transition>
      </template>
    </div>

    <div v-else-if="detail === 'edad-dorada'" class="golden-workspace" :style="resinStyle">
      <div class="golden-presence">
        <div class="golden-object-column">
          <section ref="darumaStage" class="golden-sculpture daruma-stage" :class="{ 'daruma-paused': !darumaActive }" aria-label="Daruma de kintsugi de tu Edad Dorada">
            <span class="daruma-aura" aria-hidden="true" />
            <svg class="daruma-art" viewBox="0 0 360 450" role="img" aria-label="Daruma con grietas de oro que representan tus declaraciones">
              <defs>
                <radialGradient id="daruma-body-gradient" cx="35%" cy="22%" r="82%"><stop offset="0" stop-color="#f4efe5" stop-opacity=".22" /><stop offset=".22" stop-color="var(--sign-color)" stop-opacity=".72" /><stop offset=".62" stop-color="#11151d" /><stop offset="1" stop-color="#05070b" /></radialGradient>
                <radialGradient id="daruma-face-gradient" cx="46%" cy="34%" r="74%"><stop offset="0" stop-color="#fff8e5" /><stop offset=".7" stop-color="#d9c494" /><stop offset="1" stop-color="#8e7240" /></radialGradient>
                <linearGradient id="daruma-gold-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4c9" /><stop offset=".45" stop-color="#c9a86a" /><stop offset="1" stop-color="#7c5b27" /></linearGradient>
                <clipPath id="daruma-body-clip"><path d="M180 18C108 18 72 67 74 130C34 177 34 294 61 374C81 433 279 433 299 374C326 294 326 177 286 130C288 67 252 18 180 18Z" /></clipPath>
                <filter id="daruma-depth" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".52" /></filter>
                <filter id="golden-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <ellipse class="daruma-ground" cx="180" cy="423" rx="108" ry="14" />
              <g class="daruma-form" filter="url(#daruma-depth)">
                <path class="daruma-body" d="M180 18C108 18 72 67 74 130C34 177 34 294 61 374C81 433 279 433 299 374C326 294 326 177 286 130C288 67 252 18 180 18Z" />
                <path class="daruma-body-sheen" d="M101 103C69 173 69 306 98 367C114 400 132 411 145 415C106 405 78 391 66 363C39 296 42 197 78 143C82 125 89 112 101 103Z" />
                <path class="daruma-face" d="M105 75C126 48 234 48 255 75C278 104 263 192 236 207C211 221 149 221 124 207C97 192 82 104 105 75Z" />
                <path class="daruma-brow" d="M119 112C136 95 155 94 169 106M241 112C224 95 205 94 191 106" />
                <circle class="daruma-eye-rim" cx="142" cy="132" r="23" /><circle class="daruma-eye-rim" cx="218" cy="132" r="23" />
                <circle class="daruma-eye" cx="142" cy="132" r="8" /><circle class="daruma-eye" cx="218" cy="132" r="8" />
                <path class="daruma-nose" d="M180 131C172 147 171 157 180 162C189 157 188 147 180 131Z" />
                <path class="daruma-belly-seal" d="M117 249C137 221 223 221 243 249C260 274 256 347 228 372C207 391 153 391 132 372C104 347 100 274 117 249Z" />
                <g clip-path="url(#daruma-body-clip)">
                  <g
                    v-for="crack in goldenCracks"
                    :key="crack.declaration.id"
                    class="daruma-crack"
                    :class="{ selected: selectedDeclaration === crack.declaration.id }"
                    :transform="crack.transform"
                    role="button"
                    tabindex="0"
                    :aria-label="`Declaración: ${goldenDeclarationCopy(crack.declaration)}`"
                    :aria-pressed="selectedDeclaration === crack.declaration.id"
                    :style="{ '--crack-age': crack.age }"
                    @click="selectedDeclaration = selectedDeclaration === crack.declaration.id ? null : crack.declaration.id"
                    @keydown.enter.prevent="selectedDeclaration = selectedDeclaration === crack.declaration.id ? null : crack.declaration.id"
                    @keydown.space.prevent="selectedDeclaration = selectedDeclaration === crack.declaration.id ? null : crack.declaration.id"
                  >
                    <path class="daruma-crack-hit" :d="crack.pattern.d" />
                    <path class="daruma-crack-glow" :d="crack.pattern.d" />
                    <path class="daruma-crack-line" :d="crack.pattern.d" />
                    <circle class="daruma-crack-node" :cx="crack.pattern.x" :cy="crack.pattern.y" r="3.4" />
                  </g>
                </g>
              </g>
            </svg>
            <p v-if="!goldenCracks.length" class="daruma-empty">La primera grieta aparece cuando reconoces este momento.</p>
            <Transition name="golden-reading">
              <article v-if="currentDeclaration && selectedCrack" class="golden-crack-reading" role="status" :style="{ left: `${(selectedCrack.pattern.x / 360) * 100}%`, top: `${(selectedCrack.pattern.y / 450) * 100}%` }">
                <header><div><strong>{{ goldenDeclarationOrigin(currentDeclaration) }}</strong><time>{{ goldenDeclarationDate(currentDeclaration.timestamp) }}</time></div><button type="button" aria-label="Cerrar grieta" @click="selectedDeclaration = null"><AppIcon name="close" /></button></header>
                <p class="golden-selected-copy">{{ goldenDeclarationCopy(currentDeclaration) }}</p>
              </article>
            </Transition>
          </section>
        </div>
        <div class="golden-practice">
          <p class="golden-copy"><strong>Tu Edad Dorada ya está ocurriendo.</strong><span>No es después. Es este momento, revelado bajo la luz del oro.</span></p>
        </div>
      </div>
    </div>

    <div v-else class="umbral-workspace">
      <section class="umbral-ritual umbral-intentions">
        <header class="umbral-ritual-title"><span aria-hidden="true"><AppIcon name="star" /></span><h2>Lo que tengo en mente hoy</h2></header>
        <form class="ritual-form compact umbral-capture" @submit.prevent="addIntention"><label>Nueva intención<input v-model="intentionText" maxlength="400" placeholder="Escribe una intención…" /></label><button v-if="intentionText.trim()" class="workspace-primary" type="submit">Agregar intención</button></form>
        <label v-for="item in todayIntentions" :key="item.id" class="intention-row"><input type="checkbox" @change="completeIntention(item)" /><span>{{ item.texto ?? item.txt }}</span></label>
        <p v-if="!todayIntentions.length" class="workspace-empty">El día está en blanco. También es un lujo.</p>
      </section>
      <section class="umbral-ritual umbral-pulse">
        <header class="umbral-ritual-title"><span aria-hidden="true"><AppIcon name="sun" /></span><h2>Mi pulso de hoy</h2></header>
        <p class="umbral-prompt">{{ dailyPrompt }}</p>
        <blockquote v-if="todayPulse">{{ todayPulse.respuesta }}</blockquote>
        <form class="ritual-form compact umbral-capture" @submit.prevent="savePulse"><label>Respuesta a mi pulso de hoy<textarea v-model="pulseText" rows="2" maxlength="1200" placeholder="una palabra, una imagen, una sensación..." /></label><button v-if="pulseText.trim()" class="workspace-primary" type="submit">{{ todayPulse ? 'Actualizar pulso' : 'Guardar pulso' }}</button></form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.tw-workspace{min-height:0;color:#f4efe5}.workspace-header{display:flex;align-items:center;gap:.85rem;margin-bottom:1.15rem}.workspace-header h1{margin:0;font-size:clamp(var(--texto-7),4.2vw,var(--texto-8));font-weight:200;line-height:.98;letter-spacing:-.03em}.workspace-header p{max-width:46rem;margin:.4rem 0 0;color:#b9b3aa;line-height:1.5}.workspace-back,.workspace-text{display:inline-flex;min-height:44px;align-items:center;gap:.45rem;border:0;background:transparent;color:#ead6a7;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.workspace-back svg{width:1rem}.workspace-grid,.balance-lists,.umbral-workspace{display:grid;gap:1.15rem;grid-template-columns:minmax(17rem,.78fr) minmax(0,1.22fr)}.ritual-form{display:grid;align-content:start;gap:1rem;padding:1.25rem;border:1px solid rgba(201,168,106,.22);border-radius:16px;background:rgba(16,21,31,.78);box-shadow:0 18px 50px rgba(0,0,0,.2)}.ritual-form.compact{max-width:40rem;margin:.75rem auto}.ritual-form label,.nucleus-entry label,.golden-entry label{display:grid;gap:.5rem;color:#d8d1c6;font: 600 var(--texto-2)/1.35 system-ui,sans-serif}.ritual-form input,.ritual-form select,.ritual-form textarea,.nucleus-entry textarea,.golden-entry textarea{width:100%;box-sizing:border-box;min-height:48px;border:1px solid rgba(201,168,106,.25);border-radius:12px;background:#0d121b;color:#f4efe5;padding:.8rem .9rem;font: 400 var(--texto-4)/1.5 system-ui,sans-serif;caret-color:#ead6a7}.nucleus-entry textarea,.golden-entry textarea{min-height:5.25rem;resize:none}.ritual-form input:focus-visible,.ritual-form select:focus-visible,.ritual-form textarea:focus-visible,.nucleus-entry textarea:focus-visible,.golden-entry textarea:focus-visible{outline:2px solid #ead6a7;outline-offset:2px}.workspace-primary{min-height:48px;border:1px solid #c9a86a;border-radius:12px;background:rgba(201,168,106,.14);color:#ead6a7;padding:.75rem 1rem;font: 600 var(--texto-3)/1 system-ui,sans-serif;cursor:pointer}.workspace-primary:disabled{cursor:not-allowed;opacity:.45}.workspace-records{display:grid;align-content:start;gap:.7rem}.workspace-record{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px solid rgba(201,168,106,.15)}.workspace-record h2,.workspace-record h3{overflow-wrap:anywhere;margin:0 0 .25rem;font-size: var(--texto-5);font-weight:400}.workspace-record p{margin:0;color:#b9b3aa;font: 400 var(--texto-2)/1.5 system-ui,sans-serif}.workspace-record>button{min-height:42px;flex:0 0 auto;border:1px solid rgba(201,168,106,.3);border-radius:12px;background:transparent;color:#ead6a7;padding:.65rem .85rem;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.workspace-empty{max-width:38rem;color:#b9b3aa;font-style:italic;line-height:1.6}.segmented-choice{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.goal-colors{border:0;padding:0}.goal-colors legend{margin-bottom:.75rem;color:#d8d1c6;font: 600 var(--texto-2)/1 system-ui,sans-serif}.goal-colors button{width:44px;height:44px;margin-right:.7rem;border:2px solid transparent;border-radius:50%;cursor:pointer}.goal-colors button.selected{border-color:#f4efe5;outline:2px solid #c9a86a;outline-offset:2px}.balance-lists{margin-top:2.5rem}.balance-lists h2{font-size: var(--texto-6);font-weight:300}.workspace-record.daruma{justify-content:flex-start}.workspace-record.daruma>span{width:2rem;height:2rem;flex:0 0 auto;border-radius:42% 42% 48% 48%}.nucleus-workspace{position:relative}.nucleus-gate{max-width:34rem;margin:3rem auto;text-align:center}.nucleus-gate>svg{width:3rem;color:#8173b7}.nucleus-gate h2{font-size:2.5rem;font-weight:200}.melody-progress{display:flex;justify-content:center;gap:.6rem;margin:1.25rem}.melody-progress span{width:.55rem;height:.55rem;border:1px solid #8173b7;border-radius:50%}.melody-progress span.filled{background:#8173b7}.note-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.45rem}.note-grid button{min-height:48px;border:1px solid rgba(129,115,183,.4);border-radius:12px;background:rgba(129,115,183,.08);color:#f4efe5;cursor:pointer}.note-grid button.hint{background:#c9a86a;color:#080b11;border-color:#c9a86a}.nucleus-hint{min-height:44px;margin:.35rem auto 0;padding:.55rem 1.1rem;border:1px solid rgba(201,168,106,.4);border-radius: var(--radio-pill);background:transparent;color:#ead6a7;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.nucleus-hint:disabled{opacity:.62;cursor:wait}.thought-cloth{position:relative;min-height:18rem;overflow:hidden;border-radius:44% 56% 48% 52%/51% 42% 58% 49%;background:radial-gradient(circle at 50% 46%,rgba(129,115,183,.13),transparent 55%),#0e121b;box-shadow:0 24px 70px rgba(0,0,0,.32)}.thought-cloth>button{position:absolute;width:42px;height:42px;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer}.thought-cloth>button span{display:block;width:9px;height:9px;margin:auto;border-radius:50%;background:var(--thought-color);box-shadow:0 4px 18px var(--thought-color)}.thought-cloth>p{position:absolute;inset:50% auto auto 50%;width:80%;transform:translate(-50%,-50%);margin:0;text-align:center;color:#b9b3aa}.thought-cloth em{display:block;margin-bottom:.4rem;color:#8173b7;font-size: var(--texto-6)}.nucleus-entry,.golden-entry{display:grid;gap:.8rem;max-width:40rem;margin:1rem auto}.thought-reading{position:relative;max-width:34rem;margin:1.5rem auto;padding:1.4rem;border-radius:16px;background:#111722;box-shadow:0 20px 60px rgba(0,0,0,.3)}.thought-reading::before{content:'';position:absolute;inset:0 auto 0 0;width:1px;background:var(--thought-color)}.thought-reading header{display:flex;justify-content:space-between;color:#b9b3aa;font: 500 var(--texto-1)/1 system-ui,sans-serif}.thought-reading header button{border:0;background:transparent;color:#ead6a7;cursor:pointer}.thought-reading>svg{width:1.5rem;margin-top:1rem;color:var(--thought-color)}.thought-reading p{overflow-wrap:anywhere;line-height:1.7}.golden-workspace{text-align:center}.golden-sculpture{position:relative;width:min(32rem,80vw);aspect-ratio:1;margin:0 auto;border-radius:43% 57% 51% 49%/47% 42% 58% 53%;overflow:hidden;background:radial-gradient(circle at 35% 28%,color-mix(in srgb,var(--sign-color) 65%,#f4efe5),transparent 24%),radial-gradient(circle at 62% 67%,#c9a86a,transparent 8%),color-mix(in srgb,var(--sign-color) 55%,#080b11);box-shadow:0 28px 80px rgba(0,0,0,.38)}.golden-sculpture>.resin-rift{position:absolute;left:calc(18% + (var(--rift-index) * 9%));top:12%;width:1px;height:76%;background:linear-gradient(transparent,#ead6a7,transparent);transform:rotate(calc(-28deg + (var(--rift-index) * 9deg)));opacity:.55}.golden-sculpture>button{position:absolute;left:calc(50% + (var(--node-index) % 3 - 1) * 22%);top:calc(50% + (var(--node-index) % 4 - 1.5) * 16%);width:44px;height:44px;border:0;background:transparent;cursor:pointer}.golden-sculpture>button span{display:block;width:10px;height:10px;margin:auto;border-radius:50%;background:#fff4c9;box-shadow:0 4px 20px #ead6a7}.golden-sculpture>button em{position:absolute;z-index:2;width:11rem;left:50%;bottom:100%;transform:translateX(-50%);padding:.65rem;border-radius:12px;background:#0d121b;color:#f4efe5;font-size: var(--texto-2);line-height:1.4}.golden-sculpture>svg{position:absolute;inset:50% auto auto 50%;width:2.5rem;transform:translate(-50%,-50%);color:#ead6a7}.golden-copy{font-size: var(--texto-6);font-style:italic}.umbral-workspace>section{min-width:0}.umbral-workspace h2{font-size: var(--texto-7);font-weight:300}.umbral-workspace blockquote{margin:1rem 0;padding:1rem;border-inline-start:1px solid #c9a86a;color:#ead6a7}.intention-row{display:flex;align-items:flex-start;gap:.8rem;padding:.8rem 0;border-bottom:1px solid rgba(201,168,106,.14);font: 400 var(--texto-4)/1.5 system-ui,sans-serif}.intention-row input{margin-top:.25rem;accent-color:#c9a86a}
/* Lo que cuido se compone como un mural de afiches, no como un registro administrativo. */
.care-mural-space{display:grid;gap:clamp(2.5rem,6vw,5rem)}
.care-mural{position:relative;min-height:17rem}
.care-mural-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;align-items:start;gap:clamp(.75rem,2vw,1.35rem)}
.care-mural-col{display:contents}
.care-poster{position:relative;isolation:isolate;grid-column:span 4;aspect-ratio:4/5;min-width:0;overflow:hidden;border-radius:var(--radio-organico-1);background:#111722;box-shadow:0 20px 48px rgba(0,0,0,.32);animation:care-poster-arrive var(--dur-3) cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--poster-index) * var(--dur-1))}
.care-poster.is-tall{grid-column:span 5;aspect-ratio:4/5}
.care-poster.is-wide{grid-column:span 7;aspect-ratio:7/5}
.care-poster.is-panorama{grid-column:span 8;aspect-ratio:8/5}
.care-poster.is-narrow,.care-poster.is-portrait{grid-column:span 4;aspect-ratio:4/5}
.care-poster.is-lone{grid-column:3/span 8;aspect-ratio:8/5}
.care-poster>img{width:100%;height:100%;object-fit:cover;filter:saturate(.88) contrast(1.03)}
.care-poster-memory{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 28% 18%,color-mix(in srgb,var(--workspace-accent) 42%,#f4efe5),transparent 36%),linear-gradient(145deg,color-mix(in srgb,var(--workspace-accent) 30%,#151b25),#080b11 72%);color:#ead6a7}
.care-poster-memory svg{position:absolute;right:12%;top:12%;width:2.25rem;opacity:.54}.care-poster-memory b{font-size:clamp(5rem,14vw,10rem);font-weight:200;line-height:1;opacity:.38}
.care-poster-shade{position:absolute;z-index:1;inset:0;background:linear-gradient(180deg,transparent 34%,rgba(5,7,11,.2) 55%,rgba(5,7,11,.94) 100%)}
.care-poster-inscription{position:absolute;z-index:2;inset:auto clamp(1rem,3vw,1.55rem) clamp(1rem,3vw,1.5rem);text-shadow:0 3px 16px rgba(0,0,0,.7)}
.care-poster-inscription small{color:#d9cba9;font: 650 var(--texto-1)/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}.care-poster-inscription h2{margin:.35rem 0 0;color:#fffaf0;font-size:clamp(1.45rem,3.2vw,2.55rem);font-weight:300;line-height:1.02;letter-spacing:-.02em;text-wrap:balance}.care-poster-inscription p{display:-webkit-box;margin:.6rem 0 0;overflow:hidden;color:#e3ddd2;font: var(--texto-3)/1.5 system-ui,sans-serif;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.care-mural-empty{display:grid;min-height:17rem;place-items:center;align-content:center;gap:1rem;border-block:1px solid color-mix(in srgb,var(--workspace-accent) 26%,transparent);background:radial-gradient(circle at 50% 52%,color-mix(in srgb,var(--workspace-accent) 10%,transparent),transparent 48%);text-align:center}.care-mural-empty svg{width:2.4rem;color:var(--workspace-accent)}.care-mural-empty p{max-width:30rem;margin:0;color:#c7c0b5;font-style:italic;line-height:1.65}
.care-poster-maker{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(1.25rem,3vw,2rem);max-width:36rem;padding-block:clamp(1.25rem,3vw,2rem);border-block:1px solid color-mix(in srgb,var(--workspace-accent) 30%,transparent)}
.care-image-pick{display:flex;flex-wrap:wrap;align-items:center;gap:.85rem 1rem}
.care-image-pick.ready{position:relative;display:grid;width:min(11rem,46vw);justify-items:end;align-content:end}
.care-image-pick.ready .care-image-seal{grid-area:1/1;z-index:2;margin:0 .45rem .45rem 0}
.care-image-preview{grid-area:1/1;width:100%;margin:0;aspect-ratio:4/5;overflow:hidden;border-radius:var(--radio-organico-1);background:#111722;box-shadow:0 18px 40px rgba(0,0,0,.35)}
.care-image-preview img{width:100%;height:100%;object-fit:cover;filter:saturate(.88) contrast(1.03)}
.care-image-seal{position:relative;display:grid;width:48px;height:48px;flex:0 0 auto;place-items:center;border:1px solid rgba(201,168,106,.55);border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(234,214,167,.28),#080b11 72%);color:#ead6a7;box-shadow:0 16px 36px rgba(0,0,0,.38);cursor:pointer}
.care-image-seal svg{width:1.05rem}
.care-image-seal input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.care-image-seal:focus-within{outline:2px solid #ead6a7;outline-offset:3px}
.care-image-seal.loading,.care-image-pick.loading{opacity:.68;pointer-events:none}
.care-mural>.care-image-error{margin:.85rem 0 0;max-width:22rem}
.care-inscription-editor{display:grid;align-content:center;gap:1rem}.care-kind-choice{display:flex;flex-wrap:wrap;gap:.5rem;margin:0;padding:0;border:0}.care-kind-choice legend{width:100%;margin-bottom:.2rem;color:#c8c1b6;font: 600 var(--texto-1)/1.3 system-ui,sans-serif}.care-kind-choice button{min-height:44px;padding:.65rem .85rem;border:1px solid color-mix(in srgb,var(--workspace-accent) 30%,transparent);border-radius:14px;background:transparent;color:#c8c1b6;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.care-kind-choice button.active{border-color:var(--workspace-accent);background:color-mix(in srgb,var(--workspace-accent) 12%,transparent);color:#f4efe5}
.care-inscription-editor>label{display:grid;gap:.4rem;color:#c8c1b6;font: 600 var(--texto-1)/1.3 system-ui,sans-serif}.care-inscription-editor :is(input:not([type=file]),textarea){width:100%;box-sizing:border-box;padding:.75rem .1rem;border:0;border-bottom:1px solid color-mix(in srgb,var(--workspace-accent) 34%,transparent);border-radius:0;outline:0;background:transparent;color:#f4efe5;font: var(--texto-4)/1.5 Georgia,'Times New Roman',serif;caret-color:#ead6a7}.care-inscription-editor textarea{min-height:5rem;resize:vertical}.care-inscription-editor :is(input:not([type=file]),textarea)::placeholder{color:#918b82;opacity:1}.care-inscription-editor :is(input:not([type=file]),textarea):focus{border-bottom-color:#ead6a7;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--workspace-accent) 4%,transparent))}
.care-image-error{margin:0;color:#efb8a8;font: var(--texto-2)/1.5 system-ui,sans-serif}.care-publish{justify-self:end;min-width:11rem;min-height:46px;padding:.7rem 1rem;border:1px solid var(--oro,#c9a86a);border-radius:var(--radio-pill);background:rgba(201,168,106,.14);color:#ead6a7;font:300 var(--texto-3)/1 Fraunces,'Aureo Serif',Georgia,serif;cursor:pointer}.care-publish:disabled{cursor:not-allowed;opacity:.48}
@keyframes care-poster-arrive{from{opacity:.35;clip-path:inset(12% 0 12% round var(--radio-organico-1));filter:blur(5px)}to{opacity:1;clip-path:inset(0 round var(--radio-organico-1));filter:blur(0)}}
@media(max-width:760px){
  .care-mural-space{gap:2.75rem}
  .care-mural-grid{display:flex;align-items:flex-start;gap:.75rem}
  .care-mural-col{display:flex;flex:1;min-width:0;flex-direction:column;gap:.75rem}
  .care-mural-grid .care-poster,
  .care-mural-grid .care-poster.is-tall,
  .care-mural-grid .care-poster.is-wide,
  .care-mural-grid .care-poster.is-panorama,
  .care-mural-grid .care-poster.is-narrow,
  .care-mural-grid .care-poster.is-portrait,
  .care-mural-grid .care-poster.is-column{grid-column:auto;width:100%;order:0;aspect-ratio:4/5}
  .care-mural-grid .care-poster.is-square{aspect-ratio:1/1}
  .care-mural-grid .care-poster.is-ledge{aspect-ratio:5/4}
  .care-mural-grid .care-poster.is-lone{aspect-ratio:7/5}
  .care-poster-inscription{inset:auto .85rem .85rem}
  .care-poster-inscription h2{font-size:clamp(1.2rem,6vw,1.65rem)}
  .care-poster-inscription p{font-size: var(--texto-2)}
  .care-poster-maker{gap:1.5rem}
  .care-publish{width:100%}
}
@media(max-width:380px){
  .care-mural-grid,.care-mural-col{gap:.6rem}
  .care-poster-inscription p{display:none}
  .care-poster-inscription small{font-size: var(--texto-1)}
}
@media(prefers-reduced-motion:reduce){.care-poster{animation:none}}

.segmented-choice button{min-height:44px;border:1px solid rgba(201,168,106,.28);border-radius:14px;background:transparent;color:#d8d1c6;padding:.65rem 1rem;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.segmented-choice button.active{border-color:#c9a86a;background:rgba(201,168,106,.13);color:#f3dfb2}
@media(max-width:760px){.balance-lists{margin-top:1.5rem}}

/* Campo continuo: el aura sangra a 50vw y la entrada no usa filter.
   Recortar overflow, pinzar width:100% o blur en .tw-workspace vuelve a pintar un borde junto al scrollbar.
   docs/product/AURA_CAMPO_CONTINUO.md */
.tw-workspace{--workspace-accent:#c9a86a;position:relative;overflow:visible;isolation:isolate;animation:workspace-unveil var(--dur-3) cubic-bezier(.16,1,.3,1) both}.detail-world-decretos,.detail-world-vinculos,.detail-nucleo{--workspace-accent:#8173b7}.detail-world-travesias{--workspace-accent:#7da797}.detail-world-cuidado{--workspace-accent:#9b7d9b}.workspace-aura{position:absolute;z-index:-1;top:-6rem;right:calc(50% - 50vw - 4rem);left:calc(50% - 50vw - 4rem);height:34rem;pointer-events:none;background:radial-gradient(ellipse at 72% 8%,color-mix(in srgb,var(--workspace-accent) 14%,transparent),transparent 56%);mask-image:linear-gradient(#000,transparent 88%);animation:aura-drift 9s ease-in-out infinite alternate}.workspace-header{position:relative}.workspace-title{display:block;min-width:0;flex:1}.workspace-title::after{content:'';position:absolute;left:0;bottom:-1rem;width:min(58%,28rem);height:1px;background:linear-gradient(90deg,var(--workspace-accent),transparent);transform-origin:left;animation:ritual-thread var(--dur-3) var(--dur-1) cubic-bezier(.16,1,.3,1) both}.workspace-title-quiet{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.detail-edad-dorada .workspace-title::after{display:none}.detail-edad-dorada .workspace-header{margin-bottom:.35rem}.ritual-form{position:relative;overflow:hidden;border:0;border-block:1px solid color-mix(in srgb,var(--workspace-accent) 35%,transparent);border-radius:0;background:radial-gradient(circle at 6% 0,color-mix(in srgb,var(--workspace-accent) 11%,transparent),transparent 44%);box-shadow:none;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}.ritual-form::before{content:'';position:absolute;inset:0 auto 0 0;width:1px;background:linear-gradient(transparent,var(--workspace-accent),transparent);animation:form-current 4.8s ease-in-out infinite}.ritual-form :is(input,select,textarea){transition:border-color var(--dur-2) ease,background-color var(--dur-2) ease,box-shadow var(--dur-2) ease}.ritual-form :is(input,select,textarea):focus{border-color:var(--workspace-accent);background:#0b1018;box-shadow:0 12px 34px color-mix(in srgb,var(--workspace-accent) 8%,transparent)}.workspace-primary{position:relative;overflow:hidden;border-radius:0;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);transition:background-color var(--dur-2) ease,box-shadow var(--dur-2) ease,filter var(--dur-1) ease}.workspace-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,248,224,.18) 50%,transparent 70%);transform:translateX(-120%);transition:transform var(--dur-3) cubic-bezier(.16,1,.3,1)}.workspace-primary:hover::after,.workspace-primary:focus-visible::after{transform:translateX(120%)}.workspace-primary:hover{background:color-mix(in srgb,var(--workspace-accent) 20%,transparent);box-shadow:0 14px 34px color-mix(in srgb,var(--workspace-accent) 12%,rgba(0,0,0,.2))}.workspace-primary:active,.care-publish:active,.daruma-progress button:active,.daruma-transfer:active{transform:translateY(1px)}.workspace-record{position:relative;padding-inline-start:1.35rem;animation:record-materialize var(--dur-3) cubic-bezier(.16,1,.3,1) both}.workspace-record::before{content:'';position:absolute;left:.15rem;top:50%;width:5px;height:5px;border-radius:50%;background:var(--workspace-accent);box-shadow:0 0 14px color-mix(in srgb,var(--workspace-accent) 70%,transparent);transform:translateY(-50%);transition:box-shadow var(--dur-2) ease,transform var(--dur-2) ease}.workspace-record:hover::before{box-shadow:0 0 22px var(--workspace-accent);transform:translateY(-50%) scale(1.45)}.thought-cloth{background-size:135% 135%;animation:cloth-current 9s ease-in-out infinite alternate}.thought-cloth>button span{animation:thought-pulse 3.4s ease-in-out infinite}.thought-cloth>button:nth-of-type(2n) span{animation-delay:-1.4s}.golden-sculpture{background-size:140% 140%;animation:resin-current 8s ease-in-out infinite alternate}.golden-sculpture>.resin-rift{animation:rift-light 4.8s ease-in-out infinite;animation-delay:calc(var(--rift-index) * -.38s)}.golden-sculpture>button span{animation:golden-node-pulse 3.2s ease-in-out infinite}.umbral-workspace{position:relative}.umbral-workspace::before{content:'';position:absolute;z-index:-1;left:50%;top:18rem;width:42rem;max-width:92vw;aspect-ratio:1;border:1px solid rgba(201,168,106,.1);border-radius:50%;transform:translate(-50%,-50%) rotateX(70deg);animation:umbral-orbit 22s linear infinite}.intention-row{animation:record-materialize var(--dur-3) cubic-bezier(.16,1,.3,1) both}
@keyframes workspace-unveil{from{opacity:.55;transform:translateY(.75rem)}to{opacity:1;transform:none}}
@keyframes aura-drift{from{transform:translate3d(-1.5%,0,0);opacity:.7}to{transform:translate3d(2%,.75rem,0);opacity:1}}
@keyframes ritual-thread{from{opacity:0;transform:scaleX(.08)}to{opacity:1;transform:scaleX(1)}}
@keyframes form-current{0%,100%{opacity:.2;transform:translateY(-35%)}50%{opacity:.9;transform:translateY(35%)}}
@keyframes record-materialize{from{opacity:.4;clip-path:inset(0 100% 0 0);filter:blur(3px)}to{opacity:1;clip-path:inset(0);filter:blur(0)}}
@keyframes cloth-current{from{background-position:42% 46%;filter:brightness(.94)}to{background-position:58% 54%;filter:brightness(1.07)}}
@keyframes thought-pulse{0%,100%{transform:scale(.72);opacity:.55}50%{transform:scale(1.25);opacity:1}}
@keyframes resin-current{from{background-position:35% 38%;filter:brightness(.94) saturate(.92)}to{background-position:62% 56%;filter:brightness(1.08) saturate(1.06)}}
@keyframes rift-light{0%,100%{opacity:.2;filter:brightness(.8)}50%{opacity:.85;filter:brightness(1.35)}}
@keyframes golden-node-pulse{0%,100%{transform:scale(.82);box-shadow:0 4px 15px #ead6a7}50%{transform:scale(1.18);box-shadow:0 8px 30px #fff4c9}}
@keyframes umbral-orbit{to{transform:translate(-50%,-50%) rotateX(70deg) rotateZ(360deg)}}
.golden-selected-copy{display:none}
@media(max-width:760px){.tw-workspace{width:100%;max-width:100%;min-height:0}.workspace-header{display:flex;align-items:center;gap:.7rem}.workspace-back{margin:0}.workspace-grid,.balance-lists,.umbral-workspace,.detail-world-hobbies .hobby-workspace,.detail-world-travesias .journey-workspace{grid-template-columns:minmax(0,1fr)}.detail-world-hobbies .hobby-workspace,.detail-world-travesias .journey-workspace{gap:1.5rem}.detail-world-travesias .journey-postcard-edit{grid-column:auto}.workspace-grid>*,.balance-lists>*,.umbral-workspace>*{min-width:0}.note-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.thought-cloth{width:min(100%,28rem);min-height:0;aspect-ratio:1}.golden-sculpture{width:min(25rem,86vw)}.golden-sculpture>button em{display:none}.golden-selected-copy{display:block;max-width:32rem;margin:1rem auto;color:#ead6a7;overflow-wrap:anywhere;font-style:italic;line-height:1.6}.ritual-form,.nucleus-entry,.golden-entry{width:100%;max-width:100%;box-sizing:border-box}.workspace-record>div{min-width:0}}
@media(max-width:420px){.workspace-header h1{max-width:100%;font-size:clamp(1.7rem,9vw,2.2rem);overflow-wrap:anywhere}.ritual-form{padding:1rem}.workspace-record{align-items:flex-start;flex-wrap:wrap}.workspace-record>button{width:100%}.balance-lists{gap:1.25rem}.goal-colors{display:flex;flex-wrap:wrap;gap:.65rem}.goal-colors button{margin:0}.note-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.note-grid button{padding-inline:.25rem}.golden-sculpture{width:min(21rem,calc(100vw - 2.5rem))}.thought-reading{max-width:100%;box-sizing:border-box}.workspace-primary{width:100%}}
@media(max-width:760px) and (max-height:520px){.golden-sculpture{width:min(16rem,48svh)}.thought-cloth{width:min(22rem,58svh);min-height:0}.workspace-header{margin-bottom:1.25rem}.workspace-header h1{font-size:var(--texto-8)}}
/* Edad Dorada: un Daruma de resina revela cada momento como una grieta de oro. */
.detail-edad-dorada .golden-workspace{text-align:left}
.golden-presence{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(16rem,.95fr);align-items:center;gap:clamp(1rem,3vw,1.75rem)}
.golden-object-column{min-width:0}
.detail-edad-dorada .daruma-stage{position:relative;isolation:isolate;width:min(100%,42rem);aspect-ratio:360/450;margin-inline:auto;overflow:visible;border-radius:0;background:none;box-shadow:none;animation:none}
.daruma-aura{position:absolute;z-index:-1;inset:13% 4% 3%;border-radius:50%;background:radial-gradient(circle at 50% 58%,color-mix(in srgb,var(--sign-color) 34%,transparent),color-mix(in srgb,var(--sign-color) 10%,transparent) 45%,transparent 72%);filter:blur(18px);opacity:.82}
.detail-edad-dorada .golden-sculpture>.daruma-art{position:relative;inset:auto;display:block;width:100%;height:100%;overflow:visible;color:inherit;transform:none}
.daruma-ground{fill:rgba(0,0,0,.46);filter:blur(7px)}
.daruma-form{transform-box:fill-box;transform-origin:center bottom;animation:daruma-presence 7.6s ease-in-out infinite}
.daruma-body{fill:url(#daruma-body-gradient);stroke:rgba(234,214,167,.5);stroke-width:1.1}
.daruma-body-sheen{fill:rgba(255,255,255,.06)}
.daruma-face{fill:url(#daruma-face-gradient);stroke:#c9a86a;stroke-width:1.2}
.daruma-brow{fill:none;stroke:#0a0c11;stroke-width:8;stroke-linecap:round;stroke-linejoin:round}
.daruma-eye-rim{fill:#f8eed5;stroke:#9c793f;stroke-width:4}
.daruma-eye{fill:#10131a;stroke:#c9a86a;stroke-width:2}
.daruma-nose{fill:#a98143;opacity:.76}
.daruma-belly-seal{fill:color-mix(in srgb,var(--sign-color) 13%,#080b11);stroke:rgba(201,168,106,.28);stroke-width:1}
.daruma-crack{cursor:pointer;outline:none;opacity:clamp(.38,calc(1 - var(--crack-age) * .05),1)}
.daruma-crack-hit{fill:none;stroke:transparent;stroke-width:30;stroke-linecap:round;pointer-events:stroke}
.daruma-crack-glow{fill:none;stroke:#ead6a7;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:.16;filter:url(#golden-glow);pointer-events:none}
.daruma-crack-line{fill:none;stroke:url(#daruma-gold-gradient);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:280;stroke-dashoffset:0;filter:url(#golden-glow);pointer-events:none;animation:daruma-crack-form var(--dur-3) cubic-bezier(.16,1,.3,1) both}
.daruma-crack-node{fill:#fff4c9;stroke:#8d692d;stroke-width:1.2;filter:url(#golden-glow);pointer-events:none}
.daruma-crack:is(:hover,:focus-visible,.selected) .daruma-crack-line{stroke-width:3.8}
.daruma-crack:is(:focus-visible,.selected) .daruma-crack-glow{opacity:.48;animation:daruma-gold-current 2.8s ease-in-out infinite}
.daruma-paused :is(.daruma-form,.daruma-crack-glow){animation-play-state:paused}
.daruma-empty{position:absolute;z-index:3;left:50%;bottom:13%;width:min(70%,19rem);margin:0;color:#c8c0b4;font-style:italic;line-height:1.55;text-align:center;transform:translateX(-50%)}
.golden-crack-reading{position:absolute;z-index:20;width:min(16rem,70%);box-sizing:border-box;padding:.9rem 1rem;border:1px solid rgba(201,168,106,.32);border-radius:12px;background:radial-gradient(circle at 8% 0,rgba(201,168,106,.1),transparent 44%),#0d121b;box-shadow:0 18px 48px rgba(0,0,0,.42);text-align:left;transform:translate(-50%,calc(-100% - 14px))}
.golden-crack-reading::before{content:'';position:absolute;left:50%;bottom:-.55rem;width:1px;height:.55rem;background:#c9a86a}
.golden-crack-reading header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
.golden-crack-reading header>div{display:grid;gap:.25rem}
.golden-crack-reading strong{color:#ead6a7;font: 600 var(--texto-2)/1.3 system-ui,sans-serif}
.golden-crack-reading time{color:#ada497;font: 500 var(--texto-1)/1.3 system-ui,sans-serif}
.golden-crack-reading header button{display:grid;width:44px;height:44px;place-items:center;margin:-.65rem -.65rem 0 0;border:0;background:transparent;color:#d8d1c6;cursor:pointer}
.golden-crack-reading header button svg{width:1rem}
.detail-edad-dorada .golden-selected-copy{display:block;margin:.85rem 0 0;color:#f4efe5;font-size: var(--texto-4);font-style:normal;line-height:1.65;text-align:left}
.golden-reading-enter-active,.golden-reading-leave-active{transition:opacity var(--dur-2) ease,filter var(--dur-2) ease,transform var(--dur-3) cubic-bezier(.16,1,.3,1)}.golden-reading-enter-from,.golden-reading-leave-to{opacity:0;filter:blur(4px);transform:translateY(.8rem) scale(.97)}
.golden-practice{min-width:0}
.detail-edad-dorada .golden-copy{margin:0;text-align:left}
.detail-edad-dorada .golden-copy strong{display:block;color:#ead6a7;font-size:clamp(1.25rem,2.4vw,1.7rem);font-weight:300;line-height:1.08}
.detail-edad-dorada .golden-copy span{display:block;max-width:29rem;margin-top:.4rem;color:#c9c1b5;font-size: var(--texto-4);font-style:italic;line-height:1.5}
@keyframes daruma-presence{0%,100%{filter:brightness(.94) drop-shadow(0 12px 24px rgba(0,0,0,.18))}50%{filter:brightness(1.06) drop-shadow(0 18px 34px color-mix(in srgb,var(--sign-color) 12%,transparent))}}
@keyframes daruma-crack-form{from{stroke-dashoffset:280;opacity:.15;filter:blur(2px)}to{stroke-dashoffset:0;opacity:1;filter:url(#golden-glow)}}
@keyframes daruma-gold-current{0%,100%{opacity:.25}50%{opacity:.58}}
@media(max-width:760px){.golden-presence{grid-template-columns:minmax(0,1fr);justify-items:center;gap:.4rem}.golden-object-column{order:1;width:100%}.golden-practice{order:2;width:100%;margin-top:.1rem}.detail-edad-dorada .daruma-stage{width:min(78vw,21rem);margin-top:0}.detail-edad-dorada .golden-copy{text-align:center}.detail-edad-dorada .golden-copy span{margin-inline:auto}}
@media(max-width:380px){.detail-edad-dorada .daruma-stage{width:calc(100vw - 2.5rem)}.daruma-empty{font-size: var(--texto-3)}}
@media(prefers-reduced-motion:reduce){.daruma-form,.daruma-crack-line,.daruma-crack-glow{animation:none}.golden-reading-enter-active,.golden-reading-leave-active{transition-duration:var(--dur-1)}}
/* Mi Constelación: cada vínculo ocupa el anillo confirmado por la clienta. */
.detail-world-vinculos .constellation-workspace{grid-template-columns:minmax(0,1fr);justify-items:center;gap:clamp(1.5rem,4vw,3.5rem)}
.constellation-space{min-width:0}
.constellation-map{position:relative;isolation:isolate;width:min(100%,39rem);aspect-ratio:1;margin-inline:auto;overflow:visible;border-radius:50%;background:radial-gradient(circle at 50% 48%,rgba(234,214,167,.09),transparent 14%),radial-gradient(circle at 50% 50%,rgba(129,115,183,.14),transparent 50%),radial-gradient(circle at 42% 36%,#10151f,transparent 74%);box-shadow:inset 0 0 80px rgba(0,0,0,.42)}
.constellation-map>svg{position:absolute;z-index:1;inset:0;width:100%;height:100%;overflow:visible}
.constellation-orbit-glow{fill:none;stroke-width:1.55;opacity:.16}
.constellation-orbit-glow.orbit-inner{stroke:#b86d5d}
.constellation-orbit-glow.orbit-middle{stroke:#8173b7}
.constellation-orbit-glow.orbit-outer{stroke:#c9a86a}
.constellation-orbit{fill:none;stroke-width:.22;stroke-linecap:round;opacity:.58;animation:constellation-orbit-breathe 7.2s ease-in-out infinite}
.constellation-orbit.orbit-inner{stroke:color-mix(in srgb,#b86d5d 72%,#ead6a7);animation-delay:-1.2s}
.constellation-orbit.orbit-middle{stroke:color-mix(in srgb,#8173b7 70%,#ead6a7);animation-delay:-2.4s}
.constellation-orbit.orbit-outer{stroke:color-mix(in srgb,#c9a86a 78%,#ead6a7)}
.constellation-thread{stroke:color-mix(in srgb,var(--star-color) 38%,transparent);stroke-width:.22;stroke-linecap:round;animation:constellation-thread-arrive var(--dur-3) cubic-bezier(.16,1,.3,1) both}
.constellation-heart{position:absolute;z-index:3;left:50%;top:50%;display:grid;width:44px;aspect-ratio:1;place-items:center;border:0;border-radius:50%;background:#080b11;color:#ead6a7;box-shadow:0 0 0 1.15px color-mix(in srgb,#c9a86a 74%,#ead6a7),0 0 16px rgba(234,214,167,.32),0 10px 26px rgba(0,0,0,.4);transform:translate(-50%,-50%)}
.constellation-heart svg{width:1.05rem}
.constellation-star{position:absolute;z-index:5;display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:transparent;transform:translate(-50%,-50%);cursor:pointer}
.constellation-star>span{position:relative;display:block;width:9px;aspect-ratio:1;border:1px solid color-mix(in srgb,var(--star-color) 74%,#fff);border-radius:50%;background:var(--star-color);box-shadow:0 5px 14px color-mix(in srgb,var(--star-color) 48%,transparent),0 10px 28px color-mix(in srgb,var(--star-color) 32%,transparent);animation:constellation-star-pulse 3.8s ease-in-out infinite;animation-delay:calc(var(--star-index) * -.43s)}
.constellation-star>span::after{content:'';position:absolute;inset:-7px;border:1px solid color-mix(in srgb,var(--star-color) 28%,transparent);border-radius:50%;transform:scale(.68);transition:transform var(--dur-2) cubic-bezier(.16,1,.3,1),border-color var(--dur-2) ease}
.constellation-star:is(:hover,:focus-visible,.active)>span::after{border-color:var(--star-color);transform:scale(1)}
.constellation-star:focus-visible{outline:2px solid #f4efe5;outline-offset:1px}
.constellation-star.active>span{box-shadow:0 6px 18px var(--star-color),0 14px 38px color-mix(in srgb,var(--star-color) 52%,transparent)}
.constellation-reading{position:absolute;z-index:12;display:grid;width:min(78%,16.5rem);box-sizing:border-box;gap:.2rem;padding:.9rem 1rem .95rem 1.05rem;border:0;border-radius:var(--radio-organico-2);background:radial-gradient(circle at 0 0,color-mix(in srgb,var(--star-color) 16%,transparent),transparent 48%),rgba(8,11,17,.94);box-shadow:inset 1px 0 0 color-mix(in srgb,var(--star-color) 55%,transparent),0 22px 52px rgba(0,0,0,.48);transform:translate(-50%,calc(-100% - .7rem));text-align:left}
.constellation-reading.below{transform:translate(-50%,.7rem)}
.constellation-reading>div{display:grid;min-width:0;grid-template-columns:.6rem minmax(0,1fr);align-items:center;gap:.25rem .55rem}
.constellation-reading>div>span{width:.55rem;aspect-ratio:1;border-radius:50%;background:var(--star-color);box-shadow:0 5px 13px color-mix(in srgb,var(--star-color) 50%,transparent)}
.constellation-reading strong{overflow-wrap:anywhere;color:#f4efe5;font:300 var(--texto-4)/1.15 Spectral,'Aureo Serif',Georgia,serif}
.constellation-reading small{grid-column:2;color:#c9a86a;font:italic 300 var(--texto-2)/1.4 Spectral,Georgia,serif}
.constellation-reading>p{grid-column:1/-1;display:-webkit-box;margin:.55rem 0 0;overflow:hidden;color:rgba(244,239,229,.7);font:italic 300 var(--texto-3)/1.45 Spectral,Georgia,serif;-webkit-box-orient:vertical;-webkit-line-clamp:1}
.constellation-reading>p.full{display:block;-webkit-line-clamp:unset}
.constellation-reading-enter-active,.constellation-reading-leave-active{transition:opacity var(--dur-2) ease}.constellation-reading-enter-active.constellation-reading,.constellation-reading-leave-active.constellation-reading{transition:opacity var(--dur-2) ease,transform var(--dur-3) cubic-bezier(.16,1,.3,1)}.constellation-reading-enter-from,.constellation-reading-leave-to{opacity:0}
.constellation-empty{position:absolute;z-index:4;left:50%;top:66%;width:min(72%,22rem);margin:0;color:#c4bdb0;font:italic 300 var(--texto-3)/1.55 Spectral,Georgia,serif;text-align:center;transform:translate(-50%,-50%)}
.constellation-legend{display:flex;flex-wrap:nowrap;justify-content:center;gap:.55rem 1.15rem;margin:.85rem 0 0;padding:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;list-style:none}
.constellation-legend::-webkit-scrollbar{display:none}
.constellation-legend::-webkit-scrollbar{display:none}
.constellation-legend li{display:grid;grid-template-columns:.55rem minmax(0,auto);align-items:center;gap:.15rem .45rem;color:#f4efe5;font:300 var(--texto-2)/1.3 Spectral,'Aureo Serif',Georgia,serif}
.constellation-legend li>span{width:.5rem;aspect-ratio:1;border-radius:50%;box-shadow:0 4px 12px color-mix(in srgb,currentColor 45%,transparent)}.constellation-legend .legend-ocaso{background:#b86d5d;color:#b86d5d}.constellation-legend .legend-cosmos{background:#8173b7;color:#8173b7}.constellation-legend .legend-oro{background:#c9a86a;color:#c9a86a}
.constellation-legend strong{font-weight:300}.constellation-legend small{grid-column:2;color:#c9a86a;font:italic 300 var(--texto-1)/1.35 Spectral,Georgia,serif}
.constellation-paused :is(.constellation-orbit,.constellation-star>span){animation-play-state:paused}
.constellation-composer,.hobby-composer{--composer-accent:#c9a86a}
.journey-composer{--composer-accent:#7da797}
.decree-composer{--composer-accent:#8173b7}
#aureo-care-composer{--composer-accent:#9b7d9b}
.constellation-composer select,
.hobby-composer select,
.journey-composer select{
  appearance:none;
  color-scheme:dark;
  padding-right:2.4rem;
  background-image:linear-gradient(45deg,transparent 50%,#d8d1c6 50%),linear-gradient(135deg,#d8d1c6 50%,transparent 50%);
  background-position:calc(100% - 10px) 52%,calc(100% - 4px) 52%;
  background-repeat:no-repeat;
  background-size:6px 6px;
}
@keyframes constellation-orbit-breathe{0%,100%{opacity:.34}50%{opacity:.78}}
@keyframes constellation-thread-arrive{from{opacity:0}to{opacity:1}}
@keyframes constellation-star-pulse{0%,100%{filter:brightness(.86);transform:scale(.82)}50%{filter:brightness(1.18);transform:scale(1.18)}}
@media(max-width:760px){.detail-world-vinculos .constellation-workspace{grid-template-columns:minmax(0,1fr);gap:1.5rem}.constellation-map{width:min(100%,31rem)}.constellation-reading{width:min(70%,16rem)}.detail-world-vinculos .ritual-form{width:100%;box-sizing:border-box}}
@media(max-width:380px){.constellation-legend{flex-wrap:nowrap;gap:.4rem .75rem}.constellation-map{width:calc(100vw - 2.5rem)}}
@media(prefers-reduced-motion:reduce){.constellation-orbit,.constellation-star>span,.constellation-thread{animation:none}.constellation-reading-enter-active.constellation-reading,.constellation-reading-leave-active.constellation-reading{transition-duration:var(--dur-1)}}
/* Umbral se comporta como una experiencia continua de aplicación, no como una página de formularios. */
.detail-umbral .workspace-header h1{font-size:clamp(1.35rem,3.4vw,1.85rem)}
.detail-umbral .umbral-workspace{display:grid;gap:.55rem;width:min(100%,46rem);margin-inline:auto}
.detail-umbral .umbral-workspace::before{top:20rem;width:38rem;opacity:.72}
.detail-umbral .umbral-ritual{position:relative;padding:.2rem 0 .45rem}
.detail-umbral .umbral-ritual+.umbral-ritual{padding-top:.7rem;border-top:1px solid rgba(201,168,106,.18)}
.detail-umbral .umbral-ritual-title{display:flex;align-items:center;gap:.55rem}
.detail-umbral .umbral-ritual-title>span{display:grid;width:32px;aspect-ratio:1;flex:0 0 auto;place-items:center;border:1px solid rgba(201,168,106,.4);border-radius:50%;color:#ead6a7;background:radial-gradient(circle at 38% 30%,rgba(234,214,167,.12),transparent 62%);box-shadow:0 8px 20px rgba(0,0,0,.18)}
.detail-umbral .umbral-ritual-title svg{width:.85rem}
.detail-umbral .umbral-ritual h2{margin:0;font-size:clamp(1.05rem,2.6vw,1.28rem);font-weight:300;line-height:1.08}
.detail-umbral .umbral-prompt{max-width:35rem;margin:.3rem 0 0;color:#c9c1b5;font-size: var(--texto-3);line-height:1.4}
.detail-umbral .umbral-capture{overflow:visible;width:100%;max-width:none;margin:.35rem 0 .2rem;padding:0;border:0;background:none;clip-path:none}
.detail-umbral .umbral-capture::before{display:none}
.detail-umbral .umbral-capture label{display:grid;grid-template-columns:minmax(6.5rem,9.5rem) minmax(0,1fr);align-items:center;gap:.25rem .7rem;color:#b9b3aa;font: 300 var(--texto-2)/1.25 Georgia,'Times New Roman',serif;letter-spacing:0;text-transform:none}
.detail-umbral .umbral-capture :is(input,textarea){min-height:var(--toque);padding:.28rem .1rem;border:0;border-bottom:1px solid rgba(201,168,106,.34);border-radius:0;background:transparent;font: 300 var(--texto-4)/1.35 Georgia,'Times New Roman',serif;letter-spacing:0;text-transform:none;transition:border-color var(--dur-2) ease,box-shadow var(--dur-2) ease}
.detail-umbral .umbral-capture textarea{min-height:3.1rem;grid-column:1/-1}
.detail-umbral .umbral-capture label:has(textarea){grid-template-columns:1fr;align-items:stretch}
.detail-umbral .umbral-capture :is(input,textarea):focus{outline:0;border-bottom-color:#ead6a7;background:linear-gradient(180deg,transparent,rgba(201,168,106,.035));box-shadow:0 14px 24px -22px rgba(234,214,167,.75)}
.detail-umbral .umbral-capture .workspace-primary{justify-self:end;width:auto;min-width:8.5rem;min-height:var(--toque);border-radius: var(--radio-pill);clip-path:none}
.detail-umbral .umbral-workspace blockquote{position:relative;margin:.7rem 0 0;padding:.55rem .85rem .55rem 1.4rem;border:0;color:#ead6a7;font-size: var(--texto-4);font-style:italic;line-height:1.45}
.detail-umbral .umbral-workspace blockquote::before{content:'✦';position:absolute;left:0;top:.65rem;color:#c9a86a;font-size: var(--texto-1)}
.detail-umbral .workspace-empty{margin:.45rem 0 0;padding:.65rem .8rem;font-size: var(--texto-3)}
.detail-umbral .intention-row input{width:20px;height:20px;flex:0 0 auto;margin-top:.12rem}
@media(max-width:760px){.detail-umbral .workspace-header{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;gap:.8rem;margin-bottom:.7rem}.detail-umbral .workspace-back{width:44px;margin:0;justify-content:center;overflow:hidden;border:1px solid rgba(201,168,106,.28);border-radius:50%}.detail-umbral .workspace-back span{display:none}.detail-umbral .workspace-back svg{width:1.05rem}.detail-umbral .workspace-title{display:contents}.detail-umbral .workspace-title::after{display:none}.detail-umbral .workspace-title>div{min-width:0}.detail-umbral .workspace-header h1{font-size:clamp(1.35rem,6vw,1.75rem)}.detail-umbral .workspace-header p{display:none}.detail-umbral .umbral-ritual{padding-top:.2rem}.detail-umbral .umbral-ritual+.umbral-ritual{padding-top:.65rem}.detail-umbral .umbral-capture{padding:0}.detail-umbral .umbral-capture label{grid-template-columns:1fr}.detail-umbral .umbral-capture .workspace-primary{min-width:8.5rem}}
@media(max-width:420px){.detail-umbral .workspace-primary{width:auto}.detail-umbral .umbral-ritual-title{align-items:flex-start}.detail-umbral .umbral-ritual-title>span{width:40px}.detail-umbral .umbral-ritual h2{font-size: var(--texto-6)}}
/* Núcleo: los pensamientos se agrupan por emoción dentro de un plasma local y privado. */
.detail-nucleo .nucleus-map-copy{max-width:38rem;margin:0 0 1.1rem;color:#c8c0d9;font-style:italic;line-height:1.6}
.detail-nucleo .nucleus-emotion-field{position:relative;isolation:isolate;width:min(100%,32rem);aspect-ratio:1;min-height:0;margin-inline:auto;overflow:visible;border:0;border-radius:50%;background:radial-gradient(circle at 50% 50%,rgba(129,115,183,.14),transparent 11%),radial-gradient(circle at 50% 48%,rgba(129,115,183,.18),transparent 52%),radial-gradient(circle at 38% 32%,#12141f,#080b11 72%);box-shadow:inset 0 0 90px rgba(0,0,0,.55),0 28px 68px rgba(0,0,0,.24)}
.nucleus-plasma{position:absolute;z-index:0;inset:5%;overflow:hidden;border-radius:50%;pointer-events:none}
.plasma-pool{position:absolute;width:52%;max-width:none;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:46% 54% 63% 37%/55% 43% 57% 45%;background:radial-gradient(circle at 42% 38%,color-mix(in srgb,var(--emotion-color) 72%,transparent),color-mix(in srgb,var(--emotion-color) 28%,transparent) 44%,transparent 74%);filter:blur(22px);opacity:.58;animation:nucleus-plasma-current 8.8s ease-in-out infinite alternate;animation-delay:calc(var(--plasma-index) * -1.35s)}
.plasma-paused .plasma-pool,.plasma-paused .thought-point span{animation-play-state:paused}
.thought-cloth>.thought-point{z-index:3;width:46px;height:46px;transform:translate(-50%,-50%)}
.thought-cloth>.thought-point span{--spark:calc(8.5px + 5.5px * (1 - min(var(--thought-freshness, 8), 8) / 8));position:relative;display:block;width:var(--spark);height:var(--spark);margin:auto;border:1px solid color-mix(in srgb,var(--thought-color) 70%,#ead6a7);border-radius:50%;background:var(--thought-color);box-shadow:0 0 12px color-mix(in srgb,var(--thought-color) 58%,transparent),0 8px 26px color-mix(in srgb,var(--thought-color) 42%,transparent)}
.thought-cloth>.thought-point span::after{content:'';position:absolute;inset:-8px;border:1px solid color-mix(in srgb,var(--thought-color) 38%,transparent);border-radius:50%;transform:scale(.72);transition:transform var(--dur-2) cubic-bezier(.16,1,.3,1),border-color var(--dur-2) ease}
.thought-cloth>.thought-point.is-newest span{animation:thought-plasma-pulse 3.8s ease-in-out infinite}
.thought-cloth>.thought-point.is-newest span::after{border-color:color-mix(in srgb,var(--thought-color) 58%,#ead6a7);transform:scale(1)}
.thought-cloth>.thought-point:hover span::after,.thought-cloth>.thought-point:focus-visible span::after{border-color:var(--thought-color);transform:scale(1)}
.thought-cloth>.thought-point:focus-visible{outline:2px solid #f4efe5;outline-offset:1px;border-radius:50%}
.thought-cloth>p{position:absolute;z-index:2;left:50%;top:50%;width:min(70%,16rem);margin:0;color:#c8c0d9;font-style:italic;line-height:1.5;text-align:center;transform:translate(-50%,-50%)}
.nucleus-emotion-key{display:flex;flex-wrap:wrap;gap:.65rem 1.2rem;margin:.9rem 0 0;padding:0;list-style:none}
.nucleus-emotion-key li{display:grid;grid-template-columns:.65rem minmax(0,auto) auto;align-items:center;gap:.45rem;color:#d5cedf;font: 500 var(--texto-1)/1.35 system-ui,sans-serif}
.nucleus-emotion-key li>span{width:.55rem;aspect-ratio:1;border-radius:50%;background:var(--emotion-color);box-shadow:0 4px 10px color-mix(in srgb,var(--emotion-color) 42%,transparent)}
.nucleus-emotion-key strong{font-weight:500}.nucleus-emotion-key small{color:#90899b;font-variant-numeric:tabular-nums}
.thought-reading-layer{position:fixed;z-index:90;inset:0;display:grid;place-items:center;padding:1.25rem;background:rgba(4,6,10,.72);backdrop-filter:blur(6px)}
.thought-reading-layer:focus{outline:none}
.detail-nucleo .thought-reading{width:min(100%,28rem);max-width:none;box-sizing:border-box;margin:0;padding:1.35rem 1.4rem 1.5rem;border:1px solid color-mix(in srgb,var(--thought-color) 38%,transparent);border-radius:14px;background:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--thought-color) 11%,transparent),transparent 44%),#0d121b;box-shadow:0 24px 62px rgba(0,0,0,.46)}
.detail-nucleo .thought-reading::before{background:linear-gradient(transparent,var(--thought-color),transparent)}
.detail-nucleo .thought-reading header{align-items:flex-start;margin-bottom:1.15rem}
.detail-nucleo .thought-reading header>div{display:grid;grid-template-columns:.65rem minmax(0,1fr);align-items:center;gap:.3rem .55rem;min-width:0}
.thought-emotion-mark{width:.6rem;aspect-ratio:1;border-radius:50%;background:var(--thought-color);box-shadow:0 5px 14px color-mix(in srgb,var(--thought-color) 46%,transparent)}
.detail-nucleo .thought-reading header strong{color:color-mix(in srgb,var(--thought-color) 76%,#f4efe5);font-size: var(--texto-3);font-weight:600;line-height:1.25}
.detail-nucleo .thought-reading header time{grid-column:2;color:#a9a2b1;line-height:1.3}
.detail-nucleo .thought-reading header button{display:grid;width:44px;height:44px;flex:0 0 auto;place-items:center;margin:-.75rem -.75rem 0 0;border:0;background:transparent;color:#d6cedf;cursor:pointer}
.detail-nucleo .thought-reading header button svg{width:1rem}
.detail-nucleo .thought-reading>svg{color:var(--thought-color);filter:drop-shadow(0 7px 14px color-mix(in srgb,var(--thought-color) 26%,transparent))}
.detail-nucleo .thought-reading p{max-height:min(46svh,22rem);margin:1rem 0 0;overflow:auto;white-space:pre-wrap}
.thought-float-enter-active,.thought-float-leave-active{transition:opacity var(--dur-2) ease}.thought-float-enter-active .thought-reading,.thought-float-leave-active .thought-reading{transition:transform var(--dur-3) cubic-bezier(.16,1,.3,1),filter var(--dur-2) ease}.thought-float-enter-from,.thought-float-leave-to{opacity:0}.thought-float-enter-from .thought-reading,.thought-float-leave-to .thought-reading{filter:blur(5px);transform:translateY(1rem) scale(.94)}
@keyframes nucleus-plasma-current{0%{border-radius:46% 54% 63% 37%/55% 43% 57% 45%;filter:blur(20px) brightness(.86);transform:translate(-53%,-48%) scale(.86)}50%{border-radius:61% 39% 42% 58%/43% 62% 38% 57%;filter:blur(15px) brightness(1.08);transform:translate(-46%,-54%) scale(1.12)}100%{border-radius:39% 61% 54% 46%/64% 38% 62% 36%;filter:blur(18px) brightness(.96);transform:translate(-50%,-47%) scale(.96)}}
@keyframes thought-plasma-pulse{0%,100%{opacity:.64;transform:scale(.78)}50%{opacity:1;transform:scale(1.18)}}
@media(max-width:760px){.detail-nucleo .nucleus-emotion-field{width:min(100%,28rem);min-height:0}.plasma-pool{width:54%}.nucleus-emotion-key{gap:.55rem 1rem}.thought-reading-layer{align-items:end;padding:1rem 1rem calc(6rem + env(safe-area-inset-bottom))}.detail-nucleo .thought-reading{width:100%}}
.journey-picker{display:grid;gap:.6rem}.journey-picker label{color:#c9c1b5;font: 300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}.journey-picker>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem}.journey-picker>div input{min-width:0;min-height:48px;border:0;border-bottom:1px solid rgba(125,167,151,.42);outline:0;background:transparent;color:#f4efe5;padding:.65rem .15rem;font: var(--texto-4)/1.4 Georgia,'Times New Roman',serif}.journey-picker>div input:focus-visible{border-bottom-color:#ead6a7;box-shadow:0 2px #ead6a7}.journey-picker>div button{min-height:44px;border:1px solid rgba(201,168,106,.42);border-radius: var(--radio-pill);background:rgba(201,168,106,.1);color:#ead6a7;padding:.65rem 1rem;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.journey-picker>div button:disabled{cursor:wait;opacity:.55}.journey-results{display:grid;max-height:14rem;margin:0;padding:.3rem;overflow:auto;border:1px solid rgba(125,167,151,.32);border-radius: var(--radio-md);background:#0d121b;list-style:none}.journey-results button{width:100%;min-height:44px;border:0;border-bottom:1px solid rgba(125,167,151,.14);background:transparent;color:#e3f0e8;padding:.6rem .7rem;text-align:left;cursor:pointer}.journey-results button:is(:hover,:focus-visible){outline:0;background:rgba(125,167,151,.12);color:#f4efe5}.journey-selected-place{display:grid;gap:.35rem;padding:.85rem 0;border-block:1px solid rgba(125,167,151,.2)}.journey-selected-place small{color:#c9c1b5;font: 300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}.journey-selected-place strong{color:#e3f0e8;font-size: var(--texto-5);font-weight:300}.journey-selected-place.empty strong{color:#a9b9b2;font-size: var(--texto-4);font-style:italic}.journey-location-message{margin:0;color:#b9c9c1;font: var(--texto-2)/1.45 system-ui,sans-serif}
.decree-ritual{position:fixed;z-index:120;inset:0;display:grid;place-content:center;justify-items:center;gap:2rem;padding:2rem;border:0;background:#080b11;color:#f4efe5;text-align:center;cursor:pointer}
.decree-ritual blockquote{max-width:38rem;margin:0;color:var(--texto);font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.65rem,5.2vw,2.35rem);font-weight:200;line-height:1.28;letter-spacing:-0.02em}
.decree-ritual>div{display:flex;gap:1rem}
.decree-ritual>div span{
  width:.7rem;
  aspect-ratio:1;
  border:1px solid rgba(201,168,106,.42);
  border-radius:50%;
  background:transparent;
  box-shadow:0 0 0 4px #080b11,0 0 0 5px color-mix(in srgb,var(--oro) 28%,transparent);
}
.decree-ritual>div span.filled{
  background:#c9a86a;
  box-shadow:0 0 0 4px #080b11,0 0 0 5px #c9a86a,0 0 18px rgba(201,168,106,.48);
  animation:aureo-appear var(--dur-3) var(--ease-out) both;
}
.decree-done{margin:0;color:#c9a86a;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:200;animation:aureo-appear var(--dur-3) var(--ease-out) both,aureo-fade-out 1.5s var(--ease-out) .4s both}
.decree-own blockquote{animation:aureo-breath var(--respiracion) var(--ease-in-out) infinite}
.decree-example{margin:.15rem 0 0;color:color-mix(in srgb,var(--oro-claro) 38%,transparent);font:italic 300 var(--texto-3)/1.5 Spectral,Georgia,serif}
.decree-record{align-items:flex-start;padding:var(--espacio-4) 0;border:0;background:transparent;box-shadow:none}
.decree-record>button{border:0;background:transparent;color:var(--oro-claro);font:300 var(--texto-3)/1.3 Georgia,serif;min-height:var(--toque);cursor:pointer}
.decree-record h2{margin:0;color:#f4efe5;opacity:var(--decree-opacity, .5);font:200 var(--texto-6)/1.2 Georgia,serif;letter-spacing:-0.02em}
.decree-record.fulfilled h2{color:#c9a86a;opacity:1;animation:aureo-appear var(--dur-3) var(--ease-out) both}
.decree-record.glow h2{text-shadow:0 0 18px rgba(201,168,106,.45)}
.decree-record time{display:block;margin-top:.35rem;color:rgba(201,168,106,.6);font:italic 300 var(--texto-2)/1.3 Spectral,Georgia,serif}
.decree-badge{display:block;margin:0 0 .35rem;padding:0;border:0;background:transparent;color:var(--decree-badge);font:italic 300 var(--texto-2)/1.3 Georgia,serif;letter-spacing:0;text-transform:none}
.detail-world-decretos .ritual-form{padding:0;border:0;background:transparent;box-shadow:none;backdrop-filter:none}
.detail-world-decretos .workspace-empty{padding:0;border:0;background:transparent}
.detail-world-hobbies .hobby-workspace,.detail-world-travesias .journey-workspace{grid-template-columns:minmax(0,1fr);justify-items:center;gap:var(--espacio-5)}
@media(max-width:760px){.detail-world-hobbies .hobby-workspace,.detail-world-travesias .journey-workspace{width:100%;gap:var(--espacio-3)}.detail-world-hobbies .workspace-header,.detail-world-travesias .workspace-header{margin-bottom:.55rem}.detail-world-hobbies .workspace-header h1,.detail-world-travesias .workspace-header h1{font-size:var(--texto-7)}.detail-world-hobbies .ritual-form,.detail-world-travesias .ritual-form,.detail-world-hobbies .hobby-moment-form{width:100%}}
.detail-world-hobbies .ritual-form,.detail-world-travesias .ritual-form,.detail-world-hobbies .hobby-moment-form,.detail-world-travesias .journey-postcard-edit{width:min(100%,28rem);margin-inline:auto;padding:0;border:0;background:transparent;box-shadow:none;backdrop-filter:none;text-align:left}
.detail-world-hobbies .ritual-form :is(input,select,textarea),.detail-world-travesias .ritual-form :is(input,select,textarea),.detail-world-decretos .ritual-form :is(input,select,textarea),.detail-world-hobbies .hobby-moment-form textarea,.detail-world-travesias .journey-postcard-edit textarea{border:0;border-bottom:1px solid rgba(201,168,106,.32);border-radius:0;background:transparent}
.detail-world-hobbies .ritual-form :is(input,select,textarea):focus-visible,.detail-world-travesias .ritual-form :is(input,select,textarea):focus-visible,.detail-world-decretos .ritual-form :is(input,select,textarea):focus-visible,.detail-world-hobbies .hobby-moment-form textarea:focus-visible,.detail-world-travesias .journey-postcard-edit textarea:focus-visible{border-bottom-color:var(--oro-claro);box-shadow:0 2px var(--oro-claro)}
.detail-world-hobbies .ritual-form>label:not(:has(textarea)):not(.balance-recurring),.detail-world-travesias .ritual-form>label:not(:has(textarea)):not(.balance-recurring){grid-template-columns:minmax(0,1fr);align-items:start;gap:.35rem}
.hobby-moment-title{margin:0;font:200 var(--texto-6)/1.1 Georgia,serif;letter-spacing:-0.02em}
.hobby-moment-hint{margin:0;color:rgba(244,239,229,.62);font:italic 300 var(--texto-2)/1.45 Spectral,Georgia,serif}
.hobby-moment-saved{margin:0;color:#ead6a7;font:italic 300 var(--texto-3)/1.4 Georgia,serif}
.journey-postcard-edit{display:grid;gap:.75rem;padding:0;border:0;background:transparent}
.journey-postcard-edit strong{font:200 var(--texto-6)/1.1 Spectral,'Aureo Serif',Georgia,serif;color:#f4efe5}
.journey-postcard-edit label{display:grid;gap:.35rem;color:#c8c1b6}
.journey-forget{min-height:var(--toque);border:0;background:transparent;color:#d8d1c6;cursor:pointer}
.care-heart{position:absolute;z-index:4;right:.4rem;top:.2rem;display:grid;width:44px;height:44px;place-items:center;border:0;background:transparent;color:#c47a5a;cursor:pointer;animation:aureo-breath 5s var(--ease-in-out) infinite}
.care-heart svg{width:1.05rem;opacity:.72}
.care-poster-frame{position:absolute;z-index:3;inset:0;pointer-events:none;background:radial-gradient(circle at 12% 10%,rgba(201,168,106,.28),transparent 18%),radial-gradient(circle at 88% 90%,rgba(201,168,106,.22),transparent 16%)}
.care-poster-seal{position:absolute;z-index:4;right:.7rem;bottom:.7rem;color:rgba(201,168,106,.7);font:600 var(--texto-1)/1 system-ui,sans-serif;letter-spacing:.14em}
.care-poster-inscription em{display:block;margin-top:.25rem;color:rgba(244,239,229,.45);font:italic 300 12px/1.35 Spectral,Georgia,serif}
.care-species{display:flex;flex-wrap:wrap;gap:.35rem .15rem;margin:0;padding:0;border:0}
.care-species legend,.care-kind-choice legend{margin-bottom:.35rem;color:var(--texto-suave);font:300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}
.care-species button{display:grid;min-width:52px;min-height:var(--toque);place-items:center;gap:.25rem;padding:.2rem .45rem;border:0;background:transparent;color:var(--texto-suave);cursor:pointer}
.care-species button svg{width:1.05rem;padding:.55rem;border:1px solid rgba(201,168,106,.22);border-radius:50%}
.care-species button span{font:500 var(--texto-1)/1 system-ui,sans-serif}
.care-species button.active{color:var(--oro-claro)}
.care-species button.active svg{border-color:var(--oro-claro);background:rgba(201,168,106,.1)}
.care-species button:focus-visible{outline:2px solid var(--oro-claro);outline-offset:2px;border-radius:12px}
.care-notes-toggle{min-height:var(--toque);border:0;background:transparent;color:rgba(244,239,229,.6);font:300 var(--texto-3)/1.4 Spectral,Georgia,serif;text-align:left;cursor:pointer}
.care-notes-fields{display:grid;gap:.7rem}
.care-memory-space{display:grid;gap:1.2rem}
.care-memory-lead{margin:0;color:#ead6a7;font:italic 300 var(--texto-4)/1.5 Georgia,serif}
.care-memory-list{display:grid;gap:1rem;margin:0;padding:0;list-style:none}
.care-memory-list li{display:grid;grid-template-columns:4.5rem minmax(0,1fr);gap:.85rem;align-items:center}
.care-memory-list img{width:4.5rem;height:4.5rem;object-fit:cover;border-radius:50%}
@keyframes aureo-appear{from{opacity:0}to{opacity:1}}
@keyframes aureo-fade-out{to{opacity:0}}
@keyframes aureo-breath{0%,100%{opacity:.62;transform:scale(.98)}50%{opacity:1;transform:scale(1.03)}}
@media(prefers-reduced-motion:reduce){.care-heart,.decree-own blockquote,.decree-ritual>div span.filled,.decree-done,.decree-record.fulfilled h2{animation:none}}
.decree-claim{position:fixed;z-index:121;inset:0;display:grid;place-content:center;justify-items:center;gap:1.2rem;padding:2rem;background:rgba(8,11,17,.96);color:#f4efe5;text-align:center}.decree-claim p{margin:0;color:#b9b3aa}.decree-claim strong{max-width:34rem;color:#ead6a7;font-size:clamp(1.4rem,4vw,2.2rem);font-weight:300}.decree-claim>div{display:flex;gap:.75rem}.decree-claim button{min-height:48px;border:1px solid rgba(201,168,106,.35);border-radius:var(--radio-pill);background:transparent;color:#d8d1c6;padding:.75rem 1.1rem;font:300 var(--texto-3)/1 Fraunces,'Aureo Serif',Georgia,serif}.decree-claim button:last-child{background:rgba(201,168,106,.14);color:#ead6a7}
.balance-base-income{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .55rem;width:fit-content;max-width:100%;margin:.35rem 0 0;padding:.45rem .7rem}.balance-base-income label{margin:0;color:#c9c1b5;font: 300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}.balance-base-row{display:flex;align-items:center;gap:.15rem}.balance-base-income .balance-money-field{width:8.6rem;flex:0 0 auto}.balance-base-edit{display:grid;width:44px;height:44px;place-items:center;border:0;background:transparent;color:#ead6a7;cursor:pointer}.balance-base-edit svg{width:1rem}.balance-base-edit:focus-visible{outline:2px solid #ead6a7;outline-offset:2px}.balance-base-saved{width:100%;margin:0;color:#c9a86a;font: italic 300 var(--texto-2)/1.3 Spectral,'Aureo Serif',Georgia,serif}.daruma-progress input{min-height:46px;box-sizing:border-box;border:1px solid rgba(201,168,106,.28);border-radius:10px;background:#0d121b;color:#f4efe5;padding:.65rem .75rem}.balance-recurring{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center;min-height:44px}.balance-recurring input{width:22px!important;min-height:22px!important}.daruma-progress{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;margin-top:.6rem}.daruma-progress button,.daruma-transfer{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:.35rem;border:1px solid rgba(201,168,106,.38);border-radius:10px;background:rgba(201,168,106,.1);color:#ead6a7;padding:.55rem .75rem;cursor:pointer}.daruma-transfer{margin-top:.6rem}.daruma-transfer svg{width:1rem}
@media(max-width:560px){.decree-ritual{padding:1.5rem}}
@media(max-width:760px){.workspace-primary{min-height:44px;padding:.6rem .9rem}.ritual-form,.nucleus-entry,.golden-entry{padding:.95rem;gap:.85rem}.ritual-form{padding:.95rem}.workspace-text,.workspace-back{min-height:var(--toque)}.daruma-progress button,.daruma-transfer,.segmented-choice button{padding:.5rem .7rem}}
@media(prefers-reduced-motion:reduce){.tw-workspace{animation:workspace-appear var(--dur-1) ease-out both}.workspace-aura,.ritual-form::before,.thought-cloth,.thought-cloth>button span,.plasma-pool,.golden-sculpture,.golden-sculpture>.resin-rift,.golden-sculpture>button span,.umbral-workspace::before{animation:none}.workspace-record,.intention-row{animation:none}.thought-float-enter-active,.thought-float-leave-active,.thought-float-enter-active .thought-reading,.thought-float-leave-active .thought-reading{transition-duration:1ms}.tw-workspace *{scroll-behavior:auto!important;transition-duration:var(--dur-1)!important}}@keyframes workspace-appear{from{opacity:.72}to{opacity:1}}
/* v1.3 — los detalles son lecturas en un campo, no tarjetas administrativas. */
.tw-workspace{padding:clamp(.2rem,1.2vw,1rem);border-radius: var(--radio-organico-3)}.workspace-header{padding:.45rem .35rem .85rem}.workspace-back{border-radius: var(--radio-pill);padding:.65rem .9rem;background:rgba(8,11,17,.28)}.workspace-title{padding:.2rem .45rem}.ritual-form{padding:clamp(1.05rem,2.5vw,1.55rem);border:1px solid color-mix(in srgb,var(--workspace-accent) 28%,transparent);border-radius: var(--radio-organico-2);background:linear-gradient(135deg,color-mix(in srgb,var(--workspace-accent) 8%,rgba(10,15,23,.72)),rgba(8,11,17,.34));backdrop-filter:blur(13px);clip-path:none;box-shadow:0 20px 48px rgba(0,0,0,.15)}.ritual-form::before{display:none}.ritual-form :is(input,select,textarea){border-radius: var(--radio-organico-1);background:rgba(7,11,17,.58)}.workspace-primary{border-radius: var(--radio-pill);clip-path:none;box-shadow:0 12px 28px rgba(0,0,0,.2)}.workspace-primary::after{display:none}.workspace-primary:hover{transform:translateY(-1px);box-shadow:0 16px 36px color-mix(in srgb,var(--workspace-accent) 15%,rgba(0,0,0,.22))}.workspace-record{padding:.95rem .55rem .95rem 1.5rem;border-bottom-color:color-mix(in srgb,var(--workspace-accent) 17%,transparent)}.workspace-record>button,.daruma-progress button,.daruma-transfer{border-radius: var(--radio-pill)}.workspace-empty{padding:1rem 1.1rem;border:1px dashed color-mix(in srgb,var(--workspace-accent) 28%,transparent);border-radius: var(--radio-organico-2);background:color-mix(in srgb,var(--workspace-accent) 4%,transparent)}.balance-base-income{padding:.4rem .65rem .4rem .85rem;border:1px solid rgba(201,168,106,.2);border-radius: var(--radio-organico-2);background:rgba(10,15,23,.42);backdrop-filter:blur(12px)}.thought-reading{border:1px solid color-mix(in srgb,var(--thought-color) 36%,transparent);border-radius: var(--radio-organico-2);background:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--thought-color) 12%,transparent),transparent 44%),rgba(13,18,27,.94);backdrop-filter:blur(14px)}.nucleus-entry,.golden-entry{padding:1.25rem 1.35rem;border:1px solid color-mix(in srgb,var(--workspace-accent) 24%,transparent);border-radius: var(--radio-organico-2);background:rgba(9,13,21,.4);backdrop-filter:blur(13px)}.nucleus-entry textarea,.golden-entry textarea{border-radius: var(--radio-organico-1)}.nucleus-gate{padding:1.75rem;border:1px solid rgba(129,115,183,.25);border-radius: var(--radio-organico-3);background:rgba(10,14,23,.48);backdrop-filter:blur(14px)}.note-grid button{border-radius:50%}
@media(max-width:760px){.tw-workspace{padding:0;border-radius: var(--radio-organico-2)}.workspace-header{padding:.4rem .15rem 1.1rem}.ritual-form,.nucleus-entry,.golden-entry{border-radius: var(--radio-organico-2)}.balance-base-income{border-radius: var(--radio-organico-2)}.workspace-primary{width:auto}.workspace-record>button{border-radius: var(--radio-pill)}.nucleus-gate{border-radius: var(--radio-organico-2)}.detail-world-hobbies .hobby-workspace,.detail-world-travesias .journey-workspace{grid-template-columns:minmax(0,1fr);gap:1.5rem}.detail-world-travesias .journey-postcard-edit{grid-column:auto}}
@media(min-width:1024px){.tw-workspace{padding:.35rem}.workspace-header{margin-bottom:1.05rem;padding:.25rem .15rem .7rem}.workspace-header h1{font-size:clamp(var(--texto-7),2.6vw,var(--texto-8))}.workspace-title{padding:.1rem .15rem}.workspace-grid,.balance-lists,.umbral-workspace{gap:1.15rem}.detail-world-vinculos .constellation-workspace{gap:1.5rem}.constellation-map{width:min(100%,30rem)}.ritual-form{padding:1.05rem}}
.ritual-form textarea,.nucleus-entry textarea,.golden-entry textarea{min-height:4.25rem;resize:none}
.ritual-form>label:not(:has(textarea)):not(.balance-recurring){display:grid;grid-template-columns:minmax(6.5rem,11.25rem) minmax(0,1fr);align-items:center;gap:.3rem .75rem;color:#c9c1b5;font: 300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}
.ritual-form :is(input,select){min-height:var(--toque);padding:.35rem .7rem;font: 300 var(--texto-3)/1.35 Georgia,'Times New Roman',serif}
/* Mi Constelación: una sola posición de etiqueta y campos a todo el ancho.
   Con etiqueta al lado, la columna se comía el campo y el signo salía truncado. */
.detail-world-vinculos .ritual-form>label:not(:has(textarea)):not(.balance-recurring){grid-template-columns:minmax(0,1fr);align-items:start;gap:.35rem}
.ritual-form textarea{padding:.55rem .7rem;font: 300 var(--texto-3)/1.45 Georgia,'Times New Roman',serif}
.ritual-form .balance-money-field,.balance-base-income .balance-money-field{display:flex;align-items:center;gap:.3rem;min-width:0;min-height:var(--toque);padding:0 .7rem;border:1px solid rgba(201,168,106,.25);border-radius: var(--radio-organico-1);background:rgba(7,11,17,.58)}
.ritual-form .balance-money-field input,.balance-base-income .balance-money-field input{min-height:2.2rem;padding:.3rem 0;border:0;border-radius:0;background:transparent}
.balance-money-sign{flex:0 0 auto;color:#d7b873;font: 300 var(--texto-4)/1 Georgia,'Times New Roman',serif}
.ritual-form input[type=number],.balance-base-income input[type=number]{appearance:textfield;-moz-appearance:textfield}
.ritual-form input[type=number]::-webkit-outer-spin-button,.ritual-form input[type=number]::-webkit-inner-spin-button,.balance-base-income input[type=number]::-webkit-outer-spin-button,.balance-base-income input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.care-inscription-editor>label:not(:has(textarea)){grid-template-columns:minmax(5.5rem,8.5rem) minmax(0,1fr);align-items:center;gap:.3rem .75rem;font: 300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}
.care-inscription-editor input:not([type=file]){min-height:2.25rem;padding:.3rem .1rem;font: 300 var(--texto-3)/1.35 Georgia,'Times New Roman',serif}
.care-inscription-editor textarea{min-height:4rem;padding:.45rem .1rem;font: 300 var(--texto-3)/1.45 Georgia,'Times New Roman',serif}
.note-grid button.hint{background:#c9a86a;color:#080b11;border-color:#ead6a7;box-shadow:0 0 16px rgba(201,168,106,.4)}
.nucleus-hint{display:inline-flex;min-height:44px;margin:.35rem auto 0;align-items:center;padding:.55rem 1.1rem;border:1px solid rgba(201,168,106,.4);border-radius: var(--radio-pill);background:transparent;color:#ead6a7;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}
.nucleus-hint:disabled{opacity:.62;cursor:wait}
.workspace-title.workspace-title-quiet{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.workspace-panes{display:flex;justify-content:center;align-items:stretch;gap:.4rem;width:100%;margin:0}
.workspace-panes button{flex:1 1 0;min-height:44px;max-width:12.5rem;margin:0;padding:.45rem .7rem;border:1px solid rgba(201,168,106,.22);border-radius: var(--radio-pill);background:transparent;color:#b9b3aa;font: 300 var(--texto-3)/1.15 Georgia,'Times New Roman',serif;letter-spacing:.01em;cursor:pointer}
.workspace-panes button[aria-selected="true"]{color:#ead6a7;border-color:#c9a86a;background:rgba(201,168,106,.14)}
.workspace-panes button:focus-visible{outline:2px solid #ead6a7;outline-offset:2px}
.detail-balance .workspace-title{display:flex;justify-content:center;width:100%;padding-inline:0}
/* El hilo ritual acompaña un encabezado; bajo un grupo de pestañas se lee como un subrayado roto. */
.detail-balance .workspace-title::after{display:none}
.balance-pane{display:grid;gap:var(--espacio-3);width:min(100%,38rem);margin-inline:auto}
/* Sitio para el sello de captura y la navegación: la última fila dejaba de ser legible. */
@media(max-width:1023px){.tw-workspace{padding-bottom:calc(4.75rem + env(safe-area-inset-bottom))}}
.balance-pane .balance-lists{display:grid;grid-template-columns:minmax(0,1fr);margin-top:.15rem}
.balance-pane .ritual-form:not(.open){gap:0;padding:.7rem .8rem}

/* Lo que tengo hoy: una sola superficie, la cifra al frente y oculta por defecto. */
.balance-summary{display:grid;gap:var(--espacio-1);padding:var(--espacio-3);border:1px solid var(--borde);border-radius:var(--radio-organico-2);background:linear-gradient(150deg,rgba(201,168,106,.07),rgba(8,11,17,.34))}
.balance-summary-label{margin:0;color:var(--texto-suave);font:500 var(--texto-1)/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.balance-summary-figure{display:flex;align-items:baseline;gap:var(--espacio-2)}
.balance-summary-figure strong{flex:1;min-width:0;color:var(--texto);font:200 var(--texto-8)/1 Fraunces,'Aureo Serif',Georgia,serif;font-variant-numeric:tabular-nums;letter-spacing:-.03em}
.balance-summary-figure strong.hidden{color:var(--oro);font-size:var(--texto-6);letter-spacing:.3em}
.balance-summary .balance-amount-toggle{display:grid;width:var(--toque);height:var(--toque);flex:0 0 auto;place-items:center;margin:0;border:0;border-radius:var(--radio-pill);background:transparent;color:var(--oro-claro);cursor:pointer}
.balance-summary .balance-amount-toggle svg{width:1.15rem}
.balance-summary .balance-amount-toggle:focus-visible{outline:2px solid var(--oro-claro);outline-offset:2px}
.balance-summary-split{display:grid;grid-template-columns:1fr 1fr;gap:var(--espacio-2);margin:var(--espacio-1) 0 0;padding-top:var(--espacio-2);border-top:1px solid var(--borde)}
.balance-summary-split div{display:grid;gap:.1rem}
.balance-summary-split dt{color:var(--texto-suave);font:500 var(--texto-1)/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.balance-summary-split dd{margin:0;font:300 var(--texto-3)/1.2 Georgia,'Times New Roman',serif;font-variant-numeric:tabular-nums}
.balance-summary-split .entra dd{color:var(--salvia)}
.balance-summary-split .sale dd{color:var(--ocaso)}

/* El ingreso base vive dentro del resumen: una línea, no una cápsula dentro de otra. */
.balance-summary .balance-base-income{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem var(--espacio-2);width:100%;margin:var(--espacio-1) 0 0;padding:var(--espacio-2) 0 0;border:0;border-top:1px solid var(--borde);border-radius:0;background:none}
.balance-summary .balance-base-income label{flex:1;min-width:0;color:var(--texto-suave);font:500 var(--texto-1)/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.balance-summary .balance-base-income .balance-money-field{display:flex;width:auto;min-width:0;flex:0 0 auto;align-items:center;gap:.2rem;min-height:var(--toque);padding:0 .1rem;border:0;border-bottom:1px solid var(--borde);border-radius:0;background:none}
.balance-summary .balance-base-income .balance-money-field:focus-within{border-bottom-color:var(--oro-claro)}
.balance-summary .balance-base-income .balance-money-field input{width:4rem;min-width:0;min-height:var(--toque);flex:0 0 auto;padding:0;font-variant-numeric:tabular-nums;text-align:left}

/* Fila de movimiento: la cifra queda junto a su nombre, no al otro extremo de la pantalla. */
.balance-flow .workspace-record{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:var(--espacio-3)}
.balance-flow .workspace-record strong{font-variant-numeric:tabular-nums;white-space:nowrap}
.balance-flow .workspace-record.is-entra strong{color:var(--salvia)}
.balance-flow .workspace-record.is-sale strong{color:var(--texto)}

/* Registrar: el grupo Entra/Sale se nombra, para que no se lea como un filtro. */
.segmented-block{display:grid;gap:var(--espacio-2)}
.segmented-legend{color:var(--texto-suave);font:500 var(--texto-1)/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.balance-pane .segmented-choice{grid-template-columns:repeat(2,minmax(0,10rem))}
/* `margin-inline:auto` en un grid item lo encoge a su contenido: eso dejaba a Entra/Sale
   flotando como isla y recortaba su etiqueta. El formulario ocupa su columna. */
.balance-pane .ritual-form.compact{width:100%;max-width:none;margin-inline:0;overflow:visible}
/* Sin marco propio cuando está cerrado: el grupo pertenece al panel. */
.balance-pane .ritual-form:not(.open){padding:0;border:0;background:none;box-shadow:none;backdrop-filter:none;clip-path:none}
.balance-pane .ritual-form:not(.open)::before{display:none}

@media(max-width:760px){.detail-balance .workspace-header{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:.5rem}.detail-balance .workspace-back{margin:0}}
.detail-balance .workspace-header{margin-bottom:.55rem}
.balance-pane .goal-composer{width:100%;max-width:none;margin:0;gap:.4rem;padding:.65rem .75rem .7rem}
.goal-composer .goal-row{display:grid;grid-template-columns:minmax(5.4rem,8.2rem) minmax(0,1fr);align-items:center;gap:.18rem .6rem;margin:0;color:#c9c1b5;font: 300 var(--texto-2)/1.2 Georgia,'Times New Roman',serif}
.goal-composer .goal-row:has(.goal-swatches){grid-template-columns:minmax(0,1fr);align-items:start;gap:.28rem}
.goal-composer .goal-row :is(input,.balance-money-field){min-height:var(--toque)}
.goal-composer .goal-row input{padding:.25rem .55rem;font-size: var(--texto-3)}
.goal-composer .balance-money-field{min-height:var(--toque);padding:0 .55rem}
/* La muestra se ve pequeña; el área de toque mide 44px y las ocho caben sin desplazamiento. */
.goal-swatches{display:flex;flex-wrap:wrap;align-items:center;gap:.1rem;min-width:0}
.goal-swatches button{width:var(--toque);height:var(--toque);margin:0;padding:9px;border:0;border-radius:50%;background-clip:content-box;background-origin:content-box;flex:0 0 auto;cursor:pointer}
.goal-swatches button.selected{outline:2px solid #c9a86a;outline-offset:-6px}
.goal-swatches button:focus-visible{outline:2px solid #ead6a7;outline-offset:-4px}
.goal-composer .workspace-primary{justify-self:end;width:auto;min-width:8.5rem;min-height:var(--toque);margin-top:.1rem;padding:.4rem .9rem;font-size: var(--texto-2)}
.goal-ledger{gap:0}
.goal-ledger .workspace-record.daruma{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.4rem .55rem;padding:.4rem .1rem;border-bottom:1px solid rgba(201,168,106,.14)}
.goal-ledger .workspace-record.daruma>span{width:1.05rem;height:1.05rem;border-radius:50%}
.goal-ledger .daruma-copy{min-width:0}
.goal-ledger .daruma-copy h3{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size: var(--texto-4);font-weight:300;line-height:1.15}
.goal-ledger .daruma-copy p{margin:.08rem 0 0;font-size: var(--texto-1)}
.goal-ledger .daruma-progress{display:flex;align-items:center;gap:.28rem;margin:0}
.goal-ledger .daruma-progress input{width:3.8rem;min-height:var(--toque);padding:.28rem .4rem;border-radius: var(--radio-pill);font-size: var(--texto-2)}
.goal-ledger .daruma-progress button,.goal-ledger .daruma-transfer{width:auto;min-height:var(--toque);margin:0;padding:.32rem .65rem;font-size: var(--texto-2)}
.goal-ledger small{color:#b9b3aa;font: italic 300 var(--texto-1)/1.3 Spectral,'Aureo Serif',Georgia,serif}
.detail-edad-dorada .workspace-header{margin-bottom:0;padding:.1rem .1rem .15rem}
.detail-edad-dorada .workspace-back{margin-bottom:0}
.detail-edad-dorada .workspace-title::after{display:none}
@media(max-width:760px){
  .detail-edad-dorada .workspace-header{padding:.05rem 0 .1rem}
  .detail-edad-dorada .workspace-back{min-height:var(--toque);padding:.45rem .7rem}
  .detail-edad-dorada .daruma-stage{margin-top:-.35rem}
}

/* Hobbies, Travesías, Decretos, Cuidado: filete, no vidrio v1.3. */
.detail-world-hobbies .ritual-form,
.detail-world-travesias .ritual-form,
.detail-world-decretos .ritual-form,
.detail-world-hobbies .hobby-moment-form,
.detail-world-travesias .journey-postcard-edit{
  width:min(100%,28rem);
  margin-inline:auto;
  padding:0;
  border:0;
  border-radius:0;
  background:transparent;
  box-shadow:none;
  backdrop-filter:none;
  clip-path:none;
}
.detail-world-hobbies .ritual-form::before,
.detail-world-travesias .ritual-form::before,
.detail-world-decretos .ritual-form::before,
.detail-world-hobbies .hobby-moment-form::before{display:none}
.detail-world-hobbies .ritual-form :is(input,select,textarea),
.detail-world-travesias .ritual-form :is(input,select,textarea),
.detail-world-decretos .ritual-form :is(input,select,textarea),
.detail-world-hobbies .hobby-moment-form textarea,
.detail-world-travesias .journey-postcard-edit textarea{
  border:0;
  border-bottom:1px solid rgba(201,168,106,.32);
  border-radius:0;
  background:transparent;
  box-shadow:none;
}
.detail-world-hobbies .ritual-form :is(input,select,textarea):focus,
.detail-world-travesias .ritual-form :is(input,select,textarea):focus,
.detail-world-decretos .ritual-form :is(input,select,textarea):focus,
.detail-world-hobbies .ritual-form :is(input,select,textarea):focus-visible,
.detail-world-travesias .ritual-form :is(input,select,textarea):focus-visible,
.detail-world-decretos .ritual-form :is(input,select,textarea):focus-visible,
.detail-world-hobbies .hobby-moment-form textarea:focus-visible,
.detail-world-travesias .journey-postcard-edit textarea:focus-visible{
  border-bottom-color:var(--oro-claro);
  background:transparent;
  box-shadow:0 2px var(--oro-claro);
}
.detail-world-hobbies .ritual-form>label:not(:has(textarea)):not(.balance-recurring),
.detail-world-travesias .ritual-form>label:not(:has(textarea)):not(.balance-recurring),
.detail-world-decretos .ritual-form>label:not(:has(textarea)):not(.balance-recurring){
  grid-template-columns:minmax(0,1fr);
  align-items:start;
  gap:.35rem;
}
.detail-world-hobbies .hobby-workspace,
.detail-world-travesias .journey-workspace,
.detail-world-decretos .decree-workspace{
  grid-template-columns:minmax(0,1fr);
  justify-items:center;
  gap:var(--espacio-5);
}
.detail-world-decretos .decree-workspace{max-width:32rem;margin-inline:auto;width:100%;justify-items:stretch}
.detail-world-decretos .workspace-records{width:min(100%,32rem);margin-inline:auto}
.workspace-title-of{
  margin:.12rem 0 0;
  color:var(--oro-claro);
  font:italic 300 var(--texto-3)/1.3 Spectral,'Aureo Serif',Georgia,serif;
}
.detail-world-decretos .ritual-form{
  width:min(100%,32rem);
  gap:1.05rem;
}
.detail-world-decretos .ritual-form>label{
  gap:.18rem;
  color:var(--texto-suave);
  font:italic 300 var(--texto-2)/1.35 Spectral,Georgia,serif;
}
.detail-world-decretos .ritual-form textarea{
  min-height:4.6rem;
  padding:.25rem 0 .55rem;
  font:200 var(--texto-6)/1.22 Fraunces,'Aureo Serif',Georgia,serif;
  letter-spacing:-.03em;
}
.detail-world-decretos .workspace-primary{
  width:100%;
  min-height:46px;
  margin-top:.15rem;
  border:1px solid var(--oro);
  background:rgba(201,168,106,.14);
  color:var(--oro-claro);
  font:300 var(--texto-3)/1 Fraunces,'Aureo Serif',Georgia,serif;
  box-shadow:none;
}
.decree-dims{
  position:relative;
  display:flex;
  width:100%;
  gap:.15rem;
}
.decree-dims::before{
  content:'';
  position:absolute;
  left:0;
  right:0;
  bottom:.42rem;
  height:1px;
  pointer-events:none;
  background:linear-gradient(90deg,var(--oro),color-mix(in srgb,#8173b7 70%,var(--oro)) 62%,transparent);
  opacity:.45;
}
.decree-dims button{
  position:relative;
  flex:1 1 0;
  min-height:var(--toque);
  margin:0;
  padding:.2rem .05rem .7rem;
  border:0;
  background:transparent;
  color:var(--texto-suave);
  font:italic 300 var(--texto-3)/1 Spectral,Georgia,serif;
  letter-spacing:-.02em;
  cursor:pointer;
}
.decree-dims button::after{
  content:'';
  position:absolute;
  left:50%;
  bottom:.35rem;
  width:0;
  height:2px;
  border-radius:var(--radio-pill);
  background:var(--decree-dim,var(--oro));
  box-shadow:0 8px 18px -10px var(--decree-dim,var(--oro));
  transform:translateX(-50%);
  opacity:0;
  transition:width var(--dur-2,.35s) var(--ease-out,cubic-bezier(.23,1,.32,1)),opacity var(--dur-2,.35s) ease;
}
.decree-dims button[aria-checked='true']{color:var(--decree-dim,var(--oro-claro))}
.decree-dims button[aria-checked='true']::after{width:min(100%,2.6rem);opacity:1}
.decree-dims button:focus-visible{outline:2px solid var(--oro-claro);outline-offset:3px}
.decree-record{
  display:grid;
  grid-template-columns:auto auto;
  justify-content:center;
  justify-items:center;
  gap:.08rem .7rem;
  padding:.55rem 0 .5rem;
  padding-inline-start:0;
  border:0;
  border-bottom:1px solid color-mix(in srgb,#8173b7 12%,transparent);
  background:transparent;
  box-shadow:none;
  animation:none;
  text-align:center;
}
.decree-record:last-of-type{border-bottom:0}
.decree-record::before{display:none}
.decree-badge{
  display:block;
  grid-column:1;
  grid-row:1;
  margin:0;
  color:var(--decree-badge);
  font:italic 300 var(--texto-2)/1.3 Spectral,Georgia,serif;
}
.decree-record h2{
  grid-column:1/-1;
  grid-row:2;
  margin:0;
  max-width:34rem;
  color:#f4efe5;
  opacity:var(--decree-opacity,.5);
  font:200 clamp(var(--texto-5),4.2vw,var(--texto-6))/1.2 Fraunces,'Aureo Serif',Georgia,serif;
  letter-spacing:-.03em;
  overflow-wrap:anywhere;
}
.decree-record time{
  grid-column:1/-1;
  grid-row:3;
  margin:0;
}
.decree-record>button{
  grid-column:2;
  grid-row:1;
  width:auto;
  min-height:var(--toque);
  margin:0;
  padding:0;
  border:0;
  border-radius:0;
  background:transparent;
  color:var(--oro-claro);
  font:italic 300 var(--texto-2)/1.3 Spectral,Georgia,serif;
}
@media(max-width:420px){.decree-record>button{width:auto}}
@media(prefers-reduced-motion:reduce){.decree-dims button::after{transition-duration:1ms}}
.detail-world-decretos .workspace-empty{
  padding:0;
  border:0;
  background:transparent;
}
.care-kind-choice{gap:.9rem}
.care-kind-choice legend,.care-species legend{
  width:100%;
  margin-bottom:.35rem;
  color:var(--texto-suave);
  font:300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif;
}
.care-kind-choice button{
  min-height:var(--toque);
  padding:.2rem 0;
  border:0;
  border-bottom:1px solid transparent;
  border-radius:0;
  background:transparent;
  color:var(--texto-suave);
  font:300 var(--texto-4)/1.3 Georgia,'Times New Roman',serif;
}
.care-kind-choice button.active{
  border-color:transparent;
  border-bottom-color:var(--oro-claro);
  background:transparent;
  color:var(--oro-claro);
}
.care-species button span{font:300 var(--texto-1)/1.2 Georgia,'Times New Roman',serif}
.care-inscription-editor>label{display:grid;gap:.35rem;color:var(--texto-suave);font:300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif}
.care-inscription-editor>label:not(:has(textarea)){grid-template-columns:minmax(0,1fr);align-items:start}
.care-poster-inscription small{
  color:#ead6a7;
  font:italic 300 var(--texto-2)/1.3 Georgia,'Times New Roman',serif;
  letter-spacing:0;
  text-transform:none;
}
.care-poster-inscription p{font:italic 300 var(--texto-3)/1.5 Georgia,'Times New Roman',serif}
.care-poster-seal{letter-spacing:.08em;font:300 var(--texto-2)/1 Georgia,serif}
.care-composer-layer{position:fixed;z-index:90;inset:0;display:grid;align-items:end;justify-items:stretch;padding:1rem 1rem calc(6.05rem + env(safe-area-inset-bottom));background:rgba(4,6,10,.72)}
.care-composer{
  --composer-accent:var(--workspace-accent,#c9a86a);
  position:relative;
  width:min(100%,24rem);
  max-height:min(86svh,46rem);
  margin-inline:auto;
  overflow:auto;
  padding:1.15rem 1.2rem 1.3rem 1.55rem;
  border:0;
  border-radius:var(--radio-organico-3);
  outline:0;
  background:
    radial-gradient(ellipse 92% 86% at 38% 28%, color-mix(in srgb, var(--composer-accent) 18%, rgba(14, 20, 30, .55)), transparent 72%),
    #0c1118;
  box-shadow:inset 0 0 52px rgba(0,0,0,.4),0 28px 70px rgba(0,0,0,.55);
}
.care-composer::before{
  content:'';
  position:absolute;
  left:.85rem;
  top:1.25rem;
  bottom:1.25rem;
  width:1px;
  border-radius:var(--radio-pill);
  background:linear-gradient(transparent,var(--composer-accent),transparent);
  box-shadow:0 0 12px color-mix(in srgb,var(--composer-accent) 42%,transparent);
  pointer-events:none;
}
.care-composer header{display:flex;align-items:start;justify-content:space-between;gap:.75rem;margin-bottom:.35rem}
.care-composer h2{position:relative;display:grid;gap:.08rem;min-width:0;flex:1;margin:0;padding:.05rem 0 .95rem;overflow:visible;color:#f4efe5}
.care-composer-lead{color:#f4efe5;font:200 var(--texto-6)/.96 Fraunces,'Aureo Serif',Georgia,serif;letter-spacing:-.03em}
.care-composer-of{color:var(--oro-claro);font:italic 300 var(--texto-3)/1.3 Spectral,'Aureo Serif',Georgia,serif}
.care-composer h2::before{
  content:'';
  position:absolute;
  left:0;
  bottom:2px;
  z-index:1;
  width:8px;
  height:8px;
  border-radius:50%;
  background:var(--oro-claro);
  box-shadow:0 0 0 4px #080b11,0 0 0 5px color-mix(in srgb,var(--composer-accent) 70%,#ead6a7),0 0 14px color-mix(in srgb,var(--composer-accent) 55%,transparent);
}
.care-composer h2::after{
  content:'';
  position:absolute;
  left:0;
  bottom:5px;
  width:min(42%,8.5rem);
  height:1px;
  background:linear-gradient(90deg,var(--composer-accent) 0 42%,transparent);
}
.care-composer header>button{position:relative;z-index:1;display:grid;width:44px;height:44px;flex:0 0 auto;place-items:center;margin:-.2rem -.4rem 0 0;border:0;background:transparent;color:#d8d1c6;cursor:pointer}
.care-composer header>button svg{width:1rem;pointer-events:none}
.care-composer :is(button,input,textarea,select,label):focus-visible{outline:2px solid #ead6a7;outline-offset:2px}
.care-composer .care-inscription-editor{gap:.95rem}
.care-composer .care-inscription-editor>label{gap:.18rem;color:var(--texto-suave);font:italic 300 var(--texto-2)/1.35 Spectral,Georgia,serif}
.care-composer .care-inscription-editor>label:not(:has(textarea)){grid-template-columns:minmax(0,1fr);align-items:start}
.care-composer .care-inscription-editor :is(input:not([type=file]),select,textarea){
  width:100%;
  box-sizing:border-box;
  min-height:var(--toque);
  padding:.15rem 0 .4rem;
  border:0;
  border-bottom:1px solid color-mix(in srgb,var(--composer-accent) 34%,transparent);
  border-radius:0;
  outline:0;
  background:transparent;
  color:#f4efe5;
  caret-color:#ead6a7;
  font:300 var(--texto-4)/1.35 Fraunces,'Aureo Serif',Georgia,serif;
}
.care-composer .care-inscription-editor textarea{min-height:4.2rem;resize:vertical}
.care-composer .care-inscription-editor :is(input,select,textarea):focus,
.care-composer .care-inscription-editor :is(input,select,textarea):focus-visible{
  border-bottom-color:var(--oro-claro);
  border-bottom-width:2px;
  padding-bottom:calc(.4rem - 1px);
  background:transparent;
  box-shadow:none;
}
.care-composer .care-inscription-editor select:focus,
.care-composer .care-inscription-editor select:focus-visible{
  background-image:linear-gradient(45deg,transparent 50%,#d8d1c6 50%),linear-gradient(135deg,#d8d1c6 50%,transparent 50%);
  background-position:calc(100% - 10px) 52%,calc(100% - 4px) 52%;
  background-repeat:no-repeat;
  background-size:6px 6px;
}
.care-composer .care-composer-name input,
.care-composer .care-composer-name textarea{
  min-height:3rem;
  padding:.2rem 0 .5rem;
  font:200 var(--texto-6)/1.1 Fraunces,'Aureo Serif',Georgia,serif;
  letter-spacing:-.03em;
}
.care-composer .care-composer-name textarea{
  min-height:4.6rem;
  padding:.2rem 0 .55rem;
  line-height:1.22;
  resize:none;
}
.care-composer .care-composer-name input:focus,
.care-composer .care-composer-name input:focus-visible{padding-bottom:calc(.5rem - 1px)}
.care-composer .care-composer-name textarea:focus,
.care-composer .care-composer-name textarea:focus-visible{padding-bottom:calc(.55rem - 1px)}
.care-composer .care-publish{width:100%;justify-self:stretch;margin-top:.35rem}
.care-composer-preview{position:relative;width:100%;max-height:min(18rem,38svh);margin:0 0 1rem;aspect-ratio:4/5;overflow:hidden;background:#111722}
.care-composer-preview img{width:100%;height:100%;object-fit:cover;filter:saturate(.88) contrast(1.03)}
.care-composer-enter-active,.care-composer-leave-active{transition:opacity var(--dur-2) ease}
.care-composer-enter-active .care-composer,.care-composer-leave-active .care-composer{transition:transform var(--dur-2) cubic-bezier(.16,1,.3,1)}
.care-composer-enter-from,.care-composer-leave-to{opacity:0}
.care-composer-enter-from .care-composer,.care-composer-leave-to .care-composer{transform:translateY(.8rem)}
@media(min-width:1024px){.care-composer-layer{align-items:center;justify-items:center;padding:2rem}.care-composer{margin-inline:0}}
@media(prefers-reduced-motion:reduce){.care-composer-enter-active,.care-composer-leave-active,.care-composer-enter-active .care-composer,.care-composer-leave-active .care-composer{transition-duration:1ms}}
@media(max-width:760px){
  .detail-world-hobbies .hobby-workspace,
  .detail-world-travesias .journey-workspace,
  .detail-world-decretos .decree-workspace{width:100%;gap:var(--espacio-3)}
  .detail-world-hobbies .ritual-form,
  .detail-world-travesias .ritual-form,
  .detail-world-decretos .ritual-form,
  .detail-world-hobbies .hobby-moment-form{width:100%;padding:0}
}
.care-image-pick>p{margin:0;color:#ead6a7;font:300 var(--texto-3)/1.35 Georgia,'Times New Roman',serif}
.care-image-pick.loading{opacity:.68;pointer-events:none}
.care-image-seal input{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  min-height:0;
  padding:0;
  border:0;
  opacity:0;
  cursor:pointer;
}

/* Volver es un pozo, no un botón con trazo. El destello del filete es la luz autora, como Configuración. */
.workspace-header{align-items:flex-start;gap:.85rem}
.workspace-title{position:relative;min-width:0;flex:1;padding-block:.05rem;padding-inline:0}
.workspace-heading{position:relative;min-width:0;padding:.02rem 0 .95rem}
.tw-workspace[class*='detail-world-'] .workspace-header{
  position:relative;
  display:block;
}
.tw-workspace[class*='detail-world-'] .workspace-back{
  position:absolute;
  left:0;
  top:.35rem;
  z-index:1;
  margin:0;
}
.tw-workspace[class*='detail-world-'] .workspace-title{
  display:flex;
  justify-content:center;
  padding-inline:3rem;
}
.tw-workspace[class*='detail-world-'] .workspace-heading{
  width:max-content;
  max-width:100%;
  margin-inline:auto;
  text-align:center;
}
.tw-workspace[class*='detail-world-'] .workspace-title::after{display:none}
.tw-workspace[class*='detail-world-'] .workspace-heading::before{
  content:'';
  position:absolute;
  left:50%;
  bottom:2px;
  z-index:1;
  width:8px;
  height:8px;
  border-radius:50%;
  background:var(--oro-claro);
  box-shadow:0 0 0 4px #080b11,0 0 0 5px color-mix(in srgb,var(--workspace-accent) 70%,#ead6a7),0 0 14px color-mix(in srgb,var(--workspace-accent) 55%,transparent);
  transform:translateX(-50%);
}
.tw-workspace[class*='detail-world-'] .workspace-heading::after{
  content:'';
  position:absolute;
  left:50%;
  bottom:5px;
  width:min(100%,7.5rem);
  height:1px;
  background:linear-gradient(90deg,transparent,var(--workspace-accent) 28% 72%,transparent);
  transform-origin:center;
  animation:heading-thread var(--dur-3) var(--dur-1) cubic-bezier(.16,1,.3,1) both;
}
@keyframes heading-thread{
  from{opacity:0;transform:translateX(-50%) scaleX(.16)}
  to{opacity:1;transform:translateX(-50%) scaleX(1)}
}
.workspace-back{
  flex:0 0 auto;
  display:grid;
  width:44px;
  height:44px;
  margin:.12rem 0 0;
  padding:0;
  place-items:center;
  border:0;
  border-radius:50%;
  background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--workspace-accent) 11%,#080b11),#080b11 72%);
  color:color-mix(in srgb,var(--workspace-accent) 18%,#ead6a7);
  box-shadow:inset 0 0 18px rgba(0,0,0,.55);
  cursor:pointer;
}
.workspace-back svg{width:1.05rem}
.workspace-back:focus-visible{outline:2px solid #ead6a7;outline-offset:3px}
.workspace-back:active{transform:scale(.97)}
.detail-edad-dorada .workspace-back{width:44px;height:44px;min-height:44px;padding:0;margin:0}
.workspace-title-quiet .workspace-heading::before,
.workspace-title-quiet .workspace-heading::after{display:none}
@media(max-width:760px){
  .workspace-header{display:flex;align-items:flex-start;gap:.7rem}
  .workspace-back{margin:.12rem 0 0;padding:0}
  .tw-workspace[class*='detail-world-'] .workspace-header{display:block}
  .tw-workspace[class*='detail-world-'] .workspace-back{margin:0;top:.3rem}
  .tw-workspace[class*='detail-world-'] .workspace-title{padding-inline:2.75rem}
  .detail-world-vinculos .workspace-header h1,
  .detail-world-decretos .workspace-header h1,
  .detail-world-hobbies .workspace-header h1,
  .detail-world-travesias .workspace-header h1,
  .detail-world-cuidado .workspace-header h1{font-size:clamp(1.4rem,6.4vw,1.95rem)}
}
@media(prefers-reduced-motion:reduce){
  .workspace-back:active{transform:none}
  .tw-workspace[class*='detail-world-'] .workspace-heading::after{animation-duration:1ms}
}

.care-mural-grid .care-poster{cursor:pointer}
.care-mural-grid .care-poster:focus-visible{outline:2px solid #ead6a7;outline-offset:3px}
.care-gallery-layer{
  position:fixed;
  z-index:80;
  inset:0;
  width:100vw;
  height:100dvh;
  max-width:100%;
  overflow:hidden;
  display:grid;
  overscroll-behavior:none;
  background:
    radial-gradient(ellipse at 50% 44%,rgba(22,18,28,.18),rgba(4,6,10,.92) 58%),
    rgba(4,6,10,.88);
}
.care-gallery-close,
.care-gallery-step{
  position:absolute;
  z-index:3;
  display:grid;
  width:44px;
  height:44px;
  place-items:center;
  border:1px solid color-mix(in srgb,var(--workspace-accent,#9b7d9b) 58%,transparent);
  border-radius:50%;
  background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--workspace-accent,#9b7d9b) 22%,transparent),#080b11 72%);
  color:color-mix(in srgb,var(--workspace-accent,#9b7d9b) 30%,#ead6a7);
  box-shadow:0 12px 28px rgba(0,0,0,.32);
  cursor:pointer;
}
.care-gallery-close{top:max(.6rem,env(safe-area-inset-top));right:max(.7rem,env(safe-area-inset-right))}
.care-gallery-close svg,.care-gallery-step svg{width:1.05rem}
.care-gallery-step{top:50%;transform:translateY(-50%)}
.care-gallery-step.is-prev{left:max(.45rem,env(safe-area-inset-left))}
.care-gallery-step.is-next{right:max(.45rem,env(safe-area-inset-right))}
.care-gallery-step.is-next svg{transform:rotate(180deg)}
.care-gallery-close:focus-visible,
.care-gallery-step:focus-visible{outline:2px solid #ead6a7;outline-offset:3px}
.care-gallery{
  position:relative;
  width:100%;
  height:100%;
  min-width:0;
  min-height:0;
  max-width:100%;
  overflow:hidden;
  outline:0;
}
.care-gallery-track{
  display:flex;
  width:100%;
  height:100%;
  min-width:0;
  overflow-x:auto;
  overscroll-behavior-x:contain;
  scroll-snap-type:x mandatory;
  scroll-behavior:smooth;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  touch-action:pan-x;
}
.care-gallery-track::-webkit-scrollbar{display:none}
.care-gallery-slide{
  box-sizing:border-box;
  flex:0 0 100%;
  width:100%;
  height:100%;
  min-width:0;
  scroll-snap-align:center;
  scroll-snap-stop:always;
  display:grid;
  place-items:center;
  padding:4.8rem 4.6rem 2rem;
}
.care-gallery-poster.care-poster,
.care-gallery-poster.care-poster:nth-child(n){
  grid-column:auto;
  width:min(92vw,calc(82svh * .8));
  max-width:100%;
  height:auto;
  max-height:min(82svh,52rem);
  margin:0;
  aspect-ratio:4/5;
  animation:none;
  cursor:default;
  box-shadow:0 28px 80px rgba(0,0,0,.58);
}
.care-gallery-poster .care-poster-inscription p{-webkit-line-clamp:5}
.care-gallery-enter-active,.care-gallery-leave-active{transition:opacity var(--dur-3) var(--ease-out)}
.care-gallery-enter-from,.care-gallery-leave-to{opacity:0}
@media(max-width:760px){
  .care-gallery-step{display:none}
  .care-gallery-slide{padding:4.6rem .7rem calc(1.6rem + env(safe-area-inset-bottom))}
  .care-gallery-poster.care-poster,
  .care-gallery-poster.care-poster:nth-child(n){
    width:min(94vw,calc((100svh - 7.2rem) * .8));
    max-height:calc(100svh - 7.2rem);
  }
}
@media(prefers-reduced-motion:reduce){
  .care-gallery-track{scroll-behavior:auto}
  .care-gallery-enter-active,.care-gallery-leave-active{transition-duration:1ms}
}
</style>
