<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { storage } from '@/data/storage'
import { useProfileStore } from '@/stores/profile'
import AppIcon from '@/shared/components/AppIcon.vue'
import { goldenDarumaCrackPatterns } from './goldenDaruma'
import { activeNucleusEmotionClusters, groupNucleusThoughts, normalizeNucleusTone, nucleusEmotions, recognizeNucleusTone } from './nucleusEmotion'
import type {
  BalanceMovement,
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

const props = defineProps<{ detail: string; initialAction?: string }>()
const emit = defineEmits<{ close: []; changed: []; contemplation: [active: boolean] }>()
const JourneyMap = defineAsyncComponent(() => import('./JourneyMap.vue'))
const profile = useProfileStore()

const intentions = useCollection<Intention>('intenciones')
const pulses = useCollection<Pulse>('pulso')
const links = useCollection<LinkRecord>('vinculos')
const decrees = useCollection<Decree>('decretos')
const hobbies = useCollection<Hobby>('hobbies')
const journeys = useCollection<Journey>('travesias')
const companions = useCollection<Companion>('companeros')
const plants = useCollection<Plant>('plantas')
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
const detailIcon = computed(() => ({
  umbral: 'sun', 'world-vinculos': 'constellation', 'world-decretos': 'decree', 'world-hobbies': 'hobbies',
  'world-travesias': 'journeys', 'world-cuidado': 'plants', balance: 'balance', nucleo: 'moon', 'edad-dorada': 'star',
}[props.detail] ?? 'star'))

const worldForm = reactive({ nombre: '', categoria: 'Amistad', signo: '', texto: '', sensacion: '', estado: 'decretado', nota: '', momento: '', lat: 0, lng: 0, tipo: 'compañero', detalle: '', imagen: '' })
const worldSaving = ref(false)
const careImageError = ref('')
const careImageLoading = ref(false)
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
const worldItems = computed<WorldDisplayItem[]>(() => {
  if (props.detail === 'world-vinculos') return links.items.value.map((item) => ({ ...item, kind: 'vinculo' }))
  if (props.detail === 'world-decretos') return decrees.items.value.map((item) => ({ ...item, kind: 'decreto' }))
  if (props.detail === 'world-hobbies') return hobbies.items.value.map((item) => ({ ...item, kind: 'hobby' }))
  if (props.detail === 'world-travesias') return journeys.items.value.map((item) => ({ ...item, kind: 'travesia' }))
  if (props.detail === 'world-cuidado') return careItems.value
  return []
})
function worldPrimary(item: WorldDisplayItem) { return String(item.nombre ?? item.texto ?? '') }
function worldSecondary(item: WorldDisplayItem) {
  if (item.kind === 'vinculo') return String(item.categoria ?? '')
  if (item.kind === 'decreto') return `${item.categoria ?? ''} · ${item.activaciones ?? 0} activaciones`
  if (item.kind === 'hobby') return `${item.sensacion ?? ''}${item.estado === 'pausa' ? ' · en pausa' : ''}`
  if (item.kind === 'travesia') return item.estado === 'visitado' ? 'Lugar vivido' : 'Lugar que llamas'
  return item.kind === 'planta' ? String(item.tipo ?? 'Planta') : String(item.especie ?? 'Compañero')
}
function resetWorldForm() {
  Object.assign(worldForm, { nombre: '', categoria: props.detail === 'world-decretos' ? 'ser' : 'Amistad', signo: '', texto: '', sensacion: '', estado: 'decretado', nota: '', momento: '', lat: 0, lng: 0, tipo: 'compañero', detalle: '', imagen: '' })
  careImageError.value = ''
  journeyLocationSelected.value = false
  journeyLocationMessage.value = ''
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
async function prepareCareImage(file: File) {
  careImageError.value = ''
  if (!file.type.startsWith('image/')) { careImageError.value = 'Elige un archivo de imagen.'; return }
  if (file.size > 12 * 1024 * 1024) { careImageError.value = 'La imagen supera 12 MB. Elige una más liviana.'; return }
  careImageLoading.value = true
  try {
    const image = await loadCareImage(file)
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = Math.min(1, 1400 / longestSide)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la imagen.')
    context.fillStyle = '#080b11'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    worldForm.imagen = canvas.toDataURL('image/jpeg', .84)
  } catch (error) {
    careImageError.value = error instanceof Error ? error.message : 'No se pudo preparar la imagen.'
  } finally { careImageLoading.value = false }
}
async function onCareImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await prepareCareImage(file)
  input.value = ''
}
async function onCareImageDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file) await prepareCareImage(file)
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
    else if (props.detail === 'world-hobbies' && worldForm.nombre.trim() && worldForm.sensacion.trim()) await hobbies.add({ nombre: worldForm.nombre.trim(), sensacion: worldForm.sensacion.trim(), estado: 'activo', sesiones: 0, flow_ultimo: 1, fecha_creacion: created })
    else if (props.detail === 'world-travesias' && worldForm.nombre.trim()) {
      if (!journeyLocationSelected.value) { journeyLocationMessage.value = 'Busca un lugar, toca el mapa o escribe sus coordenadas.'; return }
      await journeys.add({ nombre: worldForm.nombre.trim(), estado: worldForm.estado as Journey['estado'], nota: worldForm.nota.trim(), momento: worldForm.momento.trim(), lat: Math.max(-90, Math.min(90, worldForm.lat)), lng: Math.max(-180, Math.min(180, worldForm.lng)), fecha_creacion: created })
    }
    else if (props.detail === 'world-cuidado' && worldForm.nombre.trim()) {
      if (!worldForm.imagen) { careImageError.value = 'Añade una imagen para formar el afiche.'; return }
      if (worldForm.tipo === 'planta') await plants.add({ nombre: worldForm.nombre.trim(), tipo: worldForm.detalle.trim(), nota: worldForm.nota.trim(), imagen: worldForm.imagen, fecha_creacion: created })
      else await companions.add({ nombre: worldForm.nombre.trim(), especie: worldForm.detalle.trim(), nota: worldForm.nota.trim(), imagen: worldForm.imagen, fecha_creacion: created })
    } else return
    resetWorldForm()
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
  setTimeout(() => { selectedDecree.value = null; decreeTaps.value = 0; decreeDone.value = false }, 900)
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
    return
  }
  if (item.kind === 'hobby') await hobbies.update(String(item.id), { estado: 'activo', sesiones: Number(item.sesiones ?? 0) + 1, ultima_vez: new Date().toISOString() })
  emit('changed')
}
async function toggleHobby(item: WorldDisplayItem) {
  await hobbies.update(String(item.id), { estado: item.estado === 'pausa' ? 'activo' : 'pausa' })
  emit('changed')
}
const dormantHobbies = computed(() => hobbies.items.value.filter((item) => item.estado === 'pausa' || (item.ultima_vez && Date.now() - new Date(item.ultima_vez).getTime() > 30 * 86_400_000)))
const journeyDraft = computed(() => journeyLocationSelected.value ? { lat: worldForm.lat, lng: worldForm.lng } : null)
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
    if ((error as Error).name !== 'AbortError') journeyLocationMessage.value = 'La búsqueda necesita conexión. También puedes tocar el mapa.'
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
async function reverseJourneyCoordinates(lat: number, lng: number, fallbackName?: string) {
  journeySearchController?.abort()
  journeySearchController = new AbortController()
  journeyResults.value = []
  journeyLocationMessage.value = 'Reconociendo el lugar…'
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'jsonv2', zoom: '14', addressdetails: '1', 'accept-language': 'es' })
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { signal: journeySearchController.signal })
    if (!response.ok) throw new Error('No se pudo reconocer el lugar.')
    const result = await response.json() as { display_name: string; name?: string; lat: string; lon: string }
    const name = result.name || result.display_name.split(',')[0]?.trim() || fallbackName || 'Ubicación elegida'
    journeyQuery.value = result.display_name
    selectJourneyLocation({ lat, lng, name, label: result.display_name })
  } catch (error) {
    if ((error as Error).name === 'AbortError') return
    const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    journeyQuery.value = fallbackName || coordinates
    journeyLocationMessage.value = 'Sin conexión para reconocer el nombre. Guardaremos las coordenadas exactas.'
    selectJourneyLocation({ lat, lng, name: fallbackName ?? coordinates, label: fallbackName ?? coordinates })
  }
}
function journeyPick(coords: { lat: number; lng: number }) {
  void reverseJourneyCoordinates(coords.lat, coords.lng)
}

const balanceMode = ref<'overview' | 'movement' | 'goal'>('overview')
const baseIncome = ref(0)
const movement = reactive({ tipo: 'gasto' as 'ingreso' | 'gasto', monto: 0, categoria: 'El nido', nota: '', recurrente: false })
const goal = reactive({ nombre: '', objetivo: 0, color: '#C9A86A' })
const categories = ['El nido', 'El cuerpo', 'El movimiento', 'El cuidado', 'Lo inesperado', 'Lo que construyo']
const goalColors = [{ name: 'Suerte y fuerza', value: '#C0392B' }, { name: 'Dinero y prosperidad', value: '#C9A86A' }, { name: 'Nuevo comienzo', value: '#F5F0E6' }, { name: 'Crecimiento personal', value: '#9B7D9B' }, { name: 'Salud y bienestar', value: '#7D9B8A' }, { name: 'Trabajo y logros', value: '#5B8DB8' }, { name: 'Protección', value: '#2C2C2C' }, { name: 'Amor y cuidado propio', value: '#D4849A' }]
const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
async function saveBaseIncome() { await storage.set('balance_ingreso_base', Math.max(0, baseIncome.value)); emit('changed') }
async function addMovement() {
  if (movement.monto <= 0) return
  const now = new Date().toISOString()
  await movements.add({ ...movement, fecha: now, fecha_creacion: now })
  movement.monto = 0; movement.nota = ''; balanceMode.value = 'overview'; emit('changed')
}
async function addGoal() {
  if (!goal.nombre.trim() || goal.objetivo <= 0) return
  await darumas.add({ nombre: goal.nombre.trim(), objetivo: goal.objetivo, acumulado: 0, color: goal.color, daruma_transferido: false, fecha_creacion: new Date().toISOString() })
  goal.nombre = ''; goal.objetivo = 0; balanceMode.value = 'overview'; emit('changed')
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
const notes = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
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
  if (melody.value.length >= 3) melody.value = []
  melody.value.push(note)
  if (melody.value.length !== 3) return
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(melody.value.join('|')))
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
  if (hash === profile.profile?.clave_app_hash) {
    sessionStorage.setItem(`aureo_nucleo_${timeBand()}`, '1'); nucleusUnlocked.value = true; nucleusError.value = ''
  } else { nucleusError.value = 'No es esa. Respira y vuelve a intentarlo.'; melody.value = [] }
}
async function addThought() {
  const value = thoughtText.value.trim(); if (!value) return
  const now = new Date().toISOString()
  await thoughts.add({ texto: value, tono: recognizeNucleusTone(value), x: 12 + Math.random() * 76, y: 14 + Math.random() * 70, simbolo: ['moon', 'star'][Math.floor(Math.random() * 2)]!, timestamp: now, fecha_creacion: now })
  thoughtText.value = ''; emit('changed')
}
function thoughtDate(value: string) { return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }

const declarationText = ref('')
const selectedDeclaration = ref<string | null>(null)
const contemplative = ref(false)
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
function goldenDeclarationCopy(item: GoldenDeclaration) { return item.texto?.trim() || (item.origen === 'daruma_balance' ? 'Un propósito que elegiste completar.' : item.origen === 'decreto_mundos' ? 'Un decreto que encendiste.' : item.origen === 'hobby_flow_total' ? 'Un momento de plenitud.' : 'Un momento elegido por ti.') }
function goldenDeclarationOrigin(item: GoldenDeclaration) { return item.origen === 'daruma_balance' ? 'Daruma cumplido' : item.origen === 'decreto_mundos' ? 'Decreto encendido' : item.origen === 'hobby_flow_total' ? 'Momento de flow' : 'Declaración presente' }
function goldenDeclarationDate(value: string) { return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }
function updateDarumaState() { darumaActive.value = darumaIntersecting && !document.hidden }
async function addDeclaration() {
  const value = declarationText.value.trim(); if (!value) return
  const now = new Date().toISOString(); await declarations.add({ texto: value, timestamp: now, fecha_creacion: now })
  declarationText.value = ''; selectedDeclaration.value = declarations.items.value.at(-1)?.id ?? null; emit('changed')
}
function enterContemplation() { selectedDeclaration.value = null; contemplative.value = true; emit('contemplation', true) }
function exitContemplation() { contemplative.value = false; emit('contemplation', false) }

const intentionText = ref('')
const pulseText = ref('')
const dateKey = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const dailyPrompts = ['¿Qué necesita hoy mi atención?', '¿Qué emoción está pidiendo espacio?', '¿Qué puedo hacer hoy con más suavidad?', '¿Qué quiero recordar al terminar el día?']
const dailyPrompt = computed(() => dailyPrompts[Number(dateKey().replaceAll('-', '')) % dailyPrompts.length]!)
const todayIntentions = computed(() => intentions.items.value.filter((item) => (!item.fecha || item.fecha === dateKey()) && !(item.completada ?? item.done)))
const todayPulse = computed(() => [...pulses.items.value].reverse().find((item) => item.fecha === dateKey()))
async function addIntention() {
  const value = intentionText.value.trim(); if (!value) return
  await intentions.add({ texto: value, txt: value, completada: false, done: false, fecha: dateKey(), fecha_creacion: new Date().toISOString() })
  intentionText.value = ''; emit('changed')
}
async function completeIntention(item: Intention) { await intentions.remove(item.id); emit('changed') }
async function savePulse() {
  const value = pulseText.value.trim(); if (!value) return
  if (todayPulse.value) await pulses.update(todayPulse.value.id, { pregunta: dailyPrompt.value, respuesta: value })
  else await pulses.add({ pregunta: dailyPrompt.value, respuesta: value, fecha: dateKey(), fecha_creacion: new Date().toISOString() })
  pulseText.value = ''; emit('changed')
}

watch(() => props.detail, () => { resetWorldForm(); contemplative.value = false; emit('contemplation', false); selectedThought.value = null; selectedDeclaration.value = null; selectedConstellationLink.value = null })
watch(() => props.initialAction, (action) => { balanceMode.value = action === 'movimiento' ? 'movement' : action === 'meta' ? 'goal' : 'overview' }, { immediate: true })
watch(thoughtCloth, (node, previous) => { if (previous) plasmaObserver?.unobserve(previous); if (node) plasmaObserver?.observe(node) })
watch(constellationMap, (node, previous) => { if (previous) constellationObserver?.unobserve(previous); if (node) constellationObserver?.observe(node) })
watch(darumaStage, (node, previous) => { if (previous) darumaObserver?.unobserve(previous); if (node) darumaObserver?.observe(node) })
watch(selectedThought, async (value) => { if (value) { await nextTick(); thoughtDialog.value?.focus() } })
onMounted(async () => {
  baseIncome.value = (await storage.get<number>('balance_ingreso_base')) ?? 0
  plasmaObserver = new IntersectionObserver(([entry]) => { clothIntersecting = entry?.isIntersecting ?? false; updatePlasmaState() }, { threshold: .05 })
  constellationObserver = new IntersectionObserver(([entry]) => { constellationIntersecting = entry?.isIntersecting ?? false; updateConstellationState() }, { threshold: .05 })
  darumaObserver = new IntersectionObserver(([entry]) => { darumaIntersecting = entry?.isIntersecting ?? false; updateDarumaState() }, { threshold: .05 })
  if (thoughtCloth.value) plasmaObserver.observe(thoughtCloth.value)
  if (constellationMap.value) constellationObserver.observe(constellationMap.value)
  if (darumaStage.value) darumaObserver.observe(darumaStage.value)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})
onBeforeUnmount(() => { clearTimeout(decreeHoldTimer); plasmaObserver?.disconnect(); constellationObserver?.disconnect(); darumaObserver?.disconnect(); document.removeEventListener('visibilitychange', handleVisibilityChange) })
</script>

<template>
  <section class="tw-workspace" :class="[`detail-${detail}`, { 'is-contemplative': contemplative }]" :aria-label="title">
    <span class="workspace-aura" aria-hidden="true" />
    <header v-if="!contemplative" class="workspace-header">
      <button type="button" class="workspace-back" :aria-label="`Volver a ${isWorld ? 'Mundos' : title}`" @click="emit('close')"><AppIcon name="back" /><span>Volver</span></button>
      <div class="workspace-title"><div><h1>{{ title }}</h1><p v-if="detail === 'nucleo'">Este espacio permanece únicamente en este dispositivo.</p><p v-else-if="detail === 'world-cuidado'">Un mural vivo de aquello a lo que eliges dar tiempo, presencia y amor.</p><p v-else-if="isWorld">Todo lo que ya es tuyo puede seguir creciendo aquí.</p></div><span class="workspace-sigil" aria-hidden="true"><AppIcon :name="detailIcon" /></span></div>
    </header>

    <div v-if="isWorld && detail === 'world-cuidado'" class="care-mural-space">
      <section class="care-mural" aria-label="Mural de lo que cuido">
        <div v-if="careDisplayItems.length" class="care-mural-grid">
          <article v-for="(item, index) in [...careDisplayItems].reverse()" :key="String(item.id)" class="care-poster" :style="{ '--poster-index': index }">
            <img v-if="item.imagen" :src="String(item.imagen)" :alt="worldPrimary(item)" />
            <span v-else class="care-poster-memory" aria-hidden="true"><AppIcon :name="item.kind === 'planta' ? 'plants' : 'companions'" /><b>{{ worldPrimary(item).slice(0, 1) }}</b></span>
            <span class="care-poster-shade" aria-hidden="true" />
            <div class="care-poster-inscription"><small>{{ item.demoLabel ?? (item.kind === 'planta' ? 'Planta' : 'Compañero') }}</small><h2>{{ worldPrimary(item) }}</h2><p v-if="item.nota">{{ item.nota }}</p></div>
          </article>
        </div>
        <div v-else class="care-mural-empty"><AppIcon name="plants" /><p>Tu mural comienza con una imagen de aquello que eliges cuidar.</p></div>
      </section>

      <form class="care-poster-maker" @submit.prevent="addWorldItem">
        <label class="care-image-stage" :class="{ ready: worldForm.imagen, loading: careImageLoading }" @dragover.prevent @drop.prevent="onCareImageDrop">
          <input type="file" accept="image/*" aria-label="Elegir imagen para el mural" @change="onCareImageChange" />
          <img v-if="worldForm.imagen" :src="worldForm.imagen" alt="Vista previa del afiche" />
          <span v-else><AppIcon name="plus" /><strong>{{ careImageLoading ? 'Preparando imagen…' : 'Elegir una imagen' }}</strong><small>También puedes soltarla aquí · máximo 12 MB</small></span>
          <em v-if="worldForm.imagen">Cambiar imagen</em>
        </label>
        <div class="care-inscription-editor">
          <fieldset class="care-kind-choice"><legend>¿Qué cuidas?</legend><button type="button" :class="{ active: worldForm.tipo === 'compañero' }" @click="worldForm.tipo = 'compañero'">Un compañero</button><button type="button" :class="{ active: worldForm.tipo === 'planta' }" @click="worldForm.tipo = 'planta'">Una planta</button></fieldset>
          <label>Su nombre<input v-model="worldForm.nombre" required maxlength="120" placeholder="¿Cómo lo llamas?" /></label>
          <label>Una frase para el afiche<textarea v-model="worldForm.nota" maxlength="240" rows="3" placeholder="Lo que significa para ti…" /></label>
          <p v-if="careImageError" class="care-image-error" role="alert">{{ careImageError }}</p>
          <button class="care-publish" type="submit" :disabled="worldSaving || careImageLoading">{{ worldSaving ? 'Guardando…' : 'Sumar al mural' }}</button>
        </div>
      </form>
    </div>

    <div v-else-if="isWorld" class="workspace-grid" :class="{ 'constellation-workspace': detail === 'world-vinculos' }">
      <section v-if="detail === 'world-vinculos'" class="constellation-space" aria-label="Mapa de Mi Constelación">
        <div ref="constellationMap" class="constellation-map" :class="{ 'constellation-paused': !constellationActive }" @click="selectedConstellationLink = null">
          <svg viewBox="0 0 100 100" aria-hidden="true">
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
            @click.stop="selectedConstellationLink = selectedConstellationLink === star.link.id ? null : star.link.id"
          ><span /></button>
          <Transition name="constellation-reading">
            <article v-if="currentConstellationLink" class="constellation-reading" role="status" @click.stop>
              <div><span :style="{ '--star-color': currentConstellationLink.color }" aria-hidden="true" /><strong>{{ currentConstellationLink.link.nombre }}</strong><small>{{ currentConstellationLink.category }}<template v-if="currentConstellationLink.link.signo"><br />{{ currentConstellationLink.orbitLabel }} · {{ currentConstellationLink.link.signo }}</template><template v-else><br />{{ currentConstellationLink.orbitLabel }}</template></small></div>
              <button type="button" aria-label="Cerrar vínculo" @click="selectedConstellationLink = null"><AppIcon name="close" /></button>
              <p v-if="currentConstellationLink.link.nota">{{ currentConstellationLink.link.nota }}</p>
            </article>
          </Transition>
          <p v-if="!constellationStars.length" class="constellation-empty">Tu constelación te espera.<br />Cada persona que agregas enciende un punto.</p>
        </div>
        <ul class="constellation-legend" aria-label="Órbitas de vínculos">
          <li><span class="legend-ocaso" aria-hidden="true" /><strong>Amor</strong><small>Centro · {{ constellationOrbitCounts[0] }}</small></li>
          <li><span class="legend-cosmos" aria-hidden="true" /><strong>Familia</strong><small>Órbita media · {{ constellationOrbitCounts[1] }}</small></li>
          <li><span class="legend-oro" aria-hidden="true" /><strong>Amistad, Raíz y Guía</strong><small>Exterior · {{ constellationOrbitCounts[2] }}</small></li>
        </ul>
      </section>
      <JourneyMap v-if="detail === 'world-travesias'" :journeys="journeys.items.value" :draft="journeyDraft" @pick="journeyPick" />
      <form class="ritual-form" @submit.prevent="addWorldItem">
        <template v-if="detail === 'world-decretos'">
          <label>Dimensión<select v-model="worldForm.categoria"><option value="ser">Ser</option><option value="vivir">Vivir</option><option value="tener">Tener</option></select></label>
          <label>Tu decreto<textarea v-model="worldForm.texto" required maxlength="500" placeholder="Soy…" /></label>
        </template>
        <template v-else>
          <label v-if="detail !== 'world-travesias'">{{ detail === 'world-vinculos' ? '¿Cómo se llama?' : detail === 'world-hobbies' ? '¿Qué es?' : 'Nombre' }}<input v-model="worldForm.nombre" required maxlength="120" /></label>
          <label v-if="detail === 'world-vinculos'">Vínculo<select v-model="worldForm.categoria"><option v-for="value in ['Amor','Familia','Amistad','Raíz','Guía']" :key="value">{{ value }}</option></select></label>
          <label v-if="detail === 'world-vinculos'">¿Cuál es su signo?<select v-model="worldForm.signo"><option value="">Prefiero no indicarlo</option><option v-for="sign in zodiacSigns" :key="sign">{{ sign }}</option></select></label>
          <label v-if="detail === 'world-hobbies'">¿Cómo te hace sentir?<textarea v-model="worldForm.sensacion" required maxlength="400" /></label>
          <label v-if="detail === 'world-travesias'">Estado<select v-model="worldForm.estado"><option value="decretado">Quiero ir</option><option value="visitado">Ya estuve</option></select></label>
          <template v-if="detail === 'world-travesias'"><div class="journey-picker"><label for="journey-place-search">Buscar cualquier lugar</label><div><input id="journey-place-search" v-model="journeyQuery" type="search" autocomplete="off" placeholder="Ciudad, país o lugar" /><button type="button" :disabled="journeySearching" @click="journeySearch">{{ journeySearching ? 'Buscando…' : 'Buscar' }}</button></div><ul v-if="journeyResults.length" class="journey-results" aria-label="Lugares encontrados"><li v-for="result in journeyResults" :key="`${result.lat}-${result.lon}`"><button type="button" @click="chooseJourneyResult(result)">{{ result.display_name }}</button></li></ul><div class="journey-selected-place" :class="{ empty: !journeyLocationSelected }"><small>Lugar elegido</small><strong>{{ journeyLocationSelected ? worldForm.nombre : 'Busca un lugar o selecciónalo en el mapa.' }}</strong></div><p v-if="journeyLocationMessage" class="journey-location-message" role="status">{{ journeyLocationMessage }}</p><label>¿Qué viviste ahí?<textarea v-model="worldForm.momento" maxlength="500" placeholder="Una línea. Lo primero que recuerdes." /></label></div></template>
          <label v-if="detail !== 'world-hobbies'">Una nota, si la necesitas<textarea v-model="worldForm.nota" maxlength="500" /></label>
        </template>
        <button class="workspace-primary" type="submit" :disabled="worldSaving || (detail === 'world-travesias' && !journeyLocationSelected)">{{ worldSaving ? 'Guardando…' : detail === 'world-vinculos' ? 'Encender en mi constelación' : detail === 'world-decretos' ? 'Lo decreto' : 'Agregar' }}</button>
      </form>
      <section v-if="detail !== 'world-vinculos'" class="workspace-records" :aria-label="`Registros de ${title}`">
        <article v-for="item in [...worldItems].reverse()" :key="String(item.id)" class="workspace-record">
          <div><h2>{{ worldPrimary(item) }}</h2><p>{{ worldSecondary(item) }}</p></div>
          <button v-if="item.kind === 'decreto'" type="button" @click="activateWorldItem(item)" @pointerdown="startDecreeHold(item as Decree)" @pointerup="cancelDecreeHold" @pointerleave="cancelDecreeHold">{{ item.cumplido ? 'Ya es mío' : 'Activar' }}</button>
          <template v-else-if="item.kind === 'hobby'"><button type="button" @click="activateWorldItem(item)">{{ item.estado === 'pausa' ? 'Quiero retomarlo' : 'Lo viví hoy' }}</button><button type="button" @click="toggleHobby(item)">{{ item.estado === 'pausa' ? 'Reactivar' : 'Poner en pausa' }}</button></template>
        </article>
        <p v-if="detail === 'world-hobbies' && dormantHobbies.length" class="workspace-empty">El jardín recuerda todo lo que sembraste. {{ dormantHobbies[0]?.nombre }} sigue aquí.</p>
        <p v-if="!worldItems.length" class="workspace-empty">{{ detail === 'world-vinculos' ? 'Cada persona que agregas enciende un punto.' : detail === 'world-hobbies' ? 'Tu jardín espera algo que disfrutes por el simple gusto de hacerlo.' : 'Este espacio está listo para recibir su primer registro.' }}</p>
      </section>
      <Teleport to="body"><div v-if="selectedDecree" class="decree-ritual" role="dialog" aria-modal="true" aria-label="Ritual de decreto" @click="tapDecree"><button type="button" aria-label="Cerrar ritual" @click.stop="selectedDecree = null"><AppIcon name="close" /></button><blockquote>{{ selectedDecree.texto }}</blockquote><div aria-label="Pulsaciones del ritual"><span v-for="index in 3" :key="index" :class="{ filled: decreeTaps >= index }" /></div><p>{{ decreeDone ? 'Decretado.' : 'Toca para encenderlo.' }}</p></div><div v-if="decreeClaim" class="decree-claim" role="dialog" aria-modal="true" aria-label="Esto ya es mío"><p>¿Este decreto ya forma parte de ti?</p><strong>{{ decreeClaim.texto }}</strong><div><button type="button" @click="decreeClaim = null">Todavía no</button><button type="button" @click="claimDecree">Esto ya es mío</button></div></div></Teleport>
    </div>

    <div v-else-if="detail === 'balance'" class="balance-workspace">
      <form class="balance-base-income" @submit.prevent="saveBaseIncome"><label>Mi ingreso base<input v-model.number="baseIncome" type="number" min="0" inputmode="decimal" /></label><button class="workspace-primary" type="submit">Guardar ingreso base</button></form>
      <form v-if="balanceMode === 'movement'" class="ritual-form compact" @submit.prevent="addMovement">
        <div class="segmented-choice"><button type="button" :class="{ active: movement.tipo === 'ingreso' }" @click="movement.tipo = 'ingreso'">Entra</button><button type="button" :class="{ active: movement.tipo === 'gasto' }" @click="movement.tipo = 'gasto'">Sale</button></div>
        <label>Monto<input v-model.number="movement.monto" type="number" min="1" inputmode="decimal" required /></label>
        <label>Categoría<select v-model="movement.categoria"><option v-for="category in categories" :key="category">{{ category }}</option></select></label>
        <label>Una nota, si la necesitas<input v-model="movement.nota" maxlength="160" /></label>
        <label class="balance-recurring"><input v-model="movement.recurrente" type="checkbox" /> Es un movimiento fijo mensual</label>
        <button class="workspace-primary" type="submit" :disabled="movement.monto <= 0">Guardar</button>
      </form>
      <form v-else-if="balanceMode === 'goal'" class="ritual-form compact" @submit.prevent="addGoal">
        <label>¿Qué estás construyendo?<input v-model="goal.nombre" required maxlength="120" /></label><label>Meta<input v-model.number="goal.objetivo" type="number" min="1" required /></label>
        <fieldset class="goal-colors"><legend>Color de tu Daruma</legend><button v-for="color in goalColors" :key="color.value" type="button" :style="{ background: color.value }" :class="{ selected: goal.color === color.value }" :aria-label="color.name" :title="color.name" @click="goal.color = color.value" /></fieldset>
        <button class="workspace-primary" type="submit" :disabled="!goal.nombre.trim() || goal.objetivo <= 0">Crear Daruma</button>
      </form>
      <div class="balance-lists"><section><h2>Últimos movimientos</h2><article v-for="item in [...movements.items.value].reverse().slice(0,8)" :key="item.id" class="workspace-record"><div><h3>{{ item.nota || item.categoria }}</h3><p>{{ item.categoria }}<template v-if="item.recurrente"> · fijo mensual</template></p></div><strong>{{ item.tipo === 'ingreso' ? '+' : '−' }} {{ currency.format(item.monto) }}</strong></article><p v-if="!movements.items.value.length" class="workspace-empty">Sin registros aún. Ver es la primera forma de cuidarte.</p></section><section><h2>Lo que construyo</h2><article v-for="item in darumas.items.value" :key="item.id" class="workspace-record daruma"><span :style="{ background: item.color }" /><div><h3>{{ item.nombre }}</h3><p>{{ currency.format(item.acumulado) }} de {{ currency.format(item.objetivo) }}</p><form v-if="item.acumulado < item.objetivo" class="daruma-progress" @submit.prevent="addDarumaProgress(item)"><input v-model.number="darumaContribution[item.id]" type="number" min="1" :max="item.objetivo - item.acumulado" aria-label="Aportar a la meta" /><button type="submit">Aportar</button></form><button v-else-if="!item.daruma_transferido" type="button" class="daruma-transfer" @click="transferDaruma(item)"><AppIcon name="star" /> Llevar a Edad Dorada</button><small v-else>Ya forma parte de tu Edad Dorada.</small></div></article><p v-if="!darumas.items.value.length" class="workspace-empty">Lo que todavía no nombraste, aquí puede tomar forma.</p></section></div>
    </div>

    <div v-else-if="detail === 'nucleo'" class="nucleus-workspace">
      <section v-if="!nucleusUnlocked" class="nucleus-gate"><AppIcon name="moon" /><h2>Tu sanctum</h2><p>Toca tu melodía para entrar.</p><div class="melody-progress"><span v-for="index in 3" :key="index" :class="{ filled: melody[index - 1] }" /></div><div class="note-grid"><button v-for="note in notes" :key="note" type="button" @click="pressNote(note)">{{ note }}</button></div><p v-if="nucleusError" role="alert">{{ nucleusError }}</p></section>
      <template v-else>
        <p class="nucleus-map-copy">Las emociones afines respiran cerca unas de otras.</p>
        <section ref="thoughtCloth" class="thought-cloth nucleus-emotion-field" :class="{ 'plasma-paused': !plasmaActive }" aria-label="Mapa de pensamientos agrupados por emoción">
          <span class="nucleus-plasma" aria-hidden="true"><span v-for="emotion in activeEmotionClusters" :key="emotion.tone" class="plasma-pool" :style="{ left: `${emotion.x}%`, top: `${emotion.y}%`, '--emotion-color': emotion.color, '--plasma-index': emotion.index }" /></span>
          <button v-for="entry in groupedThoughts" :key="entry.thought.id" type="button" class="thought-point" :style="{ left: `${entry.x}%`, top: `${entry.y}%`, '--thought-color': entry.emotion.color, '--thought-index': entry.index }" :aria-label="`Leer ${entry.emotion.label.toLowerCase()}: ${entry.thought.texto}`" @click="selectedThought = entry.thought.id"><span /></button>
          <p v-if="!groupedThoughts.length"><em>Aponia.</em> El silencio también es válido.</p>
        </section>
        <ul v-if="activeEmotionClusters.length" class="nucleus-emotion-key" aria-label="Emociones presentes"><li v-for="emotion in activeEmotionClusters" :key="emotion.tone"><span :style="{ '--emotion-color': emotion.color }" aria-hidden="true" /><strong>{{ emotion.label }}</strong><small>{{ emotion.count }}</small></li></ul>
        <form class="nucleus-entry" @submit.prevent="addThought"><label for="tailwind-thought">Escríbelo. Nadie más lo verá.</label><textarea id="tailwind-thought" v-model="thoughtText" rows="3" maxlength="1200" placeholder="Escríbelo. Nadie más lo verá." /><button v-if="thoughtText.trim()" class="workspace-primary" type="submit">Dejarlo aquí</button></form>
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
        <div v-if="!contemplative" class="golden-practice">
          <p class="golden-copy"><strong>Tu Edad Dorada ya está ocurriendo.</strong><span>No es después. Es este momento, revelado bajo la luz del oro.</span></p>
          <form class="golden-entry" @submit.prevent="addDeclaration"><label for="tailwind-declaration">¿Qué reconoces hoy?</label><textarea id="tailwind-declaration" v-model="declarationText" rows="4" maxlength="1200" placeholder="Declara este momento…" /><button v-if="declarationText.trim()" class="workspace-primary" type="submit">Formar una grieta</button></form>
          <button class="workspace-text" type="button" @click="enterContemplation">Contemplar mi Daruma</button>
        </div>
      </div>
      <button v-if="contemplative" class="contemplation-exit" type="button" @click="exitContemplation">Volver</button>
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
        <form class="ritual-form compact umbral-capture" @submit.prevent="savePulse"><label>Respuesta a mi pulso de hoy<textarea v-model="pulseText" rows="4" maxlength="1200" placeholder="Escribe lo que aparece…" /></label><button v-if="pulseText.trim()" class="workspace-primary" type="submit">{{ todayPulse ? 'Actualizar pulso' : 'Guardar pulso' }}</button></form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.tw-workspace{min-height:36rem;color:#f4efe5}.workspace-header{display:flex;align-items:flex-start;gap:1.25rem;margin-bottom:2.25rem}.workspace-header h1{margin:0;font-size:clamp(2.5rem,6vw,4.8rem);font-weight:200;line-height:.98;letter-spacing:-.03em}.workspace-header p{max-width:46rem;margin:.75rem 0 0;color:#b9b3aa;line-height:1.65}.workspace-back,.workspace-text{display:inline-flex;min-height:44px;align-items:center;gap:.45rem;border:0;background:transparent;color:#ead6a7;font:600 .78rem/1 system-ui,sans-serif;cursor:pointer}.workspace-back svg{width:1rem}.workspace-grid,.balance-lists,.umbral-workspace{display:grid;gap:2rem;grid-template-columns:minmax(17rem,.78fr) minmax(0,1.22fr)}.ritual-form{display:grid;align-content:start;gap:1rem;padding:1.25rem;border:1px solid rgba(201,168,106,.22);border-radius:16px;background:rgba(16,21,31,.78);box-shadow:0 18px 50px rgba(0,0,0,.2)}.ritual-form.compact{max-width:40rem;margin:1.5rem auto}.ritual-form label,.nucleus-entry label,.golden-entry label{display:grid;gap:.5rem;color:#d8d1c6;font:600 .75rem/1.35 system-ui,sans-serif}.ritual-form input,.ritual-form select,.ritual-form textarea,.nucleus-entry textarea,.golden-entry textarea{width:100%;box-sizing:border-box;min-height:48px;border:1px solid rgba(201,168,106,.25);border-radius:12px;background:#0d121b;color:#f4efe5;padding:.8rem .9rem;font:400 1rem/1.5 system-ui,sans-serif;caret-color:#ead6a7}.ritual-form textarea,.nucleus-entry textarea,.golden-entry textarea{min-height:6.5rem;resize:vertical}.ritual-form input:focus-visible,.ritual-form select:focus-visible,.ritual-form textarea:focus-visible,.nucleus-entry textarea:focus-visible,.golden-entry textarea:focus-visible{outline:2px solid #ead6a7;outline-offset:2px}.workspace-primary{min-height:48px;border:1px solid #c9a86a;border-radius:12px;background:rgba(201,168,106,.14);color:#ead6a7;padding:.75rem 1rem;font:600 .85rem/1 system-ui,sans-serif;cursor:pointer}.workspace-primary:disabled{cursor:not-allowed;opacity:.45}.workspace-records{display:grid;align-content:start;gap:.7rem}.workspace-record{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px solid rgba(201,168,106,.15)}.workspace-record h2,.workspace-record h3{overflow-wrap:anywhere;margin:0 0 .25rem;font-size:1.15rem;font-weight:400}.workspace-record p{margin:0;color:#b9b3aa;font:400 .78rem/1.5 system-ui,sans-serif}.workspace-record>button{min-height:42px;flex:0 0 auto;border:1px solid rgba(201,168,106,.3);border-radius:12px;background:transparent;color:#ead6a7;padding:.65rem .85rem;font:600 .75rem/1 system-ui,sans-serif;cursor:pointer}.workspace-empty{max-width:38rem;color:#b9b3aa;font-style:italic;line-height:1.6}.segmented-choice{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.goal-colors{border:0;padding:0}.goal-colors legend{margin-bottom:.75rem;color:#d8d1c6;font:600 .75rem/1 system-ui,sans-serif}.goal-colors button{width:44px;height:44px;margin-right:.7rem;border:2px solid transparent;border-radius:50%;cursor:pointer}.goal-colors button.selected{border-color:#f4efe5;outline:2px solid #c9a86a;outline-offset:2px}.balance-lists{margin-top:2.5rem}.balance-lists h2{font-size:1.5rem;font-weight:300}.workspace-record.daruma{justify-content:flex-start}.workspace-record.daruma>span{width:2rem;height:2rem;flex:0 0 auto;border-radius:42% 42% 48% 48%}.nucleus-workspace{position:relative}.nucleus-gate{max-width:34rem;margin:3rem auto;text-align:center}.nucleus-gate>svg{width:3rem;color:#8173b7}.nucleus-gate h2{font-size:2.5rem;font-weight:200}.melody-progress{display:flex;justify-content:center;gap:.6rem;margin:1.25rem}.melody-progress span{width:.55rem;height:.55rem;border:1px solid #8173b7;border-radius:50%}.melody-progress span.filled{background:#8173b7}.note-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.45rem}.note-grid button{min-height:48px;border:1px solid rgba(129,115,183,.4);border-radius:12px;background:rgba(129,115,183,.08);color:#f4efe5;cursor:pointer}.thought-cloth{position:relative;min-height:24rem;overflow:hidden;border-radius:44% 56% 48% 52%/51% 42% 58% 49%;background:radial-gradient(circle at 50% 46%,rgba(129,115,183,.13),transparent 55%),#0e121b;box-shadow:0 24px 70px rgba(0,0,0,.32)}.thought-cloth>button{position:absolute;width:42px;height:42px;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer}.thought-cloth>button span{display:block;width:9px;height:9px;margin:auto;border-radius:50%;background:var(--thought-color);box-shadow:0 4px 18px var(--thought-color)}.thought-cloth>p{position:absolute;inset:50% auto auto 50%;width:80%;transform:translate(-50%,-50%);margin:0;text-align:center;color:#b9b3aa}.thought-cloth em{display:block;margin-bottom:.4rem;color:#8173b7;font-size:1.4rem}.nucleus-entry,.golden-entry{display:grid;gap:.8rem;max-width:40rem;margin:1.5rem auto}.thought-reading{position:relative;max-width:34rem;margin:1.5rem auto;padding:1.4rem;border-radius:16px;background:#111722;box-shadow:0 20px 60px rgba(0,0,0,.3)}.thought-reading::before{content:'';position:absolute;inset:0 auto 0 0;width:1px;background:var(--thought-color)}.thought-reading header{display:flex;justify-content:space-between;color:#b9b3aa;font:500 .72rem/1 system-ui,sans-serif}.thought-reading header button{border:0;background:transparent;color:#ead6a7;cursor:pointer}.thought-reading>svg{width:1.5rem;margin-top:1rem;color:var(--thought-color)}.thought-reading p{overflow-wrap:anywhere;line-height:1.7}.golden-workspace{text-align:center}.golden-sculpture{position:relative;width:min(32rem,80vw);aspect-ratio:1;margin:0 auto;border-radius:43% 57% 51% 49%/47% 42% 58% 53%;overflow:hidden;background:radial-gradient(circle at 35% 28%,color-mix(in srgb,var(--sign-color) 65%,#f4efe5),transparent 24%),radial-gradient(circle at 62% 67%,#c9a86a,transparent 8%),color-mix(in srgb,var(--sign-color) 55%,#080b11);box-shadow:0 28px 80px rgba(0,0,0,.38)}.golden-sculpture>.resin-rift{position:absolute;left:calc(18% + (var(--rift-index) * 9%));top:12%;width:1px;height:76%;background:linear-gradient(transparent,#ead6a7,transparent);transform:rotate(calc(-28deg + (var(--rift-index) * 9deg)));opacity:.55}.golden-sculpture>button{position:absolute;left:calc(50% + (var(--node-index) % 3 - 1) * 22%);top:calc(50% + (var(--node-index) % 4 - 1.5) * 16%);width:44px;height:44px;border:0;background:transparent;cursor:pointer}.golden-sculpture>button span{display:block;width:10px;height:10px;margin:auto;border-radius:50%;background:#fff4c9;box-shadow:0 4px 20px #ead6a7}.golden-sculpture>button em{position:absolute;z-index:2;width:11rem;left:50%;bottom:100%;transform:translateX(-50%);padding:.65rem;border-radius:12px;background:#0d121b;color:#f4efe5;font-size:.8rem;line-height:1.4}.golden-sculpture>svg{position:absolute;inset:50% auto auto 50%;width:2.5rem;transform:translate(-50%,-50%);color:#ead6a7}.golden-copy{font-size:1.25rem;font-style:italic}.workspace-text{justify-content:center}.contemplation-exit{position:fixed;right:2rem;top:2rem;z-index:4;min-height:44px;border:1px solid rgba(201,168,106,.35);border-radius:12px;background:#080b11;color:#ead6a7;padding:.7rem 1rem;cursor:pointer}.umbral-workspace>section{min-width:0}.umbral-workspace h2{font-size:1.7rem;font-weight:300}.umbral-workspace blockquote{margin:1rem 0;padding:1rem;border-inline-start:1px solid #c9a86a;color:#ead6a7}.intention-row{display:flex;align-items:flex-start;gap:.8rem;padding:.8rem 0;border-bottom:1px solid rgba(201,168,106,.14);font:400 1rem/1.5 system-ui,sans-serif}.intention-row input{margin-top:.25rem;accent-color:#c9a86a}
/* Lo que cuido se compone como un mural de afiches, no como un registro administrativo. */
.care-mural-space{display:grid;gap:clamp(2.5rem,6vw,5rem)}
.care-mural{position:relative;min-height:17rem}
.care-mural-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;align-items:start;gap:clamp(.75rem,2vw,1.35rem)}
.care-poster{position:relative;isolation:isolate;grid-column:span 4;aspect-ratio:4/5;min-width:0;overflow:hidden;background:#111722;box-shadow:0 20px 48px rgba(0,0,0,.32);animation:care-poster-arrive 520ms cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--poster-index) * 55ms)}
.care-poster:nth-child(6n+1){grid-column:span 5;aspect-ratio:4/5}.care-poster:nth-child(6n+2){grid-column:span 7;aspect-ratio:7/5}.care-poster:nth-child(6n+5){grid-column:span 8;aspect-ratio:8/5}.care-poster:nth-child(6n+6){grid-column:span 4;aspect-ratio:4/5}.care-poster:only-child{grid-column:3/span 8;aspect-ratio:8/5}
.care-poster>img{width:100%;height:100%;object-fit:cover;filter:saturate(.88) contrast(1.03)}
.care-poster-memory{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 28% 18%,color-mix(in srgb,var(--workspace-accent) 42%,#f4efe5),transparent 36%),linear-gradient(145deg,color-mix(in srgb,var(--workspace-accent) 30%,#151b25),#080b11 72%);color:#ead6a7}
.care-poster-memory svg{position:absolute;right:12%;top:12%;width:2.25rem;opacity:.54}.care-poster-memory b{font-size:clamp(5rem,14vw,10rem);font-weight:200;line-height:1;opacity:.38}
.care-poster-shade{position:absolute;z-index:1;inset:0;background:linear-gradient(180deg,transparent 34%,rgba(5,7,11,.2) 55%,rgba(5,7,11,.94) 100%)}
.care-poster-inscription{position:absolute;z-index:2;inset:auto clamp(1rem,3vw,1.55rem) clamp(1rem,3vw,1.5rem);text-shadow:0 3px 16px rgba(0,0,0,.7)}
.care-poster-inscription small{color:#d9cba9;font:650 .62rem/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}.care-poster-inscription h2{margin:.35rem 0 0;color:#fffaf0;font-size:clamp(1.45rem,3.2vw,2.55rem);font-weight:300;line-height:1.02;letter-spacing:-.02em;text-wrap:balance}.care-poster-inscription p{display:-webkit-box;margin:.6rem 0 0;overflow:hidden;color:#e3ddd2;font:.84rem/1.5 system-ui,sans-serif;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.care-mural-empty{display:grid;min-height:17rem;place-items:center;align-content:center;gap:1rem;border-block:1px solid color-mix(in srgb,var(--workspace-accent) 26%,transparent);background:radial-gradient(circle at 50% 52%,color-mix(in srgb,var(--workspace-accent) 10%,transparent),transparent 48%);text-align:center}.care-mural-empty svg{width:2.4rem;color:var(--workspace-accent)}.care-mural-empty p{max-width:30rem;margin:0;color:#c7c0b5;font-style:italic;line-height:1.65}
.care-poster-maker{display:grid;grid-template-columns:minmax(15rem,.85fr) minmax(17rem,1.15fr);align-items:stretch;gap:clamp(1.5rem,5vw,4rem);padding-block:clamp(1.25rem,3vw,2rem);border-block:1px solid color-mix(in srgb,var(--workspace-accent) 30%,transparent)}
.care-image-stage{position:relative;isolation:isolate;display:grid;min-height:20rem;place-items:center;overflow:hidden;background:radial-gradient(circle at 45% 35%,color-mix(in srgb,var(--workspace-accent) 16%,transparent),transparent 48%),#0b1018;color:#d8d1c6;cursor:pointer;box-shadow:0 18px 46px rgba(0,0,0,.28)}
.care-image-stage::before,.care-image-stage::after{content:'';position:absolute;z-index:2;inset:12px;pointer-events:none}.care-image-stage::before{border-block:1px solid color-mix(in srgb,var(--workspace-accent) 52%,transparent)}.care-image-stage::after{border-inline:1px solid color-mix(in srgb,var(--workspace-accent) 52%,transparent)}
.care-image-stage input{position:absolute;z-index:4;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.care-image-stage>span{display:grid;justify-items:center;gap:.75rem;padding:2rem;text-align:center}.care-image-stage>span svg{width:2rem;color:var(--workspace-accent)}.care-image-stage>span strong{font-size:1.25rem;font-weight:300}.care-image-stage>span small{color:#aaa398;font:500 .72rem/1.5 system-ui,sans-serif}.care-image-stage>img{width:100%;height:100%;object-fit:cover}.care-image-stage>em{position:absolute;z-index:3;right:1.2rem;bottom:1.2rem;padding:.55rem .7rem;background:rgba(8,11,17,.84);color:#ead6a7;font:600 .7rem/1 system-ui,sans-serif;font-style:normal}.care-image-stage.loading{cursor:wait;opacity:.68}
.care-inscription-editor{display:grid;align-content:center;gap:1rem}.care-kind-choice{display:flex;flex-wrap:wrap;gap:.5rem;margin:0;padding:0;border:0}.care-kind-choice legend{width:100%;margin-bottom:.2rem;color:#c8c1b6;font:600 .72rem/1.3 system-ui,sans-serif}.care-kind-choice button{min-height:44px;padding:.65rem .85rem;border:1px solid color-mix(in srgb,var(--workspace-accent) 30%,transparent);border-radius:14px;background:transparent;color:#c8c1b6;font:600 .74rem/1 system-ui,sans-serif;cursor:pointer}.care-kind-choice button.active{border-color:var(--workspace-accent);background:color-mix(in srgb,var(--workspace-accent) 12%,transparent);color:#f4efe5}
.care-inscription-editor>label{display:grid;gap:.4rem;color:#c8c1b6;font:600 .72rem/1.3 system-ui,sans-serif}.care-inscription-editor :is(input,textarea){width:100%;box-sizing:border-box;padding:.75rem .1rem;border:0;border-bottom:1px solid color-mix(in srgb,var(--workspace-accent) 34%,transparent);border-radius:0;outline:0;background:transparent;color:#f4efe5;font:1rem/1.5 Georgia,'Times New Roman',serif;caret-color:#ead6a7}.care-inscription-editor textarea{min-height:5rem;resize:vertical}.care-inscription-editor :is(input,textarea)::placeholder{color:#918b82;opacity:1}.care-inscription-editor :is(input,textarea):focus{border-bottom-color:#ead6a7;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--workspace-accent) 4%,transparent))}
.care-image-error{margin:0;color:#efb8a8;font:.78rem/1.5 system-ui,sans-serif}.care-publish{justify-self:end;min-width:11rem;min-height:46px;padding:.7rem 1rem;border:1px solid #c9a86a;border-radius:14px;background:rgba(201,168,106,.13);color:#ead6a7;font:600 .8rem/1 system-ui,sans-serif;cursor:pointer}.care-publish:disabled{cursor:not-allowed;opacity:.48}
@keyframes care-poster-arrive{from{opacity:.35;clip-path:inset(12% 0 12%);filter:blur(5px)}to{opacity:1;clip-path:inset(0);filter:blur(0)}}
@media(max-width:760px){.care-mural-space{gap:2.75rem}.care-mural-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.care-poster,.care-poster:nth-child(n){grid-column:span 1;aspect-ratio:4/5}.care-poster:nth-child(4n+2){aspect-ratio:1/1}.care-poster:only-child{grid-column:1/-1;aspect-ratio:7/5}.care-poster-inscription{inset:auto .85rem .85rem}.care-poster-inscription h2{font-size:clamp(1.2rem,6vw,1.65rem)}.care-poster-inscription p{font-size:.75rem}.care-poster-maker{grid-template-columns:minmax(0,1fr);gap:1.5rem}.care-image-stage{min-height:min(22rem,62svh)}.care-publish{width:100%}}
@media(max-width:380px){.care-mural-grid{gap:.6rem}.care-poster-inscription p{display:none}.care-poster-inscription small{font-size:.55rem}.care-image-stage{min-height:17rem}}
@media(prefers-reduced-motion:reduce){.care-poster{animation:none}}

.segmented-choice button{min-height:44px;border:1px solid rgba(201,168,106,.28);border-radius:14px;background:transparent;color:#d8d1c6;padding:.65rem 1rem;font:600 .78rem/1 system-ui,sans-serif;cursor:pointer}.segmented-choice button.active{border-color:#c9a86a;background:rgba(201,168,106,.13);color:#f3dfb2}
@media(max-width:760px){.balance-lists{margin-top:1.5rem}}

/* El espacio funcional conserva la materia ritual de cada eje. */
.tw-workspace{--workspace-accent:#c9a86a;position:relative;isolation:isolate;animation:workspace-unveil 560ms cubic-bezier(.16,1,.3,1) both}.detail-world-decretos,.detail-world-vinculos,.detail-nucleo{--workspace-accent:#8173b7}.detail-world-travesias,.detail-world-cuidado{--workspace-accent:#7da797}.workspace-aura{position:absolute;z-index:-1;inset:-4rem -3rem auto;height:28rem;pointer-events:none;background:radial-gradient(ellipse at 72% 8%,color-mix(in srgb,var(--workspace-accent) 14%,transparent),transparent 56%);mask-image:linear-gradient(#000,transparent 88%);animation:aura-drift 9s ease-in-out infinite alternate}.workspace-header{position:relative}.workspace-title{display:grid;min-width:0;flex:1;grid-template-columns:minmax(0,1fr) 4.5rem;align-items:start;gap:1.5rem}.workspace-title::after{content:'';position:absolute;right:0;bottom:-1rem;width:min(58%,28rem);height:1px;background:linear-gradient(90deg,transparent,var(--workspace-accent),transparent);transform-origin:right;animation:ritual-thread 700ms 100ms cubic-bezier(.16,1,.3,1) both}.workspace-sigil{position:relative;display:grid;width:4.25rem;aspect-ratio:1;place-items:center;border:1px solid color-mix(in srgb,var(--workspace-accent) 44%,transparent);border-radius:50%;color:var(--workspace-accent);box-shadow:0 18px 40px rgba(0,0,0,.25)}.workspace-sigil::before{content:'';position:absolute;inset:-8px;border:1px solid color-mix(in srgb,var(--workspace-accent) 22%,transparent);border-radius:50%;border-block-color:transparent;animation:sigil-orbit 8s linear infinite}.workspace-sigil svg{width:1.7rem}.ritual-form{position:relative;overflow:hidden;border:0;border-block:1px solid color-mix(in srgb,var(--workspace-accent) 35%,transparent);border-radius:0;background:radial-gradient(circle at 6% 0,color-mix(in srgb,var(--workspace-accent) 11%,transparent),transparent 44%);box-shadow:none;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}.ritual-form::before{content:'';position:absolute;inset:0 auto 0 0;width:1px;background:linear-gradient(transparent,var(--workspace-accent),transparent);animation:form-current 4.8s ease-in-out infinite}.ritual-form :is(input,select,textarea){transition:border-color 180ms ease,background-color 180ms ease,box-shadow 220ms ease}.ritual-form :is(input,select,textarea):focus{border-color:var(--workspace-accent);background:#0b1018;box-shadow:0 12px 34px color-mix(in srgb,var(--workspace-accent) 8%,transparent)}.workspace-primary{position:relative;overflow:hidden;border-radius:0;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);transition:background-color 180ms ease,box-shadow 240ms ease,filter 120ms ease}.workspace-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,248,224,.18) 50%,transparent 70%);transform:translateX(-120%);transition:transform 520ms cubic-bezier(.16,1,.3,1)}.workspace-primary:hover::after,.workspace-primary:focus-visible::after{transform:translateX(120%)}.workspace-primary:hover{background:color-mix(in srgb,var(--workspace-accent) 20%,transparent);box-shadow:0 14px 34px color-mix(in srgb,var(--workspace-accent) 12%,rgba(0,0,0,.2))}.workspace-primary:active,.care-publish:active,.daruma-progress button:active,.daruma-transfer:active{transform:translateY(1px)}.workspace-record{position:relative;padding-inline-start:1.35rem;animation:record-materialize 420ms cubic-bezier(.16,1,.3,1) both}.workspace-record::before{content:'';position:absolute;left:.15rem;top:50%;width:5px;height:5px;border-radius:50%;background:var(--workspace-accent);box-shadow:0 0 14px color-mix(in srgb,var(--workspace-accent) 70%,transparent);transform:translateY(-50%);transition:box-shadow 180ms ease,transform 180ms ease}.workspace-record:hover::before{box-shadow:0 0 22px var(--workspace-accent);transform:translateY(-50%) scale(1.45)}.thought-cloth{background-size:135% 135%;animation:cloth-current 9s ease-in-out infinite alternate}.thought-cloth>button span{animation:thought-pulse 3.4s ease-in-out infinite}.thought-cloth>button:nth-of-type(2n) span{animation-delay:-1.4s}.golden-sculpture{background-size:140% 140%;animation:resin-current 8s ease-in-out infinite alternate}.golden-sculpture>.resin-rift{animation:rift-light 4.8s ease-in-out infinite;animation-delay:calc(var(--rift-index) * -.38s)}.golden-sculpture>button span{animation:golden-node-pulse 3.2s ease-in-out infinite}.umbral-workspace{position:relative}.umbral-workspace::before{content:'';position:absolute;z-index:-1;left:50%;top:18rem;width:42rem;max-width:92vw;aspect-ratio:1;border:1px solid rgba(201,168,106,.1);border-radius:50%;transform:translate(-50%,-50%) rotateX(70deg);animation:umbral-orbit 22s linear infinite}.intention-row{animation:record-materialize 360ms cubic-bezier(.16,1,.3,1) both}
@keyframes workspace-unveil{from{opacity:.55;filter:blur(8px);transform:translateY(.75rem)}to{opacity:1;filter:blur(0);transform:translateY(0)}}
@keyframes aura-drift{from{transform:translate3d(-2%,0,0);opacity:.55}to{transform:translate3d(3%,1rem,0);opacity:1}}
@keyframes ritual-thread{from{opacity:0;transform:scaleX(.08)}to{opacity:1;transform:scaleX(1)}}
@keyframes sigil-orbit{to{transform:rotate(360deg)}}
@keyframes form-current{0%,100%{opacity:.2;transform:translateY(-35%)}50%{opacity:.9;transform:translateY(35%)}}
@keyframes record-materialize{from{opacity:.4;clip-path:inset(0 100% 0 0);filter:blur(3px)}to{opacity:1;clip-path:inset(0);filter:blur(0)}}
@keyframes cloth-current{from{background-position:42% 46%;filter:brightness(.94)}to{background-position:58% 54%;filter:brightness(1.07)}}
@keyframes thought-pulse{0%,100%{transform:scale(.72);opacity:.55}50%{transform:scale(1.25);opacity:1}}
@keyframes resin-current{from{background-position:35% 38%;filter:brightness(.94) saturate(.92)}to{background-position:62% 56%;filter:brightness(1.08) saturate(1.06)}}
@keyframes rift-light{0%,100%{opacity:.2;filter:brightness(.8)}50%{opacity:.85;filter:brightness(1.35)}}
@keyframes golden-node-pulse{0%,100%{transform:scale(.82);box-shadow:0 4px 15px #ead6a7}50%{transform:scale(1.18);box-shadow:0 8px 30px #fff4c9}}
@keyframes umbral-orbit{to{transform:translate(-50%,-50%) rotateX(70deg) rotateZ(360deg)}}
.golden-selected-copy{display:none}
@media(max-width:760px){.tw-workspace{width:100%;max-width:100%;min-height:0}.workspace-header{display:block}.workspace-back{margin-bottom:1.25rem}.workspace-title{grid-template-columns:2.75rem minmax(0,1fr);gap:1rem}.workspace-title>div{order:2}.workspace-sigil{order:1;width:2.25rem}.workspace-sigil::before{inset:-4px}.workspace-sigil svg{width:1rem}.workspace-grid,.balance-lists,.umbral-workspace{grid-template-columns:minmax(0,1fr)}.workspace-grid>*,.balance-lists>*,.umbral-workspace>*{min-width:0}.note-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.thought-cloth{width:100%;min-height:min(20rem,68svh)}.golden-sculpture{width:min(25rem,86vw)}.golden-sculpture>button em{display:none}.golden-selected-copy{display:block;max-width:32rem;margin:1rem auto;color:#ead6a7;overflow-wrap:anywhere;font-style:italic;line-height:1.6}.ritual-form,.nucleus-entry,.golden-entry{width:100%;max-width:100%;box-sizing:border-box}.workspace-record>div{min-width:0}}
@media(max-width:420px){.workspace-aura{inset:-2rem 0 auto;width:100%}.workspace-header h1{max-width:100%;font-size:clamp(2.15rem,12vw,3rem);overflow-wrap:anywhere}.workspace-title{grid-template-columns:2.75rem minmax(0,1fr);gap:.65rem}.workspace-title>div{order:2}.workspace-sigil{order:1;width:2.25rem}.workspace-sigil::before{inset:-4px}.workspace-sigil svg{width:1rem}.ritual-form{padding:1rem}.workspace-record{align-items:flex-start;flex-wrap:wrap}.workspace-record>button{width:100%}.balance-lists{gap:1.25rem}.goal-colors{display:flex;flex-wrap:wrap;gap:.65rem}.goal-colors button{margin:0}.note-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.note-grid button{padding-inline:.25rem}.golden-sculpture{width:min(21rem,calc(100vw - 2.5rem))}.thought-reading{max-width:100%;box-sizing:border-box}.workspace-primary{width:100%}}
@media(max-width:760px) and (max-height:520px){.golden-sculpture{width:min(16rem,48svh)}.thought-cloth{min-height:58svh}.workspace-header{margin-bottom:1.25rem}.workspace-header h1{font-size:2.25rem}}
/* Edad Dorada: un Daruma de resina revela cada momento como una grieta de oro. */
.detail-edad-dorada .golden-workspace{text-align:left}
.golden-presence{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(17rem,.85fr);align-items:center;gap:clamp(1.5rem,5vw,4.5rem)}
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
.daruma-crack-hit{fill:none;stroke:transparent;stroke-width:18;pointer-events:stroke}
.daruma-crack-glow{fill:none;stroke:#ead6a7;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:.16;filter:url(#golden-glow);pointer-events:none}
.daruma-crack-line{fill:none;stroke:url(#daruma-gold-gradient);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:280;stroke-dashoffset:0;filter:url(#golden-glow);pointer-events:none;animation:daruma-crack-form 680ms cubic-bezier(.16,1,.3,1) both}
.daruma-crack-node{fill:#fff4c9;stroke:#8d692d;stroke-width:1.2;filter:url(#golden-glow);pointer-events:none}
.daruma-crack:is(:hover,:focus-visible,.selected) .daruma-crack-line{stroke-width:3.8}
.daruma-crack:is(:focus-visible,.selected) .daruma-crack-glow{opacity:.48;animation:daruma-gold-current 2.8s ease-in-out infinite}
.daruma-paused :is(.daruma-form,.daruma-crack-glow){animation-play-state:paused}
.daruma-empty{position:absolute;z-index:3;left:50%;bottom:13%;width:min(70%,19rem);margin:0;color:#c8c0b4;font-style:italic;line-height:1.55;text-align:center;transform:translateX(-50%)}
.golden-crack-reading{position:absolute;z-index:20;width:min(16rem,70%);box-sizing:border-box;padding:.9rem 1rem;border:1px solid rgba(201,168,106,.32);border-radius:12px;background:radial-gradient(circle at 8% 0,rgba(201,168,106,.1),transparent 44%),#0d121b;box-shadow:0 18px 48px rgba(0,0,0,.42);text-align:left;transform:translate(-50%,calc(-100% - 14px))}
.golden-crack-reading::before{content:'';position:absolute;left:50%;bottom:-.55rem;width:1px;height:.55rem;background:#c9a86a}
.golden-crack-reading header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
.golden-crack-reading header>div{display:grid;gap:.25rem}
.golden-crack-reading strong{color:#ead6a7;font:600 .76rem/1.3 system-ui,sans-serif}
.golden-crack-reading time{color:#ada497;font:500 .69rem/1.3 system-ui,sans-serif}
.golden-crack-reading header button{display:grid;width:44px;height:44px;place-items:center;margin:-.65rem -.65rem 0 0;border:0;background:transparent;color:#d8d1c6;cursor:pointer}
.golden-crack-reading header button svg{width:1rem}
.detail-edad-dorada .golden-selected-copy{display:block;margin:.85rem 0 0;color:#f4efe5;font-size:1.06rem;font-style:normal;line-height:1.65;text-align:left}
.golden-reading-enter-active,.golden-reading-leave-active{transition:opacity 180ms ease,filter 260ms ease,transform 340ms cubic-bezier(.16,1,.3,1)}.golden-reading-enter-from,.golden-reading-leave-to{opacity:0;filter:blur(4px);transform:translateY(.8rem) scale(.97)}
.golden-practice{min-width:0}
.detail-edad-dorada .golden-copy{margin:0 0 1.5rem;text-align:left}
.detail-edad-dorada .golden-copy strong{display:block;color:#ead6a7;font-size:clamp(1.65rem,3vw,2.35rem);font-weight:300;line-height:1.08}
.detail-edad-dorada .golden-copy span{display:block;max-width:29rem;margin-top:.8rem;color:#c9c1b5;font-size:1rem;font-style:italic;line-height:1.65}
.detail-edad-dorada .golden-entry{width:100%;max-width:none;margin:0;gap:.75rem}
.detail-edad-dorada .golden-entry label{color:#b9b3aa;letter-spacing:.04em;text-transform:uppercase}
.detail-edad-dorada .golden-entry textarea{min-height:8rem;padding:.9rem .15rem;border:0;border-bottom:1px solid rgba(201,168,106,.34);border-radius:0;background:transparent;font-family:Georgia,'Times New Roman',serif;font-size:1.12rem;letter-spacing:0;text-transform:none}
.detail-edad-dorada .golden-entry textarea:focus-visible{outline:0;border-bottom-color:#ead6a7;background:linear-gradient(180deg,transparent,rgba(201,168,106,.035));box-shadow:0 14px 24px -22px rgba(234,214,167,.75)}
.detail-edad-dorada .golden-entry .workspace-primary{justify-self:end;width:auto;min-width:11rem;margin-top:.2rem;border-radius:14px;clip-path:none}
.detail-edad-dorada .workspace-text{margin:1rem auto 0}
.detail-edad-dorada.is-contemplative .golden-workspace{position:fixed;z-index:95;inset:0;display:grid;place-items:center;overflow:auto;background:radial-gradient(circle at 50% 54%,color-mix(in srgb,var(--sign-color) 12%,transparent),transparent 46%),#080b11;padding:2rem}
.detail-edad-dorada.is-contemplative .golden-presence{display:block;width:min(78svh,92vw)}
.detail-edad-dorada.is-contemplative .daruma-stage{width:100%}
.detail-edad-dorada .contemplation-exit{z-index:100}
@keyframes daruma-presence{0%,100%{filter:brightness(.94) drop-shadow(0 12px 24px rgba(0,0,0,.18))}50%{filter:brightness(1.06) drop-shadow(0 18px 34px color-mix(in srgb,var(--sign-color) 12%,transparent))}}
@keyframes daruma-crack-form{from{stroke-dashoffset:280;opacity:.15;filter:blur(2px)}to{stroke-dashoffset:0;opacity:1;filter:url(#golden-glow)}}
@keyframes daruma-gold-current{0%,100%{opacity:.25}50%{opacity:.58}}
@media(max-width:760px){.golden-presence{grid-template-columns:minmax(0,1fr);gap:1.2rem}.detail-edad-dorada .daruma-stage{width:min(100%,34rem)}.golden-practice{margin-top:.8rem}.detail-edad-dorada .golden-copy{text-align:center}.detail-edad-dorada .golden-copy span{margin-inline:auto}.detail-edad-dorada .golden-entry .workspace-primary{width:100%}.detail-edad-dorada.is-contemplative .golden-workspace{padding:1rem}.detail-edad-dorada .contemplation-exit{right:1rem;top:1rem}}
@media(max-width:380px){.detail-edad-dorada .daruma-stage{width:calc(100vw - 2.5rem)}.daruma-empty{font-size:.88rem}}
@media(prefers-reduced-motion:reduce){.daruma-form,.daruma-crack-line,.daruma-crack-glow{animation:none}.golden-reading-enter-active,.golden-reading-leave-active{transition-duration:120ms}}
/* Mi Constelación: cada vínculo ocupa el anillo confirmado por la clienta. */
.detail-world-vinculos .constellation-workspace{grid-template-columns:minmax(0,1.35fr) minmax(17rem,.65fr);align-items:center;gap:clamp(1.5rem,4vw,3.5rem)}
.constellation-space{min-width:0}
.constellation-map{position:relative;isolation:isolate;width:min(100%,39rem);aspect-ratio:1;margin-inline:auto;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 50% 50%,rgba(201,168,106,.07),transparent 7%),radial-gradient(circle at 50% 50%,rgba(129,115,183,.1),transparent 48%),radial-gradient(circle at 38% 32%,#111622,#080b11 72%);box-shadow:inset 0 0 90px rgba(0,0,0,.55),0 28px 68px rgba(0,0,0,.22)}
.constellation-map>svg{position:absolute;z-index:1;inset:0;width:100%;height:100%;overflow:visible}
.constellation-orbit{fill:none;stroke-width:.28;stroke-dasharray:1.4 2.1;transform-box:fill-box;transform-origin:center;animation:constellation-orbit-current 24s linear infinite}
.constellation-orbit.orbit-inner{stroke:rgba(184,109,93,.42);animation-duration:18s}
.constellation-orbit.orbit-middle{stroke:rgba(129,115,183,.36);animation-direction:reverse;animation-duration:22s}
.constellation-orbit.orbit-outer{stroke:rgba(201,168,106,.3)}
.constellation-thread{stroke:color-mix(in srgb,var(--star-color) 22%,transparent);stroke-width:.18;stroke-dasharray:.8 1.4;animation:constellation-thread-arrive 620ms cubic-bezier(.16,1,.3,1) both}
.constellation-heart{position:absolute;z-index:3;left:50%;top:50%;display:grid;width:42px;aspect-ratio:1;place-items:center;border:1px solid rgba(234,214,167,.32);border-radius:50%;background:#0b1018;color:#ead6a7;box-shadow:0 12px 28px rgba(0,0,0,.35);transform:translate(-50%,-50%)}
.constellation-heart svg{width:1.05rem}
.constellation-star{position:absolute;z-index:5;display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:transparent;transform:translate(-50%,-50%);cursor:pointer}
.constellation-star>span{position:relative;display:block;width:9px;aspect-ratio:1;border:1px solid color-mix(in srgb,var(--star-color) 74%,#fff);border-radius:50%;background:var(--star-color);box-shadow:0 5px 14px color-mix(in srgb,var(--star-color) 48%,transparent),0 10px 28px color-mix(in srgb,var(--star-color) 32%,transparent);animation:constellation-star-pulse 3.8s ease-in-out infinite;animation-delay:calc(var(--star-index) * -.43s)}
.constellation-star>span::after{content:'';position:absolute;inset:-7px;border:1px solid color-mix(in srgb,var(--star-color) 28%,transparent);border-radius:50%;transform:scale(.68);transition:transform 180ms cubic-bezier(.16,1,.3,1),border-color 180ms ease}
.constellation-star:is(:hover,:focus-visible,.active)>span::after{border-color:var(--star-color);transform:scale(1)}
.constellation-star:focus-visible{outline:2px solid #f4efe5;outline-offset:1px}
.constellation-star.active>span{box-shadow:0 6px 18px var(--star-color),0 14px 38px color-mix(in srgb,var(--star-color) 52%,transparent)}
.constellation-reading{position:absolute;z-index:12;left:50%;bottom:5%;display:grid;width:min(78%,21rem);box-sizing:border-box;grid-template-columns:minmax(0,1fr) 44px;gap:.2rem .8rem;padding:1rem 1rem 1.05rem;border:1px solid rgba(201,168,106,.28);border-radius:14px;background:#0d121b;box-shadow:0 20px 52px rgba(0,0,0,.45);transform:translateX(-50%);text-align:left}
.constellation-reading>div{display:grid;min-width:0;grid-template-columns:.6rem minmax(0,1fr);align-items:center;gap:.25rem .55rem}
.constellation-reading>div>span{width:.55rem;aspect-ratio:1;border-radius:50%;background:var(--star-color);box-shadow:0 5px 13px color-mix(in srgb,var(--star-color) 50%,transparent)}
.constellation-reading strong{overflow-wrap:anywhere;font-size:1.05rem;font-weight:400}
.constellation-reading small{grid-column:2;color:#bdb5c7;font:500 .7rem/1.4 system-ui,sans-serif}
.constellation-reading>button{display:grid;width:44px;height:44px;place-items:center;margin:-.65rem -.65rem 0 0;border:0;background:transparent;color:#d8d1c6;cursor:pointer}
.constellation-reading>button svg{width:1rem}
.constellation-reading>p{grid-column:1/-1;margin:.7rem 0 0;color:#d8d1c6;font-size:.92rem;line-height:1.55}
.constellation-reading-enter-active,.constellation-reading-leave-active{transition:opacity 180ms ease}.constellation-reading-enter-active.constellation-reading,.constellation-reading-leave-active.constellation-reading{transition:opacity 180ms ease,filter 260ms ease,transform 320ms cubic-bezier(.16,1,.3,1)}.constellation-reading-enter-from,.constellation-reading-leave-to{opacity:0;filter:blur(4px);transform:translate(-50%,.75rem) scale(.96)}
.constellation-empty{position:absolute;z-index:4;left:50%;top:66%;width:min(72%,22rem);margin:0;color:#bdb5c7;line-height:1.6;text-align:center;transform:translate(-50%,-50%)}
.constellation-legend{display:flex;flex-wrap:wrap;gap:.6rem 1.25rem;margin:1rem 0 0;padding:0;list-style:none}
.constellation-legend li{display:grid;grid-template-columns:.6rem minmax(0,auto);align-items:center;gap:.2rem .5rem;color:#ddd6cc;font:500 .72rem/1.35 system-ui,sans-serif}
.constellation-legend li>span{width:.55rem;aspect-ratio:1;border-radius:50%}.constellation-legend .legend-ocaso{background:#b86d5d}.constellation-legend .legend-cosmos{background:#8173b7}.constellation-legend .legend-oro{background:#c9a86a}
.constellation-legend strong{font-weight:600}.constellation-legend small{grid-column:2;color:#a9a2b1}
.constellation-paused :is(.constellation-orbit,.constellation-star>span){animation-play-state:paused}
.detail-world-vinculos .ritual-form select{appearance:none;color-scheme:dark;padding-right:2.6rem;background-image:linear-gradient(45deg,transparent 50%,#d8d1c6 50%),linear-gradient(135deg,#d8d1c6 50%,transparent 50%);background-position:calc(100% - 18px) 52%,calc(100% - 12px) 52%;background-repeat:no-repeat;background-size:6px 6px}
@keyframes constellation-orbit-current{to{stroke-dashoffset:-18}}
@keyframes constellation-thread-arrive{from{opacity:0;stroke-dashoffset:14}to{opacity:1;stroke-dashoffset:0}}
@keyframes constellation-star-pulse{0%,100%{filter:brightness(.86);transform:scale(.82)}50%{filter:brightness(1.18);transform:scale(1.18)}}
@media(max-width:760px){.detail-world-vinculos .constellation-workspace{grid-template-columns:minmax(0,1fr);gap:1.5rem}.constellation-map{width:min(100%,31rem)}.constellation-reading{position:fixed;z-index:80;inset:auto 1rem calc(5.9rem + env(safe-area-inset-bottom));width:auto;transform:none}.constellation-reading-enter-from.constellation-reading,.constellation-reading-leave-to.constellation-reading{transform:translateY(.75rem) scale(.96)}.detail-world-vinculos .ritual-form{width:100%;box-sizing:border-box}}
@media(max-width:380px){.constellation-legend{display:grid}.constellation-map{width:calc(100vw - 2.5rem)}}
@media(prefers-reduced-motion:reduce){.constellation-orbit,.constellation-star>span,.constellation-thread{animation:none}.constellation-reading-enter-active.constellation-reading,.constellation-reading-leave-active.constellation-reading{transition-duration:120ms}}
/* Umbral se comporta como una experiencia continua de aplicación, no como una página de formularios. */
.detail-umbral .workspace-header h1{font-size:clamp(2.35rem,5vw,3.65rem)}
.detail-umbral .umbral-workspace{display:block;width:min(100%,46rem);margin-inline:auto}
.detail-umbral .umbral-workspace::before{top:20rem;width:38rem;opacity:.72}
.detail-umbral .umbral-ritual{position:relative;padding:1.4rem 0 2.6rem}
.detail-umbral .umbral-ritual+.umbral-ritual{padding-top:2.6rem;border-top:1px solid rgba(201,168,106,.18)}
.detail-umbral .umbral-ritual-title{display:flex;align-items:center;gap:.9rem}
.detail-umbral .umbral-ritual-title>span{display:grid;width:44px;aspect-ratio:1;flex:0 0 auto;place-items:center;border:1px solid rgba(201,168,106,.4);border-radius:50%;color:#ead6a7;background:radial-gradient(circle at 38% 30%,rgba(234,214,167,.12),transparent 62%);box-shadow:0 12px 32px rgba(0,0,0,.22)}
.detail-umbral .umbral-ritual-title svg{width:1rem}
.detail-umbral .umbral-ritual h2{margin:0;font-size:clamp(1.65rem,4vw,2.15rem);font-weight:300;line-height:1.08}
.detail-umbral .umbral-prompt{max-width:35rem;margin:1.25rem 0 0;color:#c9c1b5;font-size:1.06rem;line-height:1.65}
.detail-umbral .umbral-capture{overflow:visible;width:100%;max-width:none;margin:1.5rem 0 1rem;padding:0;border:0;background:none;clip-path:none}
.detail-umbral .umbral-capture::before{display:none}
.detail-umbral .umbral-capture label{gap:.7rem;color:#b9b3aa;letter-spacing:.04em;text-transform:uppercase}
.detail-umbral .umbral-capture :is(input,textarea){min-height:54px;padding:.85rem .15rem;border:0;border-bottom:1px solid rgba(201,168,106,.34);border-radius:0;background:transparent;font-family:Georgia,'Times New Roman',serif;font-size:1.18rem;letter-spacing:0;text-transform:none;transition:border-color 180ms ease,box-shadow 220ms ease}
.detail-umbral .umbral-capture textarea{min-height:7.5rem}
.detail-umbral .umbral-capture :is(input,textarea):focus{outline:0;border-bottom-color:#ead6a7;background:linear-gradient(180deg,transparent,rgba(201,168,106,.035));box-shadow:0 14px 24px -22px rgba(234,214,167,.75)}
.detail-umbral .umbral-capture .workspace-primary{justify-self:end;width:auto;min-width:10rem;border-radius:14px;clip-path:none}
.detail-umbral .umbral-workspace blockquote{position:relative;margin:1.5rem 0 0;padding:1rem 1.25rem 1rem 1.7rem;border:0;color:#ead6a7;font-size:1.15rem;font-style:italic;line-height:1.55}
.detail-umbral .umbral-workspace blockquote::before{content:'✦';position:absolute;left:0;top:1.1rem;color:#c9a86a;font-size:.7rem}
.detail-umbral .workspace-empty{margin:1rem 0 0}
.detail-umbral .intention-row input{width:20px;height:20px;flex:0 0 auto;margin-top:.12rem}
@media(max-width:760px){.detail-umbral .workspace-header{display:grid;grid-template-columns:44px minmax(0,1fr) 3rem;align-items:center;gap:.8rem;margin-bottom:1.25rem}.detail-umbral .workspace-back{width:44px;margin:0;justify-content:center;overflow:hidden;border:1px solid rgba(201,168,106,.28);border-radius:50%}.detail-umbral .workspace-back span{display:none}.detail-umbral .workspace-back svg{width:1.05rem}.detail-umbral .workspace-title{display:contents}.detail-umbral .workspace-title::after{display:none}.detail-umbral .workspace-title>div{min-width:0}.detail-umbral .workspace-header h1{font-size:clamp(2.2rem,10vw,3rem)}.detail-umbral .workspace-header p{display:none}.detail-umbral .workspace-sigil{width:2.8rem}.detail-umbral .umbral-ritual{padding-top:1rem}.detail-umbral .umbral-ritual+.umbral-ritual{padding-top:2.25rem}.detail-umbral .umbral-capture{padding:0}.detail-umbral .umbral-capture .workspace-primary{min-width:9.5rem}}
@media(max-width:420px){.detail-umbral .workspace-primary{width:auto}.detail-umbral .umbral-ritual-title{align-items:flex-start}.detail-umbral .umbral-ritual-title>span{width:40px}.detail-umbral .umbral-ritual h2{font-size:1.7rem}}
/* Núcleo: los pensamientos se agrupan por emoción dentro de un plasma local y privado. */
.detail-nucleo .nucleus-map-copy{max-width:38rem;margin:0 0 1.1rem;color:#c8c0d9;font-style:italic;line-height:1.6}
.detail-nucleo .nucleus-emotion-field{isolation:isolate;min-height:30rem;overflow:hidden;border:1px solid rgba(129,115,183,.2);background:radial-gradient(circle at 50% 46%,rgba(129,115,183,.09),transparent 54%),#090d15;box-shadow:inset 0 0 90px rgba(0,0,0,.62),0 28px 68px rgba(0,0,0,.2)}
.nucleus-plasma{position:absolute;z-index:0;inset:0;overflow:hidden;pointer-events:none}
.plasma-pool{position:absolute;width:38%;max-width:13rem;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:46% 54% 63% 37%/55% 43% 57% 45%;background:radial-gradient(circle at 42% 38%,color-mix(in srgb,var(--emotion-color) 64%,transparent),color-mix(in srgb,var(--emotion-color) 18%,transparent) 42%,transparent 72%);filter:blur(18px);opacity:.42;mix-blend-mode:screen;animation:nucleus-plasma-current 8.8s ease-in-out infinite alternate;animation-delay:calc(var(--plasma-index) * -1.35s)}
.plasma-paused .plasma-pool,.plasma-paused .thought-point span{animation-play-state:paused}
.thought-cloth>.thought-point{z-index:3;width:46px;height:46px;transform:translate(-50%,-50%)}
.thought-cloth>.thought-point span{position:relative;display:block;width:10px;height:10px;margin:auto;border:1px solid color-mix(in srgb,var(--thought-color) 76%,#fff);border-radius:50%;background:var(--thought-color);box-shadow:0 4px 12px color-mix(in srgb,var(--thought-color) 45%,transparent),0 8px 28px color-mix(in srgb,var(--thought-color) 38%,transparent);animation:thought-plasma-pulse 3.6s ease-in-out infinite;animation-delay:calc(var(--thought-index) * -.52s)}
.thought-cloth>.thought-point span::after{content:'';position:absolute;inset:-7px;border:1px solid color-mix(in srgb,var(--thought-color) 32%,transparent);border-radius:50%;transform:scale(.72);transition:transform 180ms cubic-bezier(.16,1,.3,1),border-color 180ms ease}
.thought-cloth>.thought-point:hover span::after,.thought-cloth>.thought-point:focus-visible span::after{border-color:var(--thought-color);transform:scale(1)}
.thought-cloth>.thought-point:focus-visible{outline:2px solid #f4efe5;outline-offset:1px;border-radius:50%}
.nucleus-emotion-key{display:flex;flex-wrap:wrap;gap:.65rem 1.2rem;margin:.9rem 0 0;padding:0;list-style:none}
.nucleus-emotion-key li{display:grid;grid-template-columns:.65rem minmax(0,auto) auto;align-items:center;gap:.45rem;color:#d5cedf;font:500 .72rem/1.35 system-ui,sans-serif}
.nucleus-emotion-key li>span{width:.55rem;aspect-ratio:1;border-radius:50%;background:var(--emotion-color);box-shadow:0 4px 10px color-mix(in srgb,var(--emotion-color) 42%,transparent)}
.nucleus-emotion-key strong{font-weight:500}.nucleus-emotion-key small{color:#90899b;font-variant-numeric:tabular-nums}
.thought-reading-layer{position:fixed;z-index:90;inset:0;display:grid;place-items:center;padding:1.25rem;background:rgba(4,6,10,.72);backdrop-filter:blur(6px)}
.thought-reading-layer:focus{outline:none}
.detail-nucleo .thought-reading{width:min(100%,28rem);max-width:none;box-sizing:border-box;margin:0;padding:1.35rem 1.4rem 1.5rem;border:1px solid color-mix(in srgb,var(--thought-color) 38%,transparent);border-radius:14px;background:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--thought-color) 11%,transparent),transparent 44%),#0d121b;box-shadow:0 24px 62px rgba(0,0,0,.46)}
.detail-nucleo .thought-reading::before{background:linear-gradient(transparent,var(--thought-color),transparent)}
.detail-nucleo .thought-reading header{align-items:flex-start;margin-bottom:1.15rem}
.detail-nucleo .thought-reading header>div{display:grid;grid-template-columns:.65rem minmax(0,1fr);align-items:center;gap:.3rem .55rem;min-width:0}
.thought-emotion-mark{width:.6rem;aspect-ratio:1;border-radius:50%;background:var(--thought-color);box-shadow:0 5px 14px color-mix(in srgb,var(--thought-color) 46%,transparent)}
.detail-nucleo .thought-reading header strong{color:color-mix(in srgb,var(--thought-color) 76%,#f4efe5);font-size:.83rem;font-weight:600;line-height:1.25}
.detail-nucleo .thought-reading header time{grid-column:2;color:#a9a2b1;line-height:1.3}
.detail-nucleo .thought-reading header button{display:grid;width:44px;height:44px;flex:0 0 auto;place-items:center;margin:-.75rem -.75rem 0 0;border:0;background:transparent;color:#d6cedf;cursor:pointer}
.detail-nucleo .thought-reading header button svg{width:1rem}
.detail-nucleo .thought-reading>svg{color:var(--thought-color);filter:drop-shadow(0 7px 14px color-mix(in srgb,var(--thought-color) 26%,transparent))}
.detail-nucleo .thought-reading p{max-height:min(46svh,22rem);margin:1rem 0 0;overflow:auto;white-space:pre-wrap}
.thought-float-enter-active,.thought-float-leave-active{transition:opacity 180ms ease}.thought-float-enter-active .thought-reading,.thought-float-leave-active .thought-reading{transition:transform 340ms cubic-bezier(.16,1,.3,1),filter 260ms ease}.thought-float-enter-from,.thought-float-leave-to{opacity:0}.thought-float-enter-from .thought-reading,.thought-float-leave-to .thought-reading{filter:blur(5px);transform:translateY(1rem) scale(.94)}
@keyframes nucleus-plasma-current{0%{border-radius:46% 54% 63% 37%/55% 43% 57% 45%;filter:blur(20px) brightness(.86);transform:translate(-53%,-48%) scale(.86)}50%{border-radius:61% 39% 42% 58%/43% 62% 38% 57%;filter:blur(15px) brightness(1.08);transform:translate(-46%,-54%) scale(1.12)}100%{border-radius:39% 61% 54% 46%/64% 38% 62% 36%;filter:blur(18px) brightness(.96);transform:translate(-50%,-47%) scale(.96)}}
@keyframes thought-plasma-pulse{0%,100%{opacity:.64;transform:scale(.78)}50%{opacity:1;transform:scale(1.18)}}
@media(max-width:760px){.detail-nucleo .nucleus-emotion-field{min-height:min(25rem,66svh)}.plasma-pool{width:46%}.nucleus-emotion-key{gap:.55rem 1rem}.thought-reading-layer{align-items:end;padding:1rem 1rem calc(6rem + env(safe-area-inset-bottom))}.detail-nucleo .thought-reading{width:100%}}
.journey-picker{display:grid;gap:.6rem}.journey-picker label{color:#b9b3aa;font:600 .72rem/1.3 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em}.journey-picker>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem}.journey-picker>div input{min-width:0;min-height:48px;border:0;border-bottom:1px solid rgba(125,167,151,.42);outline:0;background:transparent;color:#f4efe5;padding:.65rem .15rem;font:1rem/1.4 Georgia,'Times New Roman',serif}.journey-picker>div input:focus-visible{border-bottom-color:#ead6a7;box-shadow:0 2px #ead6a7}.journey-picker>div button{min-height:44px;border:1px solid rgba(201,168,106,.42);border-radius:999px;background:rgba(201,168,106,.1);color:#ead6a7;padding:.65rem 1rem;font:600 .78rem/1 system-ui,sans-serif;cursor:pointer}.journey-picker>div button:disabled{cursor:wait;opacity:.55}.journey-results{display:grid;max-height:14rem;margin:0;padding:.3rem;overflow:auto;border:1px solid rgba(125,167,151,.32);border-radius:1rem;background:#0d121b;list-style:none}.journey-results button{width:100%;min-height:44px;border:0;border-bottom:1px solid rgba(125,167,151,.14);background:transparent;color:#e3f0e8;padding:.6rem .7rem;text-align:left;cursor:pointer}.journey-results button:is(:hover,:focus-visible){outline:0;background:rgba(125,167,151,.12);color:#f4efe5}.journey-selected-place{display:grid;gap:.35rem;padding:.85rem 0;border-block:1px solid rgba(125,167,151,.2)}.journey-selected-place small{color:#b9c9c1;font:600 .68rem/1.3 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}.journey-selected-place strong{color:#e3f0e8;font-size:1.15rem;font-weight:300}.journey-selected-place.empty strong{color:#a9b9b2;font-size:1rem;font-style:italic}.journey-location-message{margin:0;color:#b9c9c1;font:.76rem/1.45 system-ui,sans-serif}
.decree-ritual{position:fixed;z-index:120;inset:0;display:grid;place-content:center;justify-items:center;gap:2rem;padding:2rem;background:#080b11;color:#f4efe5;text-align:center;cursor:pointer}.decree-ritual>button{position:absolute;right:1rem;top:1rem;display:grid;width:48px;height:48px;place-items:center;border:0;background:transparent;color:#d8d1c6}.decree-ritual>button svg{width:1rem}.decree-ritual blockquote{max-width:38rem;margin:0;font-size:clamp(1.7rem,5vw,3rem);font-weight:250;line-height:1.25}.decree-ritual>div{display:flex;gap:1rem}.decree-ritual>div span{width:1rem;aspect-ratio:1;border:1px solid rgba(201,168,106,.42);border-radius:50%}.decree-ritual>div span.filled{background:#c9a86a;box-shadow:0 0 18px rgba(201,168,106,.48)}.decree-ritual p{margin:0;color:#c9a86a;font-style:italic}
.decree-claim{position:fixed;z-index:121;inset:0;display:grid;place-content:center;justify-items:center;gap:1.2rem;padding:2rem;background:rgba(8,11,17,.96);color:#f4efe5;text-align:center}.decree-claim p{margin:0;color:#b9b3aa}.decree-claim strong{max-width:34rem;color:#ead6a7;font-size:clamp(1.4rem,4vw,2.2rem);font-weight:300}.decree-claim>div{display:flex;gap:.75rem}.decree-claim button{min-height:48px;border:1px solid rgba(201,168,106,.35);border-radius:12px;background:transparent;color:#d8d1c6;padding:.75rem 1rem}.decree-claim button:last-child{background:rgba(201,168,106,.14);color:#ead6a7}
.balance-base-income{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:1rem;width:min(100%,34rem);margin:1.25rem auto 0}.balance-base-income label{display:grid;gap:.45rem;color:#b9b3aa;font:600 .72rem/1.3 system-ui,sans-serif}.balance-base-income input,.daruma-progress input{min-height:46px;box-sizing:border-box;border:1px solid rgba(201,168,106,.28);border-radius:10px;background:#0d121b;color:#f4efe5;padding:.65rem .75rem}.balance-recurring{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center;min-height:44px}.balance-recurring input{width:22px!important;min-height:22px!important}.daruma-progress{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;margin-top:.6rem}.daruma-progress button,.daruma-transfer{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:.35rem;border:1px solid rgba(201,168,106,.38);border-radius:10px;background:rgba(201,168,106,.1);color:#ead6a7;padding:.55rem .75rem;cursor:pointer}.daruma-transfer{margin-top:.6rem}.daruma-transfer svg{width:1rem}
@media(max-width:560px){.balance-base-income{grid-template-columns:1fr}.decree-ritual{padding:1.5rem}.balance-base-income .workspace-primary{width:100%}}
@media(max-width:760px){.workspace-primary{min-height:44px;padding:.6rem .9rem}.ritual-form,.nucleus-entry,.golden-entry{padding:.95rem;gap:.85rem}.ritual-form{padding:.95rem}.workspace-text,.workspace-back{min-height:40px}.daruma-progress button,.daruma-transfer,.segmented-choice button{padding:.5rem .7rem}}
@media(prefers-reduced-motion:reduce){.tw-workspace{animation:workspace-appear 160ms ease-out both}.workspace-aura,.workspace-sigil::before,.ritual-form::before,.thought-cloth,.thought-cloth>button span,.plasma-pool,.golden-sculpture,.golden-sculpture>.resin-rift,.golden-sculpture>button span,.umbral-workspace::before{animation:none}.workspace-record,.intention-row{animation:none}.thought-float-enter-active,.thought-float-leave-active,.thought-float-enter-active .thought-reading,.thought-float-leave-active .thought-reading{transition-duration:1ms}.tw-workspace *{scroll-behavior:auto!important;transition-duration:120ms!important}}@keyframes workspace-appear{from{opacity:.72}to{opacity:1}}
/* v1.3 — los detalles son lecturas en un campo, no tarjetas administrativas. */
.tw-workspace{padding:clamp(.2rem,1.2vw,1rem);border-radius:2.1rem 1.1rem 3.25rem 1.3rem/1.4rem 2.55rem 1.65rem 2.8rem}.workspace-header{padding:.75rem .55rem 1.5rem}.workspace-back{border-radius:999px;padding:.65rem .9rem;background:rgba(8,11,17,.28)}.workspace-title{padding:.2rem .45rem}.workspace-sigil{background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--workspace-accent) 18%,transparent),rgba(8,11,17,.2));backdrop-filter:blur(8px)}.ritual-form{padding:clamp(1.05rem,2.5vw,1.55rem);border:1px solid color-mix(in srgb,var(--workspace-accent) 28%,transparent);border-radius:1.65rem 1rem 2.75rem 1.2rem/1.25rem 2.25rem 1.55rem 2.45rem;background:linear-gradient(135deg,color-mix(in srgb,var(--workspace-accent) 8%,rgba(10,15,23,.72)),rgba(8,11,17,.34));backdrop-filter:blur(13px);clip-path:none;box-shadow:0 20px 48px rgba(0,0,0,.15)}.ritual-form::before{display:none}.ritual-form :is(input,select,textarea){border-radius:1rem 1rem 1.55rem 1rem;background:rgba(7,11,17,.58)}.workspace-primary{border-radius:999px;clip-path:none;box-shadow:0 12px 28px rgba(0,0,0,.2)}.workspace-primary::after{display:none}.workspace-primary:hover{transform:translateY(-1px);box-shadow:0 16px 36px color-mix(in srgb,var(--workspace-accent) 15%,rgba(0,0,0,.22))}.workspace-record{padding:.95rem .55rem .95rem 1.5rem;border-bottom-color:color-mix(in srgb,var(--workspace-accent) 17%,transparent)}.workspace-record>button,.daruma-progress button,.daruma-transfer{border-radius:999px}.workspace-empty{padding:1rem 1.1rem;border:1px dashed color-mix(in srgb,var(--workspace-accent) 28%,transparent);border-radius:1.5rem 1rem 1.8rem 1.1rem;background:color-mix(in srgb,var(--workspace-accent) 4%,transparent)}.balance-base-income{padding:1.15rem 1.2rem;border:1px solid rgba(201,168,106,.2);border-radius:1.6rem 1.05rem 2.3rem 1.2rem;background:rgba(10,15,23,.42);backdrop-filter:blur(12px)}.thought-reading{border:1px solid color-mix(in srgb,var(--thought-color) 36%,transparent);border-radius:1.6rem 1rem 2.6rem 1.1rem/1.2rem 2.25rem 1.55rem 2.1rem;background:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--thought-color) 12%,transparent),transparent 44%),rgba(13,18,27,.94);backdrop-filter:blur(14px)}.nucleus-entry,.golden-entry{padding:1.25rem 1.35rem;border:1px solid color-mix(in srgb,var(--workspace-accent) 24%,transparent);border-radius:1.65rem 1rem 2.55rem 1.15rem;background:rgba(9,13,21,.4);backdrop-filter:blur(13px)}.nucleus-entry textarea,.golden-entry textarea{border-radius:1.05rem 1.05rem 1.7rem 1.05rem}.nucleus-gate{padding:1.75rem;border:1px solid rgba(129,115,183,.25);border-radius:2rem 1.25rem 2.7rem 1.1rem;background:rgba(10,14,23,.48);backdrop-filter:blur(14px)}.note-grid button{border-radius:50%}.contemplation-exit{border-radius:999px}
@media(max-width:760px){.tw-workspace{padding:0;border-radius:1.65rem 1rem 2.4rem 1rem}.workspace-header{padding:.4rem .15rem 1.1rem}.ritual-form,.nucleus-entry,.golden-entry{border-radius:1.35rem 1rem 2rem 1rem}.balance-base-income{border-radius:1.35rem 1rem 2rem 1rem}.workspace-primary{width:auto}.workspace-record>button{border-radius:999px}.nucleus-gate{border-radius:1.65rem 1.15rem 2.25rem 1rem}}
@media(min-width:1024px){.tw-workspace{padding:.5rem}.workspace-header{margin-bottom:1.75rem;padding:.5rem .25rem 1.25rem}.workspace-header h1{font-size:clamp(3rem,3.75vw,3.75rem)}.workspace-title{grid-template-columns:minmax(0,1fr) 3.75rem;gap:1.25rem;padding:.15rem .25rem}.workspace-sigil{width:3.5rem}.workspace-sigil svg{width:1.4rem}.workspace-grid,.balance-lists,.umbral-workspace{gap:1.5rem}.detail-world-vinculos .constellation-workspace{gap:2.25rem}.constellation-map{width:min(100%,34rem)}.ritual-form{padding:1.25rem}}
</style>
