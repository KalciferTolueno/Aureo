<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CollectionRepository, makeId } from '@/data/repositories'
import { storage } from '@/data/storage'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useProfileStore } from '@/stores/profile'
import type { BalanceMovement, DailyArcana, Daruma, GoldenDeclaration, NucleusThought } from '@/domain/types'
import TailwindWorkspace from './tailwind/TailwindWorkspace.vue'
import VueBitsLightRays from './tailwind/VueBitsLightRays.vue'
import { goldenDarumaCrackPatterns } from './tailwind/goldenDaruma'
import { activeNucleusEmotionClusters, groupNucleusThoughts, normalizeNucleusTone, nucleusEmotions, recognizeNucleusTone } from './tailwind/nucleusEmotion'

type AxisId = 'umbral' | 'mundos' | 'balance' | 'nucleo' | 'edad-dorada'
type DetailId = 'umbral' | 'world-vinculos' | 'world-decretos' | 'world-hobbies' | 'world-travesias' | 'world-cuidado' | 'balance' | 'nucleo' | 'edad-dorada'

interface AxisDefinition {
  id: AxisId
  label: string
  icon: string
  phrase: string
}

const worlds = [
  { label: 'Mi Constelación', key: 'vinculos', gradient: 'oro', angle: 0, detail: 'world-vinculos' },
  { label: 'Decretos', key: 'decretos', gradient: 'lavanda', angle: 144, detail: 'world-decretos' },
  { label: 'Hobbies', key: 'hobbies', gradient: 'oro', angle: 216, detail: 'world-hobbies' },
  { label: 'Travesías', key: 'travesias', gradient: 'salvia', angle: 72, detail: 'world-travesias' },
  { label: 'Lo que cuido', key: 'cuidado', gradient: 'ciruela', angle: 288, detail: 'world-cuidado' },
] as const
const detailIds: DetailId[] = ['umbral', 'world-vinculos', 'world-decretos', 'world-hobbies', 'world-travesias', 'world-cuidado', 'balance', 'edad-dorada']

const axes: AxisDefinition[] = [
  { id: 'umbral', label: 'Umbral', icon: 'sun', phrase: 'Un comienzo que orienta, sin imponer.' },
  { id: 'mundos', label: 'Mundos', icon: 'worlds', phrase: 'Lo que amas también dibuja quién eres.' },
  { id: 'balance', label: 'Mi Balance', icon: 'balance', phrase: 'Lo que registro no me define. Me orienta.' },
  { id: 'nucleo', label: 'Núcleo', icon: 'moon', phrase: 'Lo más íntimo permanece solo en este dispositivo.' },
  { id: 'edad-dorada', label: 'Edad Dorada', icon: 'star', phrase: 'Tu porvenir se construye desde lo que ya está naciendo.' },
]

const zodiacColors: Record<string, string> = {
  aries: '#b86b56', tauro: '#7d9b8a', geminis: '#7897b8', cancer: '#a18aa8',
  leo: '#c18a55', virgo: '#8b9d78', libra: '#b58da2', escorpio: '#8b667d',
  sagitario: '#a87868', capricornio: '#71897d', acuario: '#638cad', piscis: '#817daf',
}
const zodiacLabels: Record<string, string> = { aries: 'Aries', tauro: 'Tauro', geminis: 'Géminis', cancer: 'Cáncer', leo: 'Leo', virgo: 'Virgo', libra: 'Libra', escorpio: 'Escorpio', sagitario: 'Sagitario', capricornio: 'Capricornio', acuario: 'Acuario', piscis: 'Piscis' }

function initialAxis(queryAxis: unknown): AxisId {
  const requested = typeof queryAxis === 'string' ? queryAxis : null
  if (axes.some((axis) => axis.id === requested)) return requested as AxisId
  const stored = sessionStorage.getItem('aureo_tailwind_axis')
  return axes.some((axis) => axis.id === stored) ? stored as AxisId : 'umbral'
}

const route = useRoute()
const router = useRouter()
const profile = useProfileStore()
const selectedId = ref<AxisId>(initialAxis(route.query.axis))
const activeDetail = ref<DetailId | null>(typeof route.query.detail === 'string' && detailIds.includes(route.query.detail as DetailId) ? route.query.detail as DetailId : null)
const detailAction = ref(typeof route.query.action === 'string' ? route.query.action : '')
const counts = ref<Record<AxisId, number>>({ umbral: 0, mundos: 0, balance: 0, nucleo: 0, 'edad-dorada': 0 })
const worldCounts = ref<Record<string, number>>({})
const balanceMovements = ref<BalanceMovement[]>([])
const nucleusThoughts = ref<NucleusThought[]>([])
const nucleusThoughtText = ref('')
const nucleusSaving = ref(false)
const goldenDeclarationText = ref('')
const goldenSaving = ref(false)
const goldenSaved = ref(false)
const goldenContemplative = ref(false)
const selectedNucleusThoughtId = ref<string | null>(null)
const nucleusPreviewDialog = ref<HTMLElement | null>(null)
const balanceOverlay = ref<'movement' | 'goal' | null>(null)
const balanceOverlayDialog = ref<HTMLElement | null>(null)
const balanceSaving = ref(false)
const arcanaHistory = ref<DailyArcana[]>([])
const showArcanaDeck = ref(false)
const nucleusUnlocked = ref(false)
const nucleusMelody = ref<string[]>([])
const nucleusError = ref('')
const notes = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
const balanceMovementForm = reactive({ tipo: 'gasto' as 'ingreso' | 'gasto', monto: 0, categoria: 'El nido', nota: '', recurrente: false })
const balanceGoalForm = reactive({ nombre: '', objetivo: 0, color: '#C9A86A' })
const balanceCategories = ['El nido', 'El cuerpo', 'El movimiento', 'El cuidado', 'Lo inesperado', 'Lo que construyo']
const balanceGoalColors = [{ name: 'Suerte y fuerza', value: '#C0392B' }, { name: 'Dinero y prosperidad', value: '#C9A86A' }, { name: 'Nuevo comienzo', value: '#F5F0E6' }, { name: 'Crecimiento personal', value: '#9B7D9B' }, { name: 'Salud y bienestar', value: '#7D9B8A' }, { name: 'Trabajo y logros', value: '#5B8DB8' }, { name: 'Protección', value: '#2C2C2C' }, { name: 'Amor y cuidado propio', value: '#D4849A' }]
const nucleusRepository = new CollectionRepository<NucleusThought>(storage, 'nucleo_pensamientos')
const goldenRepository = new CollectionRepository<GoldenDeclaration>(storage, 'edad_dorada_declaraciones')
const balanceMovementRepository = new CollectionRepository<BalanceMovement>(storage, 'balance_movimientos')
const balanceGoalRepository = new CollectionRepository<Daruma>(storage, 'balance_darumas')
const arcanaRepository = new CollectionRepository<DailyArcana>(storage, 'umbral_arcanos')

const selected = computed(() => axes.find((axis) => axis.id === selectedId.value) ?? axes[0]!)
const zodiacKey = computed(() => profile.profile?.signo?.toLowerCase() ?? 'aries')
const zodiacLabel = computed(() => zodiacLabels[zodiacKey.value] ?? zodiacLabels.aries)
const zodiacStyle = computed(() => {
  const color = zodiacColors[zodiacKey.value] ?? zodiacColors.aries
  return { '--zodiac-color': color, '--sign-color': color }
})
const goldenPreviewCracks = computed(() => goldenDarumaCrackPatterns.slice(0, Math.min(counts.value['edad-dorada'], goldenDarumaCrackPatterns.length)))
const balancePreviewAnchors = [[24, 44], [31, 31], [37, 48], [43, 27], [49, 40], [55, 23], [61, 36], [67, 28], [73, 44], [79, 33], [32, 57], [64, 54]] as const
const balancePreviewFlowers = computed(() => [...balanceMovements.value]
  .filter((item) => item.tipo === 'gasto')
  .reverse()
  .slice(0, balancePreviewAnchors.length)
  .map((item, index) => ({ item, x: balancePreviewAnchors[index]![0], y: balancePreviewAnchors[index]![1], delay: index * 55 })))
const today = computed(() => new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))
const balanceCurrency = computed(() => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }))
const balanceTotal = computed(() => balanceMovements.value.reduce((sum, item) => sum + (item.tipo === 'ingreso' ? item.monto : -item.monto), 0))
const todayShort = computed(() => new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric' }).format(new Date()))
const greeting = computed(() => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
})
const initials = computed(() => (profile.name || 'Á').trim().slice(0, 2).toUpperCase())
const powerWord = computed(() => profile.profile?.palabraPoder?.trim() || 'Presencia')
const umbralEcho = computed(() => counts.value.umbral > 0 ? 'Tu día ya guarda algunas huellas.' : 'El día está en blanco. También es un lujo.')
const groupedNucleusThoughts = computed(() => groupNucleusThoughts(nucleusThoughts.value))
const nucleusEmotionClusters = computed(() => activeNucleusEmotionClusters(groupedNucleusThoughts.value))
const selectedNucleusThought = computed(() => nucleusThoughts.value.find((thought) => thought.id === selectedNucleusThoughtId.value) ?? null)
const selectedNucleusEmotion = computed(() => selectedNucleusThought.value ? nucleusEmotions[normalizeNucleusTone(selectedNucleusThought.value.tono)] : null)
const dayNumber = computed(() => {
  const date = new Date()
  const localDate = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
  let value = localDate.split('').reduce((sum, digit) => sum + Number(digit), 0)
  while (value > 9) value = String(value).split('').reduce((sum, digit) => sum + Number(digit), 0)
  return value
})
const arcana = ['El Mago', 'La Sacerdotisa', 'La Emperatriz', 'El Emperador', 'El Hierofante', 'Los Enamorados', 'El Carro', 'La Fuerza', 'El Ermitaño', 'La Rueda', 'La Justicia', 'El Colgado', 'La Muerte', 'La Templanza', 'El Diablo', 'La Torre', 'La Estrella', 'La Luna', 'El Sol', 'El Juicio', 'El Mundo', 'El Loco']
const localDateKey = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const card = computed(() => arcanaHistory.value.find((item) => item.fecha === localDateKey())?.nombre ?? arcana[(new Date().getDate() + new Date().getMonth()) % arcana.length]!)
const recentArcana = computed(() => [...arcanaHistory.value].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 14))
const lunarPhases = ['Luna nueva', 'Creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Menguante'] as const
const lunarPhaseIndex = computed(() => {
  const cycle = 29.53058867
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14)
  const days = (Date.now() - knownNewMoon) / 86_400_000
  return Math.floor(((((days % cycle) + cycle) % cycle) / cycle) * lunarPhases.length) % lunarPhases.length
})
const lunarPhase = computed(() => lunarPhases[lunarPhaseIndex.value]!)
const dailySign = computed(() => {
  const value = (new Date().getMonth() + 1) * 100 + new Date().getDate()
  if (value >= 321 && value <= 419) return 'Aries'
  if (value >= 420 && value <= 520) return 'Tauro'
  if (value >= 521 && value <= 620) return 'Géminis'
  if (value >= 621 && value <= 722) return 'Cáncer'
  if (value >= 723 && value <= 822) return 'Leo'
  if (value >= 823 && value <= 922) return 'Virgo'
  if (value >= 923 && value <= 1022) return 'Libra'
  if (value >= 1023 && value <= 1121) return 'Escorpio'
  if (value >= 1122 && value <= 1221) return 'Sagitario'
  if (value >= 1222 || value <= 119) return 'Capricornio'
  if (value <= 218) return 'Acuario'
  return 'Piscis'
})

function setAxis(id: AxisId) {
  selectedId.value = id
  sessionStorage.setItem('aureo_tailwind_axis', id)
}

function returnToTop(behavior: ScrollBehavior = 'smooth') {
  const resolvedBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : behavior
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: resolvedBehavior }))
}

function chooseAxis(id: AxisId) {
  goldenContemplative.value = false
  setAxis(id)
  activeDetail.value = null
  detailAction.value = ''
  selectedNucleusThoughtId.value = null
  if (route.name === 'laboratorio-tailwind') void router.replace({ name: 'laboratorio-tailwind', query: { axis: id } })
  returnToTop('auto')
}

watch(() => route.query.axis, (queryAxis) => {
  if (route.name !== 'laboratorio-tailwind' || typeof queryAxis !== 'string') return
  if (axes.some((axis) => axis.id === queryAxis)) setAxis(queryAxis as AxisId)
})

watch(() => route.query.detail, (queryDetail) => {
  activeDetail.value = typeof queryDetail === 'string' && detailIds.includes(queryDetail as DetailId) ? queryDetail as DetailId : null
  detailAction.value = typeof route.query.action === 'string' ? route.query.action : ''
})

function openDetail(detail: DetailId, action = '') {
  goldenContemplative.value = false
  selectedNucleusThoughtId.value = null
  activeDetail.value = detail
  detailAction.value = action
  void router.replace({ name: 'laboratorio-tailwind', query: { axis: selectedId.value, detail, ...(action ? { action } : {}) } })
  returnToTop()
}

async function openBalanceOverlay(kind: 'movement' | 'goal') {
  balanceOverlay.value = kind
  await nextTick()
  balanceOverlayDialog.value?.focus()
}

function closeBalanceOverlay() { balanceOverlay.value = null }

async function saveBalanceMovement() {
  if (balanceMovementForm.monto <= 0 || balanceSaving.value) return
  balanceSaving.value = true
  const now = new Date().toISOString()
  try {
    balanceMovements.value = await balanceMovementRepository.add({
      id: makeId(),
      ...balanceMovementForm,
      fecha: now,
      fecha_creacion: now,
    })
    balanceMovementForm.monto = 0
    balanceMovementForm.nota = ''
    closeBalanceOverlay()
    await refreshCounts()
  } finally { balanceSaving.value = false }
}

async function saveBalanceGoal() {
  const name = balanceGoalForm.nombre.trim()
  if (!name || balanceGoalForm.objetivo <= 0 || balanceSaving.value) return
  balanceSaving.value = true
  try {
    await balanceGoalRepository.add({
      id: makeId(),
      nombre: name,
      objetivo: balanceGoalForm.objetivo,
      acumulado: 0,
      color: balanceGoalForm.color,
      daruma_transferido: false,
      fecha_creacion: new Date().toISOString(),
    })
    balanceGoalForm.nombre = ''
    balanceGoalForm.objetivo = 0
    closeBalanceOverlay()
    await refreshCounts()
  } finally { balanceSaving.value = false }
}

function closeDetail() {
  goldenContemplative.value = false
  activeDetail.value = null
  detailAction.value = ''
  void router.replace({ name: 'laboratorio-tailwind', query: { axis: selectedId.value } })
  returnToTop()
}

async function collectionCount(keys: string[]) {
  const values = await Promise.all(keys.map((key) => storage.get<unknown[]>(key)))
  return values.reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0)
}

async function refreshCounts() {
  const worldEntries = await Promise.all(worlds.map(async (world) => {
    if (world.key === 'cuidado') return [world.key, await collectionCount(['companeros', 'plantas'])] as const
    return [world.key, await collectionCount([world.key])] as const
  }))
  worldCounts.value = Object.fromEntries(worldEntries)
  balanceMovements.value = (await storage.get<BalanceMovement[]>('balance_movimientos')) ?? []
  nucleusThoughts.value = (await storage.get<NucleusThought[]>('nucleo_pensamientos')) ?? []
  counts.value = {
    umbral: await collectionCount(['intenciones', 'pulso']),
    mundos: await collectionCount(['vinculos', 'companeros', 'plantas', 'decretos', 'hobbies', 'travesias']),
    balance: await collectionCount(['balance_movimientos', 'balance_darumas']),
    nucleo: nucleusThoughts.value.length,
    'edad-dorada': await collectionCount(['edad_dorada_declaraciones']),
  }
}

function nucleusThoughtDate(value: string) { return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }
const nucleusTimeBand = () => { const hour = new Date().getHours(); return hour >= 6 && hour < 12 ? 'dia' : hour < 20 ? 'tarde' : 'noche' }
function refreshNucleusAccess() {
  nucleusUnlocked.value = !profile.profile?.clave_app_hash || sessionStorage.getItem(`aureo_nucleo_${nucleusTimeBand()}`) === '1'
}
async function pressNucleusNote(note: string) {
  if (nucleusMelody.value.length >= 3) nucleusMelody.value = []
  nucleusMelody.value.push(note)
  if (nucleusMelody.value.length !== 3) return
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nucleusMelody.value.join('|')))
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
  if (hash === profile.profile?.clave_app_hash) {
    sessionStorage.setItem(`aureo_nucleo_${nucleusTimeBand()}`, '1')
    nucleusUnlocked.value = true
    nucleusError.value = ''
  } else {
    nucleusError.value = 'No es esa. Respira.'
    nucleusMelody.value = []
  }
}
async function openNucleusThought(id: string) { selectedNucleusThoughtId.value = id; await nextTick(); nucleusPreviewDialog.value?.focus() }
async function addNucleusThought() {
  const value = nucleusThoughtText.value.trim()
  if (!value || nucleusSaving.value) return
  nucleusSaving.value = true
  const now = new Date().toISOString()
  try {
    nucleusThoughts.value = await nucleusRepository.add({
      id: makeId(),
      texto: value,
      tono: recognizeNucleusTone(value),
      x: 12 + Math.random() * 76,
      y: 14 + Math.random() * 70,
      simbolo: Math.random() > .5 ? 'moon' : 'star',
      timestamp: now,
      fecha_creacion: now,
    })
    nucleusThoughtText.value = ''
    counts.value.nucleo = nucleusThoughts.value.length
  } finally {
    nucleusSaving.value = false
  }
}

async function addGoldenDeclaration() {
  const value = goldenDeclarationText.value.trim()
  if (!value || goldenSaving.value) return
  goldenSaving.value = true
  const now = new Date().toISOString()
  try {
    const declarations = await goldenRepository.add({ id: makeId(), texto: value, timestamp: now, fecha_creacion: now })
    goldenDeclarationText.value = ''
    counts.value['edad-dorada'] = declarations.length
    goldenSaved.value = true
  } finally {
    goldenSaving.value = false
  }
}

watch(goldenDeclarationText, (value) => { if (value.trim()) goldenSaved.value = false })
watch(() => profile.profile?.clave_app_hash, refreshNucleusAccess, { immediate: true })

onMounted(async () => {
  await refreshCounts()
  arcanaHistory.value = await arcanaRepository.all()
  if (!arcanaHistory.value.some((item) => item.fecha === localDateKey())) {
    arcanaHistory.value = await arcanaRepository.add({ id: `arcano-${localDateKey()}`, fecha: localDateKey(), nombre: card.value, fecha_creacion: new Date().toISOString() })
  }
  if (route.name === 'laboratorio-tailwind' && route.query.detail === 'nucleo') {
    await router.replace({ name: 'laboratorio-tailwind', query: { axis: 'nucleo' } })
  }
})
</script>

<template>
  <main class="tailwind-lab tw:min-h-svh tw:bg-noche tw:font-aureo tw:text-marfil tw:selection:bg-oro/30" :style="zodiacStyle" :data-zodiac="zodiacKey">
    <VueBitsLightRays v-if="selectedId === 'umbral' && !activeDetail" class-name="umbral-light-rays" color="#d8b977" :speed="0.38" :spread="1.8" :length="2.2" :pointer-influence=".012" :fps="24" :dpr="1.25" />
    <div class="aureo-app-frame tw:grid tw:min-h-svh tw:w-full tw:lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside v-if="!goldenContemplative" class="tw:hidden tw:border-r tw:border-oro/15 tw:bg-noche/95 tw:px-5 tw:py-8 tw:lg:sticky tw:lg:top-0 tw:lg:flex tw:lg:h-svh tw:lg:flex-col">
        <div class="tw:flex tw:items-center tw:gap-3 tw:px-2">
          <span class="aureo-lab-mark" aria-hidden="true"><span /></span>
          <div>
            <strong class="tw:block tw:text-2xl tw:font-light tw:leading-none tw:text-oro-claro">Áureo</strong>
            <span class="tw:mt-1 tw:block tw:font-sans tw:text-[0.68rem] tw:font-medium tw:text-marfil-suave">Tu universo personal</span>
          </div>
        </div>

        <nav class="desktop-axis-nav tw:mt-12 tw:grid tw:gap-1" aria-label="Ejes de Áureo">
          <button
            v-for="axis in axes"
            :key="axis.id"
            type="button"
            class="tw:group tw:relative tw:grid tw:min-h-12 tw:w-full tw:grid-cols-[2rem_1fr_auto] tw:items-center tw:gap-3 tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-3 tw:text-left tw:font-sans tw:text-sm tw:font-medium tw:text-marfil-suave tw:transition-colors tw:duration-200 tw:ease-aureo tw:hover:text-marfil"
            :class="selectedId === axis.id ? 'desktop-axis-active tw:text-oro-claro' : ''"
            :aria-pressed="selectedId === axis.id"
            @click="chooseAxis(axis.id)"
          >
            <span class="desktop-axis-icon tw:grid tw:size-8 tw:place-items-center tw:rounded-full"><AppIcon :name="axis.icon" class="tw:size-4" /></span>
            <span>{{ axis.label }}</span>
            <span v-if="counts[axis.id] > 0" class="tw:font-sans tw:text-xs tw:tabular-nums tw:text-marfil-suave" :aria-label="`${counts[axis.id]} registros`">{{ counts[axis.id] }}</span>
          </button>
        </nav>

        <div class="tw:mt-auto tw:border-t tw:border-oro/15 tw:pt-5">
          <div class="tw:flex tw:items-center tw:gap-3 tw:px-2">
            <span class="tw:grid tw:size-10 tw:place-items-center tw:rounded-full tw:bg-oro-claro tw:font-sans tw:text-xs tw:font-semibold tw:text-noche">{{ initials }}</span>
            <div class="tw:min-w-0">
              <strong class="tw:block tw:truncate tw:text-sm tw:font-light">{{ profile.name || 'Tu espacio' }}</strong>
              <span class="zodiac-profile-tone tw:flex tw:items-center tw:gap-1.5 tw:font-sans tw:text-[0.68rem] tw:text-marfil-suave"><i aria-hidden="true" />{{ zodiacLabel }} · tu matiz</span>
            </div>
          </div>
        </div>
      </aside>

      <div class="tw:min-w-0 tw:pb-[calc(6.5rem+env(safe-area-inset-bottom))] tw:lg:pb-0">
        <div class="aureo-content-shell tw:px-5 tw:py-5 tw:sm:px-8 tw:sm:py-10 tw:lg:py-12">
          <div class="aureo-content-width tw:mx-auto tw:w-full">
            <section aria-live="polite">
              <TailwindWorkspace v-if="activeDetail" :detail="activeDetail" :initial-action="detailAction" @close="closeDetail" @changed="refreshCounts" @contemplation="goldenContemplative = $event" />
              <div v-else class="axis-home-lab tw:relative tw:min-w-0">
                <div class="axis-heading-lab tw:flex tw:items-start tw:justify-between tw:gap-5 tw:pb-4" :class="`axis-heading-${selectedId}`">
                  <div>
                    <h1 v-if="['mundos', 'balance', 'nucleo', 'edad-dorada'].includes(selectedId)" class="tw:sr-only">{{ selected.label }}</h1>
                    <h1 v-else class="axis-welcome-title tw:mb-2 tw:max-w-none tw:text-balance tw:font-extralight tw:leading-[0.96] tw:tracking-[-0.03em] tw:text-marfil">{{ selectedId === 'umbral' ? greeting : selected.label }}<span v-if="selectedId === 'umbral' && profile.name">, {{ profile.name }}</span></h1>
                    <p class="tw:mb-0 tw:max-w-[48ch] tw:text-pretty tw:text-base tw:italic tw:leading-relaxed tw:text-marfil-suave tw:sm:text-lg">{{ selectedId === 'umbral' ? 'El día en números' : selected.phrase }}</p>
                  </div>
                  <div class="axis-heading-meta">
                    <time :datetime="new Date().toISOString().slice(0, 10)"><span class="axis-date-full">{{ today }}</span><span class="axis-date-short">{{ todayShort }}</span></time>
                    <span class="axis-sigil-lab tw:mt-1 tw:hidden tw:size-14 tw:shrink-0 tw:place-items-center tw:rounded-full tw:border tw:border-oro/25 tw:text-oro-claro tw:sm:grid">
                      <AppIcon :name="selected.icon" class="tw:size-6" />
                    </span>
                  </div>
                </div>

                <div class="ritual-stage-lab tw:relative tw:min-h-[16rem] tw:overflow-visible tw:sm:min-h-[25rem]">
                  <Transition name="axis-ritual">
                  <section v-if="selectedId === 'umbral'" key="umbral" class="tw:grid tw:min-h-[20rem] tw:place-items-center tw:p-6 tw:text-center tw:sm:min-h-[25rem]" aria-label="Umbral">
                    <div class="lab-celestial" aria-hidden="true">
                      <svg class="lab-constellation lab-constellation-one" viewBox="0 0 180 120" fill="none"><path d="M12 94 48 58 82 72 126 24 166 48"/><circle cx="12" cy="94" r="2.4"/><circle cx="48" cy="58" r="3"/><circle cx="82" cy="72" r="2.2"/><circle cx="126" cy="24" r="3.2"/><circle cx="166" cy="48" r="2.4"/></svg>
                      <svg class="lab-constellation lab-constellation-two" viewBox="0 0 130 120" fill="none"><path d="M10 30 42 52 68 18 88 70 120 96"/><circle cx="10" cy="30" r="2.2"/><circle cx="42" cy="52" r="2.8"/><circle cx="68" cy="18" r="2.2"/><circle cx="88" cy="70" r="3"/><circle cx="120" cy="96" r="2.4"/></svg>
                      <span class="lab-orbit lab-orbit-one" />
                      <span class="lab-orbit lab-orbit-two" />
                      <span class="lab-orbit lab-orbit-three" />
                    </div>
                    <button type="button" class="axis-entry-button tw:relative tw:z-10 tw:grid tw:size-32 tw:place-items-center tw:border-0 tw:bg-transparent" :aria-label="`Entrar al Umbral. Fase lunar: ${lunarPhase}`" @click="openDetail('umbral')">
                      <svg class="aureo-moon" viewBox="0 0 96 96" aria-hidden="true">
                        <defs>
                          <radialGradient id="aureo-moon-light" cx="34%" cy="28%" r="74%"><stop offset="0" stop-color="#fff8df"/><stop offset=".58" stop-color="#ead6a7"/><stop offset="1" stop-color="#9d7135"/></radialGradient>
                          <radialGradient id="aureo-moon-night" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#171d29"/><stop offset="1" stop-color="#080b11"/></radialGradient>
                          <clipPath id="aureo-moon-disc"><circle cx="48" cy="48" r="38"/></clipPath>
                        </defs>
                        <circle class="moon-atmosphere" cx="48" cy="48" r="43"/>
                        <g clip-path="url(#aureo-moon-disc)">
                          <circle class="moon-light" cx="48" cy="48" r="38"/>
                          <circle v-if="lunarPhaseIndex === 0" class="moon-shadow" cx="48" cy="48" r="39"/>
                          <circle v-else-if="lunarPhaseIndex === 1" class="moon-shadow" cx="37" cy="48" r="39"/>
                          <rect v-else-if="lunarPhaseIndex === 2" class="moon-shadow" x="8" y="8" width="40" height="80"/>
                          <ellipse v-else-if="lunarPhaseIndex === 3" class="moon-shadow" cx="22" cy="48" rx="17" ry="40"/>
                          <ellipse v-else-if="lunarPhaseIndex === 5" class="moon-shadow" cx="74" cy="48" rx="17" ry="40"/>
                          <rect v-else-if="lunarPhaseIndex === 6" class="moon-shadow" x="48" y="8" width="40" height="80"/>
                          <circle v-else-if="lunarPhaseIndex === 7" class="moon-shadow" cx="59" cy="48" r="39"/>
                          <path class="moon-markings" d="M31 36c5-7 13-10 20-9m-25 25c8 5 13 12 15 21m20-39c6 4 9 9 10 15M53 66c5-1 10-4 13-8"/>
                        </g>
                        <circle class="moon-rim" cx="48" cy="48" r="38"/>
                        <circle class="moon-orbit-point" cx="75" cy="22" r="2"/>
                      </svg>
                      <span class="moon-phase-label">{{ lunarPhase }}</span>
                    </button>
                    <dl class="umbral-orbit-data">
                      <div class="umbral-datum umbral-datum-number"><dt>Número</dt><dd>{{ dayNumber }}</dd></div>
                      <div class="umbral-datum umbral-datum-sign"><dt>Signo del día</dt><dd>{{ dailySign }}</dd></div>
                      <div class="umbral-datum umbral-datum-arcana">
                        <dt>Arcano</dt>
                        <dd class="tarot-reading">
                          <button type="button" class="tarot-open" :aria-expanded="showArcanaDeck" aria-controls="umbral-arcana-history" @click="showArcanaDeck = !showArcanaDeck">
                          <span class="tarot-deck" aria-hidden="true">
                            <span class="tarot-card tarot-card-back tarot-card-back-left"><span class="tarot-card-mark" /></span>
                            <span class="tarot-card tarot-card-back tarot-card-back-right"><span class="tarot-card-mark" /></span>
                            <span class="tarot-card tarot-card-face">
                              <svg viewBox="0 0 48 72" fill="none">
                                <rect x="5.5" y="5.5" width="37" height="61" rx="2.5" />
                                <path d="M11 36c4.4-7 8.8-10.5 13-10.5S32.6 29 37 36c-4.4 7-8.8 10.5-13 10.5S15.4 43 11 36Z" />
                                <circle cx="24" cy="36" r="4.5" />
                                <path d="M24 12v7m0 34v7M13 18l4.5 5m17.5-5-4.5 5" />
                              </svg>
                            </span>
                          </span>
                          <span class="tarot-card-name">{{ card }}</span>
                          <small>{{ showArcanaDeck ? 'Cerrar el mazo' : 'Abrir el mazo' }}</small>
                          </button>
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section v-else-if="selectedId === 'mundos'" key="mundos" class="worlds-stage-lab tw:grid tw:min-h-[20rem] tw:place-items-center tw:pt-8 tw:pb-3 tw:text-center tw:sm:min-h-[25rem]" aria-label="Mundos">
                    <svg class="world-flower-lab" viewBox="0 0 300 300" role="group" aria-label="Accesos a tus mundos">
                      <defs>
                        <radialGradient id="lab-petal-oro" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#f5e9c6"/><stop offset=".56" stop-color="#c9a86a"/><stop offset="1" stop-color="#805e27"/></radialGradient>
                        <radialGradient id="lab-petal-salvia" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#e3f0e8"/><stop offset=".56" stop-color="#7da797"/><stop offset="1" stop-color="#456457"/></radialGradient>
                        <radialGradient id="lab-petal-lavanda" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#e6e1f3"/><stop offset=".56" stop-color="#8173b7"/><stop offset="1" stop-color="#4e426f"/></radialGradient>
                        <radialGradient id="lab-petal-ciruela" cx="35%" cy="26%" r="78%"><stop offset="0" stop-color="#f0dcef"/><stop offset=".56" stop-color="#9b7d9b"/><stop offset="1" stop-color="#634a63"/></radialGradient>
                        <radialGradient id="lab-flower-core" cx="35%" cy="28%" r="70%"><stop offset="0" stop-color="#fff9e8"/><stop offset=".52" stop-color="#e8d29a"/><stop offset="1" stop-color="#9d7135"/></radialGradient>
                      </defs>
                      <ellipse class="lab-flower-shadow" cx="150" cy="166" rx="91" ry="46"/>
                      <g
                        v-for="(world, index) in worlds"
                        :key="world.key"
                        class="lab-world-petal"
                        :transform="`rotate(${world.angle} 150 150)`"
                        :style="{ '--petal-index': index }"
                        role="button"
                        :aria-label="`${world.label}, ${worldCounts[world.key] ?? 0} registros`"
                        tabindex="0"
                        @click="openDetail(world.detail)"
                        @keydown.enter.space.prevent="openDetail(world.detail)"
                      >
                        <ellipse class="lab-petal-shadow" cx="150" cy="83" rx="38" ry="66"/>
                        <ellipse class="lab-petal-surface" cx="150" cy="83" rx="38" ry="66" :fill="`url(#lab-petal-${world.gradient})`"/>
                        <text class="lab-petal-label" x="150" y="83" text-anchor="middle" transform="rotate(-90 150 83)">{{ world.label }}</text>
                      </g>
                      <circle class="lab-flower-core" cx="150" cy="150" r="31" fill="url(#lab-flower-core)"/>
                      <circle class="lab-flower-seed" cx="150" cy="150" r="10"/>
                    </svg>
                    <p class="tw:mb-0 tw:mt-[-1rem] tw:text-lg tw:italic tw:text-marfil-suave">Todo lo que ya es tuyo.</p>
                  </section>

                  <section v-else-if="selectedId === 'balance'" key="balance" class="balance-stage-lab tw:flex tw:min-h-[16rem] tw:flex-col tw:px-0 tw:pb-2 tw:sm:min-h-[25rem] tw:sm:px-8" aria-label="Mi Balance">
                    <div class="balance-field-lab tw:relative tw:flex tw:flex-1 tw:flex-col tw:justify-center tw:text-center">
                      <span class="balance-sky-ring balance-sky-ring-one" aria-hidden="true" />
                      <span class="balance-sky-ring balance-sky-ring-two" aria-hidden="true" />
                      <span class="balance-sky-ring balance-sky-ring-three" aria-hidden="true" />
                      <div class="balance-home-reading">
                        <button type="button" class="balance-home-value" aria-label="Lo que tengo hoy" @click="openDetail('balance')">
                          <span>Lo que tengo hoy</span>
                          <strong>{{ balanceCurrency.format(balanceTotal) }}</strong>
                        </button>
                        <p>Cada gasto abre una flor. Al tocarla, puedes recordar en qué elegiste usar tus recursos.</p>
                      </div>
                      <button type="button" class="axis-entry-button balance-tree-entry" :aria-label="`Abrir Mi Balance. ${balancePreviewFlowers.length} ${balancePreviewFlowers.length === 1 ? 'flor de gasto' : 'flores de gastos'}`" @click="openDetail('balance')">
                        <svg class="balance-home-tree" viewBox="0 0 720 560" aria-hidden="true">
                          <defs>
                            <linearGradient id="balance-home-trunk" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#342520" /><stop offset=".52" stop-color="#89614f" /><stop offset="1" stop-color="#c0987a" /></linearGradient>
                            <linearGradient id="balance-home-branch" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#5b4036" /><stop offset="1" stop-color="#b4876d" /></linearGradient>
                            <filter id="balance-home-depth" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="16" stdDeviation="15" flood-color="#000" flood-opacity=".36" /></filter>
                          </defs>
                          <ellipse class="balance-home-ground" cx="366" cy="522" rx="175" ry="17" />
                          <g filter="url(#balance-home-depth)">
                            <path class="balance-home-trunk" d="M328 516C339 462 333 409 349 352C365 296 372 253 356 202C348 176 356 151 371 126C363 180 394 205 389 257C384 309 369 347 382 399C394 447 391 487 407 516Z" />
                            <path class="balance-home-trunk-light" d="M356 493C359 430 350 385 367 334C384 281 386 231 371 184C393 225 398 273 382 326C366 378 382 435 385 493Z" />
                            <path class="balance-home-branch branch-one" d="M366 319C322 278 282 257 223 246C168 236 130 208 97 171" />
                            <path class="balance-home-branch branch-two" d="M361 271C313 235 287 199 259 154C241 124 211 102 169 87" />
                            <path class="balance-home-branch branch-three" d="M376 284C424 235 463 216 518 203C567 191 608 160 644 120" />
                            <path class="balance-home-branch branch-four" d="M381 346C431 311 480 302 537 310C589 317 626 298 668 265" />
                            <path class="balance-home-branch branch-five" d="M371 226C406 181 428 142 446 91" />
                            <path class="balance-home-twig" d="M222 246L179 293M283 201L307 150M518 203L548 151M537 310L572 354M446 91L499 69M169 87L122 103" />
                            <path class="balance-home-pot" d="M291 503h150l-13 42H304Z" /><path class="balance-home-pot-rim" d="M282 494h168v16H282Z" />
                          </g>
                        </svg>
                        <span v-for="flower in balancePreviewFlowers" :key="flower.item.id" class="balance-home-blossom" :style="{ left: `${flower.x}%`, top: `${flower.y}%`, '--flower-delay': `${flower.delay}ms` }" aria-hidden="true"><i v-for="petal in 5" :key="petal" :style="{ '--petal': petal }" /><b /></span>
                        <span v-if="!balancePreviewFlowers.length" class="balance-home-empty">Tu cerezo espera su primera flor.</span>
                        <span v-else class="balance-home-count">{{ balancePreviewFlowers.length }} {{ balancePreviewFlowers.length === 1 ? 'gasto florece' : 'gastos florecen' }} en tu árbol</span>
                      </button>
                    </div>
                    <div class="tw:grid tw:grid-cols-2 tw:gap-3 tw:border-t tw:border-linea tw:pt-5">
                      <button type="button" class="tw:flex tw:h-14 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-xl tw:border tw:border-oro tw:bg-oro/14 tw:px-2 tw:font-sans tw:text-xs tw:font-semibold tw:text-oro-claro tw:transition-[background-color,transform] tw:duration-200 tw:ease-aureo tw:hover:bg-oro/22 tw:active:scale-[0.985] tw:sm:px-5 tw:sm:text-sm" @click="openBalanceOverlay('movement')">
                        <AppIcon name="plus" class="tw:size-4" />
                        Registrar movimiento
                      </button>
                      <button type="button" class="tw:flex tw:h-14 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-xl tw:border tw:border-oro/35 tw:bg-transparent tw:px-2 tw:font-sans tw:text-xs tw:font-semibold tw:text-marfil tw:transition-[border-color,transform] tw:duration-200 tw:ease-aureo tw:hover:border-oro tw:active:scale-[0.985] tw:sm:px-5 tw:sm:text-sm" @click="openBalanceOverlay('goal')">
                        <AppIcon name="star" class="tw:size-4" />
                        Nueva meta
                      </button>
                    </div>
                    <Teleport to="body">
                      <Transition name="balance-overlay">
                        <div v-if="balanceOverlay" class="balance-overlay-layer" role="presentation" @click.self="closeBalanceOverlay" @keydown.esc.stop="closeBalanceOverlay">
                        <section ref="balanceOverlayDialog" class="balance-overlay-sheet" tabindex="-1" role="dialog" aria-modal="true" :aria-labelledby="balanceOverlay === 'movement' ? 'balance-movement-title' : 'balance-goal-title'">
                          <header><div><AppIcon :name="balanceOverlay === 'movement' ? 'balance' : 'star'" /><h2 :id="balanceOverlay === 'movement' ? 'balance-movement-title' : 'balance-goal-title'">{{ balanceOverlay === 'movement' ? 'Registrar movimiento' : 'Crear una meta' }}</h2></div><button type="button" :aria-label="balanceOverlay === 'movement' ? 'Cerrar registro de movimiento' : 'Cerrar nueva meta'" @click="closeBalanceOverlay"><AppIcon name="close" /></button></header>
                          <form v-if="balanceOverlay === 'movement'" class="balance-overlay-form" @submit.prevent="saveBalanceMovement">
                            <fieldset class="balance-kind-choice"><legend>¿Cómo se mueve?</legend><button type="button" :class="{ active: balanceMovementForm.tipo === 'ingreso' }" @click="balanceMovementForm.tipo = 'ingreso'">Entra</button><button type="button" :class="{ active: balanceMovementForm.tipo === 'gasto' }" @click="balanceMovementForm.tipo = 'gasto'">Sale</button></fieldset>
                            <label for="balance-home-amount">Monto<input id="balance-home-amount" v-model.number="balanceMovementForm.monto" type="number" min="1" inputmode="decimal" required autofocus /></label>
                            <label for="balance-home-category">Categoría<select id="balance-home-category" v-model="balanceMovementForm.categoria"><option v-for="category in balanceCategories" :key="category">{{ category }}</option></select></label>
                             <label for="balance-home-note">Una nota, si la necesitas<input id="balance-home-note" v-model="balanceMovementForm.nota" maxlength="160" /></label>
                             <label class="balance-home-recurring"><input v-model="balanceMovementForm.recurrente" type="checkbox" /> Es un movimiento fijo mensual</label>
                            <button class="balance-overlay-save" type="submit" :disabled="balanceMovementForm.monto <= 0 || balanceSaving">{{ balanceSaving ? 'Guardando…' : 'Guardar movimiento' }}</button>
                          </form>
                          <form v-else class="balance-overlay-form" @submit.prevent="saveBalanceGoal">
                            <label for="balance-home-goal">¿Qué estás construyendo?<input id="balance-home-goal" v-model="balanceGoalForm.nombre" required maxlength="120" autofocus /></label>
                            <label for="balance-home-target">Meta<input id="balance-home-target" v-model.number="balanceGoalForm.objetivo" type="number" min="1" inputmode="decimal" required /></label>
                            <fieldset class="balance-color-choice"><legend>El color que la acompaña</legend><button v-for="color in balanceGoalColors" :key="color.value" type="button" :style="{ '--goal-color': color.value }" :class="{ selected: balanceGoalForm.color === color.value }" :aria-label="color.name" :title="color.name" @click="balanceGoalForm.color = color.value" /></fieldset>
                            <button class="balance-overlay-save" type="submit" :disabled="!balanceGoalForm.nombre.trim() || balanceGoalForm.objetivo <= 0 || balanceSaving">{{ balanceSaving ? 'Guardando…' : 'Crear meta' }}</button>
                          </form>
                          </section>
                        </div>
                      </Transition>
                    </Teleport>
                  </section>

                  <section v-else-if="selectedId === 'nucleo'" key="nucleo" class="nucleus-home-lab tw:grid tw:min-h-[20rem] tw:w-full tw:place-items-center tw:gap-7 tw:py-3 tw:sm:min-h-[25rem]" aria-label="Núcleo">
                    <section v-if="!nucleusUnlocked" class="nucleus-home-gate" aria-label="Acceso a Núcleo">
                      <AppIcon name="moon" />
                      <h2>Tu sanctum</h2>
                      <p>Toca tu melodía para entrar.</p>
                      <div class="nucleus-home-progress" aria-label="Notas ingresadas"><span v-for="index in 3" :key="index" :class="{ filled: nucleusMelody[index - 1] }" /></div>
                      <div class="nucleus-home-notes"><button v-for="note in notes" :key="note" type="button" @click="pressNucleusNote(note)">{{ note }}</button></div>
                      <p v-if="nucleusError" class="nucleus-home-error" role="alert">{{ nucleusError }}</p>
                    </section>
                    <template v-else>
                    <div class="nucleus-cloth-lab tw:relative tw:grid tw:aspect-square tw:w-full tw:max-w-[29rem] tw:place-items-center tw:overflow-hidden tw:px-8 tw:text-center">
                      <span class="nucleus-thread" aria-hidden="true" />
                      <span v-if="nucleusEmotionClusters.length" class="nucleus-preview-plasma" aria-hidden="true"><span v-for="emotion in nucleusEmotionClusters" :key="emotion.tone" class="nucleus-preview-pool" :style="{ left: `${emotion.x}%`, top: `${emotion.y}%`, '--emotion-color': emotion.color, '--plasma-index': emotion.index }" /></span>
                      <span v-for="index in groupedNucleusThoughts.length ? 0 : 3" :key="`empty-${index}`" class="nucleus-light-lab" :style="{ '--light': index }" aria-hidden="true" />
                      <button v-for="entry in groupedNucleusThoughts" :key="entry.thought.id" type="button" class="nucleus-preview-point" :style="{ left: `${entry.x}%`, top: `${entry.y}%`, '--thought-color': entry.emotion.color, '--thought-index': entry.index }" :aria-label="`Abrir ${entry.emotion.label.toLowerCase()}: ${entry.thought.texto}`" @click="openNucleusThought(entry.thought.id)"><span /></button>
                      <div class="nucleus-entry-core tw:relative tw:z-10">
                        <AppIcon name="moon" class="tw:mx-auto tw:size-12 tw:text-cosmos" />
                        <h2 class="tw:mt-6 tw:mb-3 tw:text-3xl tw:font-extralight">Solo aquí</h2>
                        <p class="tw:mx-auto tw:mb-0 tw:max-w-[34ch] tw:leading-relaxed tw:text-marfil-suave">Tus pensamientos de Núcleo no salen del dispositivo ni entran en la sincronización.</p>
                      </div>
                    </div>
                    <form class="nucleus-capture-lab" @submit.prevent="addNucleusThought">
                      <label for="nucleus-thought">Escríbelo. Nadie más lo verá.</label>
                      <textarea id="nucleus-thought" v-model="nucleusThoughtText" rows="3" maxlength="1200" placeholder="Escribe lo que aparece…" />
                      <button v-if="nucleusThoughtText.trim()" type="submit" :disabled="nucleusSaving">{{ nucleusSaving ? 'Guardando…' : 'Dejarlo aquí' }}</button>
                    </form>
                    <Transition name="nucleus-preview-card"><div v-if="selectedNucleusThought && selectedNucleusEmotion" ref="nucleusPreviewDialog" class="nucleus-preview-layer" tabindex="-1" role="presentation" @click.self="selectedNucleusThoughtId = null" @keydown.esc.stop="selectedNucleusThoughtId = null"><article class="nucleus-preview-reading" role="dialog" aria-modal="true" aria-label="Pensamiento de Núcleo" :style="{ '--thought-color': selectedNucleusEmotion.color }"><header><div><span aria-hidden="true" /><strong>{{ selectedNucleusEmotion.label }}</strong><time>{{ nucleusThoughtDate(selectedNucleusThought.timestamp) }}</time></div><button type="button" aria-label="Cerrar pensamiento" @click="selectedNucleusThoughtId = null"><AppIcon name="close" /></button></header><AppIcon :name="selectedNucleusThought.simbolo" /><p>{{ selectedNucleusThought.texto }}</p></article></div></Transition>
                    </template>
                  </section>

                  <section v-else key="edad-dorada" class="golden-daruma-home tw:min-h-[20rem] tw:py-3 tw:sm:min-h-[25rem]" aria-label="Edad Dorada">
                    <button type="button" class="axis-entry-button golden-daruma-entry" aria-label="Contemplar mis grietas" @click="openDetail('edad-dorada')">
                      <span class="golden-daruma-entry-art" aria-hidden="true">
                        <span class="golden-daruma-entry-aura" />
                        <svg viewBox="0 0 360 450">
                          <defs>
                            <radialGradient id="preview-daruma-body-gradient" cx="35%" cy="22%" r="82%"><stop offset="0" stop-color="#f4efe5" stop-opacity=".22" /><stop offset=".22" stop-color="var(--sign-color)" stop-opacity=".72" /><stop offset=".62" stop-color="#11151d" /><stop offset="1" stop-color="#05070b" /></radialGradient>
                            <radialGradient id="preview-daruma-face-gradient" cx="46%" cy="34%" r="74%"><stop offset="0" stop-color="#fff8e5" /><stop offset=".7" stop-color="#d9c494" /><stop offset="1" stop-color="#8e7240" /></radialGradient>
                            <linearGradient id="preview-daruma-gold-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4c9" /><stop offset=".45" stop-color="#c9a86a" /><stop offset="1" stop-color="#7c5b27" /></linearGradient>
                            <clipPath id="preview-daruma-body-clip"><path d="M180 18C108 18 72 67 74 130C34 177 34 294 61 374C81 433 279 433 299 374C326 294 326 177 286 130C288 67 252 18 180 18Z" /></clipPath>
                          </defs>
                          <ellipse class="golden-daruma-entry-ground" cx="180" cy="423" rx="108" ry="14" />
                          <g class="golden-daruma-entry-form">
                            <path class="golden-daruma-entry-body" d="M180 18C108 18 72 67 74 130C34 177 34 294 61 374C81 433 279 433 299 374C326 294 326 177 286 130C288 67 252 18 180 18Z" />
                            <path class="golden-daruma-entry-sheen" d="M101 103C69 173 69 306 98 367C114 400 132 411 145 415C106 405 78 391 66 363C39 296 42 197 78 143C82 125 89 112 101 103Z" />
                            <path class="golden-daruma-entry-face" d="M105 75C126 48 234 48 255 75C278 104 263 192 236 207C211 221 149 221 124 207C97 192 82 104 105 75Z" />
                            <path class="golden-daruma-entry-ink" d="M119 112C136 95 155 94 169 106M241 112C224 95 205 94 191 106" />
                            <circle class="golden-daruma-entry-eye-rim" cx="142" cy="132" r="23" /><circle class="golden-daruma-entry-eye-rim" cx="218" cy="132" r="23" />
                            <circle class="golden-daruma-entry-eye" cx="142" cy="132" r="8" /><circle class="golden-daruma-entry-eye" cx="218" cy="132" r="8" />
                            <path class="golden-daruma-entry-nose" d="M180 131C172 147 171 157 180 162C189 157 188 147 180 131Z" />
                            <path class="golden-daruma-entry-ink" d="M178 171C159 159 137 165 122 183C143 175 160 180 178 190M182 171C201 159 223 165 238 183C217 175 200 180 182 190" />
                            <path class="golden-daruma-entry-seal" d="M117 249C137 221 223 221 243 249C260 274 256 347 228 372C207 391 153 391 132 372C104 347 100 274 117 249Z" />
                            <g clip-path="url(#preview-daruma-body-clip)"><path v-for="(crack, index) in goldenPreviewCracks" :key="index" class="golden-daruma-entry-crack" :d="crack.d" /></g>
                          </g>
                        </svg>
                      </span>
                      <span class="golden-daruma-entry-copy">
                        <strong>Ya está ocurriendo</strong>
                        <span>{{ goldenPreviewCracks.length ? 'Cada grieta guarda un momento.' : 'La primera grieta comienza aquí.' }}</span>
                      </span>
                    </button>
                    <div class="golden-daruma-practice">
                      <form class="golden-daruma-capture" @submit.prevent="addGoldenDeclaration">
                        <label for="golden-declaration-home">¿Qué reconoces hoy?</label>
                        <textarea id="golden-declaration-home" v-model="goldenDeclarationText" rows="4" maxlength="1200" placeholder="Declara este momento…" />
                        <button v-if="goldenDeclarationText.trim()" type="submit" :disabled="goldenSaving">{{ goldenSaving ? 'Formando…' : 'Formar una grieta' }}</button>
                      </form>
                      <p v-if="goldenSaved" class="golden-daruma-saved" role="status"><AppIcon name="star" /> Una nueva grieta guarda este momento.</p>
                      <button type="button" class="golden-daruma-contemplate" @click="openDetail('edad-dorada')">Contemplar mis grietas</button>
                    </div>
                  </section>
                  </Transition>
                </div>

                <section v-if="selectedId === 'umbral'" class="umbral-threshold-notes" aria-label="Tu día en Umbral">
                  <div v-if="showArcanaDeck" id="umbral-arcana-history" class="arcana-history">
                    <h2>Tu mazo diario</h2>
                    <ol><li v-for="item in recentArcana" :key="item.id"><time :datetime="item.fecha">{{ new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(`${item.fecha}T12:00:00`)) }}</time><strong>{{ item.nombre }}</strong></li></ol>
                  </div>
                  <button type="button" @click="openDetail('umbral')">
                    <span class="threshold-symbol"><AppIcon name="decree" /></span>
                    <span><small>Palabra de poder</small><strong>{{ powerWord }}</strong></span>
                  </button>
                  <button type="button" @click="openDetail('umbral')">
                    <span class="threshold-symbol"><AppIcon name="star" /></span>
                    <span><small>Lo que tengo en mente hoy</small><strong>{{ umbralEcho }}</strong></span>
                  </button>
                </section>

              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <nav v-if="!goldenContemplative" class="lab-mobile-nav tw:fixed tw:bottom-0 tw:z-40 tw:grid tw:grid-cols-5 tw:border-t tw:border-oro/20 tw:bg-noche/95 tw:px-1 tw:pt-1 tw:pb-[calc(0.35rem+env(safe-area-inset-bottom))] tw:backdrop-blur-xl tw:lg:hidden" aria-label="Ejes de Áureo">
      <button
        v-for="axis in axes"
        :key="`mobile-${axis.id}`"
        type="button"
        class="tw:relative tw:grid tw:min-h-16 tw:min-w-0 tw:place-content-center tw:gap-1 tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-1 tw:font-sans tw:text-[0.62rem] tw:font-medium tw:text-marfil-suave"
        :class="selectedId === axis.id ? 'mobile-axis-active tw:text-oro-claro' : ''"
        :aria-label="axis.label"
        :aria-pressed="selectedId === axis.id"
        @click="chooseAxis(axis.id)"
      >
        <span class="mobile-axis-icon tw:mx-auto tw:grid tw:size-8 tw:place-items-center tw:rounded-full"><AppIcon :name="axis.icon" class="tw:size-5" /></span>
        <span class="tw:truncate">{{ axis.label }}</span>
      </button>
    </nav>
  </main>
</template>

<style scoped>
.tailwind-lab {
  --lab-gold: #c9a86a;
  --zodiac-color: #b86b56;
  max-width: 100vw;
  overflow-x: clip;
  accent-color: var(--lab-gold);
  caret-color: #ead6a7;
  scrollbar-color: rgba(201,168,106,.55) #080b11;
  background:
    radial-gradient(circle at 7% 23%, rgba(234,214,167,.45) 0 1px, transparent 1.5px),
    radial-gradient(circle at 23% 72%, rgba(129,115,183,.42) 0 1px, transparent 1.6px),
    radial-gradient(circle at 42% 14%, rgba(244,239,229,.4) 0 1px, transparent 1.5px),
    radial-gradient(circle at 61% 68%, rgba(201,168,106,.4) 0 1px, transparent 1.6px),
    radial-gradient(circle at 79% 29%, rgba(244,239,229,.34) 0 1px, transparent 1.5px),
    radial-gradient(circle at 93% 58%, rgba(129,115,183,.42) 0 1px, transparent 1.6px),
    radial-gradient(circle at 82% 8%, color-mix(in srgb,var(--zodiac-color) 12%,transparent), transparent 28rem),
    radial-gradient(circle at 18% 84%, rgba(129, 115, 183, .07), transparent 30rem),
    radial-gradient(circle at 47% 48%, color-mix(in srgb,var(--zodiac-color) 4%,transparent), transparent 34rem),
    #080b11;
  background-attachment: fixed;
}
.tailwind-lab:is(.app-forward-enter-active,.app-back-enter-active,.app-forward-enter-from,.app-back-enter-from,.app-forward-enter-to,.app-back-enter-to) { transform: none !important; }
.tailwind-lab * { scrollbar-width: thin; }
.tailwind-lab *::-webkit-scrollbar { width: 10px; height: 10px; }
.tailwind-lab *::-webkit-scrollbar-track { background: #080b11; }
.tailwind-lab *::-webkit-scrollbar-thumb { border: 3px solid #080b11; border-radius: 999px; background: rgba(201,168,106,.55); }

.aureo-lab-mark { position: relative; display: block; width: 42px; height: 42px; flex: 0 0 auto; border: 1px solid var(--lab-gold); border-radius: 50%; }
.aureo-lab-mark::before { content: ''; position: absolute; inset: 9px; border: 1px solid var(--zodiac-color); border-radius: 50%; }
.aureo-lab-mark span { position: absolute; inset: 17px; border-radius: 50%; background: #c9a86a; box-shadow:0 0 12px color-mix(in srgb,var(--zodiac-color) 54%,transparent); }
.zodiac-profile-tone i { display:block; width:.45rem; aspect-ratio:1; flex:0 0 auto; border:1px solid rgba(234,214,167,.58); border-radius:50%; background:var(--zodiac-color); }

.tailwind-lab :is(button, a):focus-visible { outline: 2px solid #ead6a7 !important; outline-offset: 3px; box-shadow:0 0 0 1px var(--zodiac-color); }
.axis-entry-button { color: inherit; font: inherit; cursor: pointer; transition: filter 220ms cubic-bezier(.23,1,.32,1); }
.axis-entry-button:hover { filter: brightness(1.08); }
.aureo-moon { width: 4.8rem; height: 4.8rem; transform: translateY(-.4rem); overflow: visible; filter: drop-shadow(0 12px 24px rgba(0,0,0,.38)); }
.moon-atmosphere { fill: none; stroke: rgba(201,168,106,.16); stroke-width: 1; stroke-dasharray: 2 7; transform-origin: 48px 48px; animation: moon-atmosphere-turn 18s linear infinite; }
.moon-light { fill: url(#aureo-moon-light); }
.moon-shadow { fill: url(#aureo-moon-night); }
.moon-markings { fill: none; stroke: rgba(128,94,39,.34); stroke-width: 1.15; stroke-linecap: round; }
.moon-rim { fill: none; stroke: rgba(234,214,167,.72); stroke-width: 1.1; }
.moon-orbit-point { fill: #ead6a7; filter: drop-shadow(0 0 5px #c9a86a); }
.moon-phase-label { position: absolute; top: 72%; max-width: 7rem; color: #b9b3aa; font: 600 .58rem/1.25 system-ui,sans-serif; letter-spacing: .09em; text-transform: uppercase; text-wrap: balance; }
@keyframes moon-atmosphere-turn { to { transform: rotate(360deg); } }
.mobile-axis-active::after { content: ''; position: absolute; left: 50%; bottom: .15rem; width: 5px; height: 5px; border:1px solid #ead6a7; border-radius: 50%; background:var(--zodiac-color); transform: translateX(-50%); }
.desktop-axis-nav button::before { content: ''; position: absolute; left: 0; width: 1px; height: 1.25rem; border-radius: 999px; background: transparent; transform: scaleY(.4); transition: background-color 220ms cubic-bezier(.23,1,.32,1), transform 220ms cubic-bezier(.23,1,.32,1); }
.desktop-axis-nav button:hover .desktop-axis-icon { color: #ead6a7; background: rgba(201,168,106,.07); }
.desktop-axis-active::before { background:linear-gradient(#c9a86a,var(--zodiac-color)) !important; transform: scaleY(1) !important; }
.desktop-axis-icon { border: 1px solid transparent; transition: color 220ms cubic-bezier(.23,1,.32,1), background-color 220ms cubic-bezier(.23,1,.32,1), border-color 220ms cubic-bezier(.23,1,.32,1); }
.desktop-axis-active .desktop-axis-icon { border-color:color-mix(in srgb,var(--zodiac-color) 58%,#c9a86a); background:color-mix(in srgb,var(--zodiac-color) 10%,transparent); }
.lab-mobile-nav button:focus-visible { outline: none !important; }
.lab-mobile-nav { left: 50% !important; right: auto !important; width: calc(100vw - .75rem); max-width: 45rem; box-sizing: border-box; border-inline: 1px solid rgba(201,168,106,.2); border-radius: 18px 18px 0 0; transform: translateX(-50%); box-shadow: 0 -18px 46px rgba(0,0,0,.34); }
.lab-mobile-nav button:focus-visible .mobile-axis-icon { box-shadow: 0 0 0 2px #080b11, 0 0 0 4px #ead6a7; }
.mobile-axis-icon { border: 1px solid transparent; transition: color 180ms cubic-bezier(.23,1,.32,1), background-color 180ms cubic-bezier(.23,1,.32,1), border-color 180ms cubic-bezier(.23,1,.32,1); }
.mobile-axis-active .mobile-axis-icon { border-color:color-mix(in srgb,var(--zodiac-color) 58%,#c9a86a); background:color-mix(in srgb,var(--zodiac-color) 10%,transparent); }

.axis-heading-lab { position: relative; animation: axis-heading-in 420ms cubic-bezier(.23,1,.32,1) both; }
.axis-welcome-title { font-size:clamp(2.65rem,7vw,5.6rem); }
.axis-heading-lab::after { content: ''; position: absolute; left: 0; bottom: 0; width: 4.5rem; height: 1px; background:linear-gradient(90deg,#c9a86a 0 42%,var(--zodiac-color) 68%,transparent); }
.axis-heading-lab>div:first-child { min-width: 0; }
.axis-heading-meta { display: grid; flex: 0 0 auto; justify-items: end; gap: 1rem; text-align: right; }
.axis-heading-meta time { color: #b9b3aa; font: 500 .68rem/1.35 system-ui,sans-serif; white-space: nowrap; }
.axis-date-short { display: none; }
.axis-sigil-lab { border-color:color-mix(in srgb,var(--zodiac-color) 42%,#c9a86a) !important; background:color-mix(in srgb,var(--zodiac-color) 7%,transparent); box-shadow:0 14px 34px rgba(0,0,0,.2),inset 0 0 0 1px rgba(201,168,106,.06); }
.ritual-stage-lab { display:grid; isolation: isolate; min-height:clamp(26rem,56svh,44rem); }
.ritual-stage-lab > section { min-height:0 !important; }
@keyframes axis-heading-in { from { opacity: .65; transform: translateY(6px); } }
.axis-ritual-enter-active { transition: opacity 160ms cubic-bezier(.23,1,.32,1); }
.ritual-stage-lab > .axis-ritual-leave-active { position:absolute; z-index:2; inset:0 0 auto; width:100%; pointer-events:none; transition:opacity 120ms ease-out; }
.axis-ritual-enter-from { opacity: .55; }
.axis-ritual-leave-to { opacity: 0; }

.balance-stage-lab { position: relative; }
.balance-field-lab { isolation:isolate; min-height:26rem; perspective:700px; transform-style:preserve-3d; }
.balance-field-lab::before { content:''; position:absolute; inset:3% 0 2%; z-index:-2; background:radial-gradient(circle at 50% 34%,rgba(233,182,198,.1),transparent 20%),radial-gradient(circle at 60% 40%,color-mix(in srgb,var(--zodiac-color) 10%,transparent),transparent 44%); mask-image:linear-gradient(to bottom,transparent,#000 12%,#000 88%,transparent); }
.balance-sky-ring { position:absolute; z-index:-1; left:50%; top:44%; border:1px solid rgba(201,168,106,.23); border-radius:50%; transform:translate(-50%,-50%) rotateX(68deg) rotateZ(-12deg); filter:drop-shadow(0 12px 20px rgba(0,0,0,.18)); animation:balance-sky-turn 16s linear infinite; }
.balance-sky-ring-one { width:23rem; height:23rem; }
.balance-sky-ring-two { width:33rem; height:33rem; border-color:color-mix(in srgb,var(--zodiac-color) 32%,transparent); animation-duration:24s; animation-direction:reverse; }
.balance-sky-ring-three { width:43rem; height:43rem; border-color:rgba(201,168,106,.09); animation-duration:34s; }
.balance-tree-entry { position:relative; display:block; width:min(100%,40rem); aspect-ratio:720/560; margin-inline:auto; padding:0; overflow:visible; border:0; border-radius:0; background:transparent; color:#f4efe5; cursor:pointer; }
.balance-home-reading { position:relative; z-index:6; margin-bottom:.75rem; }
.balance-home-value { display:grid; gap:.35rem; margin-inline:auto; border:0; background:transparent; color:#f4efe5; cursor:pointer; }
.balance-home-value span { color:#b9b3aa; font:600 .68rem/1 system-ui,sans-serif; text-transform:uppercase; letter-spacing:.1em; }
.balance-home-value strong { color:#ead6a7; font-size:clamp(2.1rem,7vw,3rem); font-weight:200; font-variant-numeric:tabular-nums; }
.balance-home-reading p { max-width:40ch; margin:.9rem auto 0; color:#b9b3aa; font-style:italic; line-height:1.55; }
.balance-tree-entry:focus-visible { outline:2px solid #ead6a7; outline-offset:5px; }
.balance-home-tree { position:absolute; inset:0; width:100%; height:100%; overflow:visible; transition:filter 220ms ease,transform 420ms cubic-bezier(.16,1,.3,1); }
.balance-home-pot{fill:#30241f;stroke:#c0987a;stroke-width:2}.balance-home-pot-rim{fill:#563b30;stroke:#d0a185;stroke-width:2}
.balance-tree-entry:is(:hover,:focus-visible) .balance-home-tree { filter:brightness(1.08); transform:translateY(-.25rem); }
.balance-home-ground { fill:rgba(0,0,0,.42); filter:blur(8px); }
.balance-home-trunk { fill:url(#balance-home-trunk); stroke:rgba(234,214,167,.18); stroke-width:1; }
.balance-home-trunk-light { fill:rgba(244,218,198,.1); }
.balance-home-branch,.balance-home-twig { fill:none; stroke:url(#balance-home-branch); stroke-linecap:round; stroke-linejoin:round; }
.balance-home-branch { stroke-width:13; }.balance-home-twig { stroke-width:5; }.balance-home-tree .branch-two,.balance-home-tree .branch-five { stroke-width:9; }.balance-home-tree .branch-four { stroke-width:11; }
.privacy-seal-lab { position:absolute; z-index:5; left:50%; top:19%; width:max-content; padding:5px 10px; border:1px solid rgba(125,167,151,.54); border-radius:999px; background:#171d29; color:#c4dfd5; box-shadow:0 8px 20px rgba(0,0,0,.3); font:700 .56rem/1 system-ui,sans-serif; letter-spacing:.08em; text-transform:uppercase; transform:translateX(-50%); }
.balance-home-blossom { position:absolute; z-index:3; width:28px; height:28px; opacity:0; filter:blur(4px); transform:translate(-50%,-50%); animation:balance-home-bloom 560ms var(--flower-delay) cubic-bezier(.16,1,.3,1) forwards; }
.balance-home-blossom i { position:absolute; left:8px; top:1px; width:11px; height:15px; border-radius:70% 70% 58% 58%; background:linear-gradient(155deg,#fff0f2,#e9b6c6 58%,#b9788d); box-shadow:0 5px 12px rgba(32,11,20,.2); transform:rotate(calc((var(--petal) - 1) * 72deg)) translateY(-5px); transform-origin:5.5px 12px; }
.balance-home-blossom b { position:absolute; left:11px; top:11px; width:6px; height:6px; border-radius:50%; background:#d6aa68; box-shadow:0 2px 7px rgba(214,170,104,.45); }
.balance-home-empty,.balance-home-count { position:absolute; z-index:4; left:50%; bottom:2%; width:max-content; max-width:80%; color:#aaa197; font:500 .7rem/1.4 system-ui,sans-serif; letter-spacing:.03em; transform:translateX(-50%); }
.balance-home-empty { bottom:7%; color:#c5bcb1; font-family:Georgia,'Times New Roman',serif; font-size:.9rem; font-style:italic; letter-spacing:0; }
.balance-overlay-layer { position:fixed; z-index:80; inset:0; display:grid; place-items:center; padding:clamp(1rem,4vw,2.5rem); background:rgba(4,6,10,.72); backdrop-filter:blur(9px); }
.balance-overlay-sheet { position:relative; width:min(100%,34rem); max-height:min(43rem,calc(100svh - 2rem)); box-sizing:border-box; overflow:auto; padding:clamp(1.25rem,4vw,2rem); border:1px solid rgba(201,168,106,.3); border-radius:16px; outline:0; background:radial-gradient(circle at 92% 2%,rgba(233,182,198,.1),transparent 32%),#0d121b; box-shadow:0 28px 80px rgba(0,0,0,.58); }
.balance-home-recurring{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center}.balance-home-recurring input{width:20px!important;min-height:20px!important}
.balance-overlay-sheet::before { content:''; position:absolute; inset:0 auto 0 0; width:1px; background:linear-gradient(transparent,#c9a86a,transparent); }
.balance-overlay-sheet>header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.75rem; }
.balance-overlay-sheet>header>div { display:flex; align-items:center; gap:.8rem; min-width:0; }.balance-overlay-sheet>header>div>svg { width:1.3rem; flex:0 0 auto; color:#d7b873; }.balance-overlay-sheet h2 { margin:0; color:#f4efe5; font:300 clamp(1.7rem,5vw,2.35rem)/1.05 Georgia,'Times New Roman',serif; letter-spacing:-.02em; }
.balance-overlay-sheet>header>button { display:grid; width:44px; height:44px; flex:0 0 auto; place-items:center; margin:-.65rem -.65rem 0 0; border:0; background:transparent; color:#d8d1c6; cursor:pointer; }.balance-overlay-sheet>header>button svg { width:1rem; }
.balance-overlay-sheet :is(button,input,select):focus-visible { outline:2px solid #ead6a7; outline-offset:2px; }
.balance-overlay-form { display:grid; gap:1rem; }.balance-overlay-form>label { display:grid; gap:.45rem; color:#c9c1b5; font:600 .72rem/1.3 system-ui,sans-serif; }.balance-overlay-form :is(input,select) { width:100%; min-height:48px; box-sizing:border-box; padding:.75rem .15rem; border:0; border-bottom:1px solid rgba(201,168,106,.34); border-radius:0; outline:0; background:transparent; color:#f4efe5; font:1rem/1.45 Georgia,'Times New Roman',serif; caret-color:#ead6a7; }.balance-overlay-form :is(input,select):focus { border-bottom-color:#ead6a7; background:linear-gradient(180deg,transparent,rgba(201,168,106,.04)); }.balance-overlay-form select { color-scheme:dark; }
.balance-kind-choice,.balance-color-choice { display:flex; flex-wrap:wrap; gap:.55rem; margin:0; padding:0; border:0; }.balance-kind-choice legend,.balance-color-choice legend { width:100%; margin-bottom:.2rem; color:#c9c1b5; font:600 .72rem/1.3 system-ui,sans-serif; }.balance-kind-choice button { min-height:44px; flex:1 1 8rem; border:1px solid rgba(201,168,106,.27); border-radius:14px; background:transparent; color:#c9c1b5; font:600 .78rem/1 system-ui,sans-serif; cursor:pointer; }.balance-kind-choice button.active { border-color:#c9a86a; background:rgba(201,168,106,.13); color:#ead6a7; }
.balance-color-choice button { width:38px; height:38px; padding:0; border:2px solid transparent; border-radius:50%; background:var(--goal-color); cursor:pointer; }.balance-color-choice button.selected { border-color:#f4efe5; outline:2px solid #c9a86a; outline-offset:2px; }
.balance-overlay-save { min-height:48px; margin-top:.35rem; border:1px solid #c9a86a; border-radius:14px; background:rgba(201,168,106,.14); color:#ead6a7; font:650 .82rem/1 system-ui,sans-serif; cursor:pointer; }.balance-overlay-save:is(:hover,:focus-visible) { background:rgba(201,168,106,.22); }.balance-overlay-save:disabled { cursor:not-allowed; opacity:.46; }
.balance-overlay-enter-active,.balance-overlay-leave-active { transition:opacity 180ms ease; }.balance-overlay-enter-active .balance-overlay-sheet,.balance-overlay-leave-active .balance-overlay-sheet { transition:transform 340ms cubic-bezier(.16,1,.3,1),filter 260ms ease; }.balance-overlay-enter-from,.balance-overlay-leave-to { opacity:0; }.balance-overlay-enter-from .balance-overlay-sheet,.balance-overlay-leave-to .balance-overlay-sheet { filter:blur(5px); transform:translateY(1rem) scale(.96); }
@keyframes balance-home-bloom { to { opacity:1; filter:blur(0); transform:translate(-50%,-50%) scale(1); } }
@keyframes balance-orbit-breathe { 0%,100% { opacity:.35; transform:scale(.96); } 50% { opacity:1; transform:scale(1.04); } }
@keyframes balance-sky-turn { to { transform: translate(-50%,-50%) rotateX(65deg) rotateZ(348deg); } }

.lab-celestial { position: absolute; inset: 0; overflow: hidden; pointer-events:none; background: radial-gradient(circle at 50% 50%, rgba(201,168,106,.1), transparent 24%); }
.umbral-light-rays{position:absolute;z-index:0;top:-3rem;right:-3rem;left:-3rem;height:clamp(31rem,70vh,42rem);overflow:hidden;pointer-events:none;opacity:.78}.axis-home-lab>.axis-heading-lab,.axis-home-lab>.ritual-stage-lab,.axis-home-lab>.umbral-threshold-notes{position:relative;z-index:1}
.lab-celestial::before { content: ''; position: absolute; inset: 10%; opacity: .55; background: radial-gradient(circle at 12% 28%, #ead6a7 0 1px, transparent 1.5px), radial-gradient(circle at 82% 20%, #8173b7 0 1px, transparent 1.5px), radial-gradient(circle at 24% 74%, #f4efe5 0 1px, transparent 1.5px), radial-gradient(circle at 76% 78%, #c9a86a 0 1px, transparent 1.5px); }
.lab-constellation { position: absolute; width: 12rem; color: #8173b7; opacity: .24; stroke: currentColor; stroke-width: 1px; vector-effect: non-scaling-stroke; }
.lab-constellation circle { fill: #ead6a7; stroke: none; }
.lab-constellation-one { right: -1.5rem; top: 1rem; transform: rotate(-8deg); }
.lab-constellation-two { left: -.75rem; bottom: 1rem; width: 9rem; color: #c9a86a; transform: rotate(8deg); }
.lab-orbit { position: absolute; left: 50%; top: 50%; border: 1px solid rgba(201,168,106,.24); border-radius: 50%; transform: translate(-50%, -50%) rotateX(62deg) rotateZ(-14deg); animation: lab-drift 18s linear infinite; }
.lab-orbit-one { width: 19rem; height: 19rem; }
.lab-orbit-two { width: 28rem; height: 28rem; border-color: rgba(129,115,183,.34); animation-duration: 28s; animation-direction: reverse; }
.lab-orbit-three { width: 38rem; height: 38rem; border-color: rgba(201,168,106,.14); animation-duration: 38s; }
@keyframes lab-drift { to { transform: translate(-50%, -50%) rotateX(62deg) rotateZ(346deg); } }

.umbral-orbit-data { position: absolute; z-index: 3; inset: 0; margin: 0; pointer-events: none; }
.umbral-datum { position: absolute; min-width: 5.5rem; padding: .55rem .7rem .62rem; border: 1px solid rgba(201,168,106,.22); background: rgba(8,11,17,.88); box-shadow: 0 12px 26px rgba(0,0,0,.26); text-align: center; animation: umbral-object-reveal 620ms cubic-bezier(.16,1,.3,1) both; }
.umbral-datum::before { content: ''; position: absolute; left: .65rem; right: .65rem; top: 0; height: 1px; background: linear-gradient(90deg, transparent, #c9a86a, transparent); }
.umbral-datum dt { color: #b9b3aa; font: 600 .58rem/1.2 system-ui,sans-serif; letter-spacing: .08em; text-transform: uppercase; }
.umbral-datum dd { max-width: 9rem; margin: .25rem 0 0; color: #ead6a7; font-size: 1.35rem; font-weight: 300; line-height: 1.05; text-wrap: balance; }
.umbral-datum-number { left: 15%; top: 17%; animation-delay: 80ms; }
.umbral-datum-sign { right: 10%; top: 31%; animation-delay: 180ms; }
.umbral-datum-arcana { left: 8%; bottom: 7%; width: 8.75rem; pointer-events:auto; animation-delay: 280ms; }
@keyframes umbral-object-reveal { from { opacity: .32; filter: blur(6px); clip-path: inset(0 50%); } to { opacity: 1; filter: blur(0); clip-path: inset(0); } }

.tarot-reading { display: grid; justify-items: center; gap: .42rem; }
.tarot-open{display:grid;justify-items:center;padding:.25rem;border:0;background:transparent;color:inherit;cursor:pointer}.tarot-open:focus-visible{outline:2px solid #ead6a7;outline-offset:4px}.tarot-open small{margin-top:.3rem;color:#9f978d;font:600 .58rem/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.tarot-deck { position: relative; display: block; width: 4.65rem; height: 4.85rem; margin-top: .3rem; perspective: 360px; }
.tarot-card { position: absolute; left: 50%; top: 0; display: grid; width: 2.75rem; height: 4.25rem; place-items: center; border: 1px solid rgba(234,214,167,.72); border-radius: 4px; transform-origin: 50% 90%; box-shadow: 0 10px 22px rgba(0,0,0,.38); }
.tarot-card-back { background: #111724; }
.tarot-card-back::before { content: ''; position: absolute; inset: 4px; border: 1px solid rgba(129,115,183,.68); border-radius: 2px; }
.tarot-card-mark { position: relative; width: 1.05rem; aspect-ratio: 1; border: 1px solid rgba(234,214,167,.8); transform: rotate(45deg); }
.tarot-card-mark::before { content: ''; position: absolute; inset: 3px; border: 1px solid rgba(129,115,183,.85); border-radius: 50%; }
.tarot-card-back-left { z-index: 1; transform: translateX(calc(-50% - .38rem)) rotate(-7deg); animation: tarot-shuffle-left 1.45s cubic-bezier(.16,1,.3,1) 360ms both; }
.tarot-card-back-right { z-index: 2; transform: translateX(calc(-50% + .38rem)) rotate(7deg); animation: tarot-shuffle-right 1.45s cubic-bezier(.16,1,.3,1) 430ms both; }
.tarot-card-face { z-index: 3; color: #ead6a7; background: radial-gradient(circle at 50% 38%, rgba(201,168,106,.18), transparent 48%), #171d29; transform: translateX(-50%) translateY(-.18rem); animation: tarot-card-reveal 1.75s cubic-bezier(.16,1,.3,1) 520ms both; backface-visibility: hidden; }
.tarot-card-face svg { width: 2.35rem; stroke: currentColor; stroke-width: 1; }
.tarot-card-name { max-width: 8rem; color: #ead6a7; font-size: 1.05rem; line-height: 1.05; text-wrap: balance; }
.arcana-history{grid-column:1/-1;padding:1.15rem 0 1.35rem;border-block:1px solid rgba(201,168,106,.2)}.arcana-history h2{margin:0 0 1rem;font-size:1.4rem;font-weight:300}.arcana-history ol{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.65rem;margin:0;padding:0;list-style:none}.arcana-history li{display:grid;gap:.25rem;padding:.7rem;border-bottom:1px solid rgba(201,168,106,.16)}.arcana-history time{color:#9f978d;font:600 .65rem/1.2 system-ui,sans-serif;text-transform:uppercase}.arcana-history strong{color:#ead6a7;font-weight:300}
@keyframes tarot-shuffle-left {
  0% { transform: translateX(-50%) rotate(0); }
  32% { transform: translateX(calc(-50% - 1.55rem)) translateY(-.35rem) rotate(-15deg); }
  62% { transform: translateX(calc(-50% + .9rem)) translateY(.12rem) rotate(9deg); }
  100% { transform: translateX(calc(-50% - .38rem)) rotate(-7deg); }
}
@keyframes tarot-shuffle-right {
  0% { transform: translateX(-50%) rotate(0); }
  32% { transform: translateX(calc(-50% + 1.55rem)) translateY(-.2rem) rotate(15deg); }
  62% { transform: translateX(calc(-50% - .85rem)) translateY(.18rem) rotate(-8deg); }
  100% { transform: translateX(calc(-50% + .38rem)) rotate(7deg); }
}
@keyframes tarot-card-reveal {
  0%, 48% { opacity: .18; filter: brightness(.72); transform: translateX(-50%) translateY(.15rem) rotateY(88deg); }
  70% { opacity: 1; filter: brightness(1.08); transform: translateX(-50%) translateY(-.55rem) rotateY(0); }
  100% { opacity: 1; filter: brightness(1); transform: translateX(-50%) translateY(-.18rem) rotateY(0); }
}

.umbral-threshold-notes { display: grid; grid-template-columns: minmax(0,.78fr) minmax(0,1.22fr); gap: 1rem; margin-top: 1.25rem; }
.umbral-threshold-notes>button { position: relative; display: grid; min-width: 0; min-height: 7.25rem; grid-template-columns: 2.5rem minmax(0,1fr); align-items: center; gap: 1rem; overflow: hidden; border: 0; border-block: 1px solid rgba(201,168,106,.28); background: radial-gradient(circle at 0 0, rgba(201,168,106,.09), transparent 48%); color: #f4efe5; padding: 1rem; text-align: left; cursor: pointer; }
.umbral-threshold-notes>button::after { content: ''; position: absolute; right: 0; top: 0; width: 1px; height: 52%; background: linear-gradient(#c9a86a, transparent); opacity: .55; }
.umbral-threshold-notes>button:hover,.umbral-threshold-notes>button:focus-visible { background-color: rgba(201,168,106,.05); }
.threshold-symbol { display: grid; width: 2.4rem; aspect-ratio: 1; place-items: center; border: 1px solid rgba(201,168,106,.35); border-radius: 50%; color: #c9a86a; }
.threshold-symbol svg { width: 1rem; }
.umbral-threshold-notes small { display: block; margin-bottom: .65rem; color: #b9b3aa; font: 600 .62rem/1.25 system-ui,sans-serif; letter-spacing: .08em; text-transform: uppercase; }
.umbral-threshold-notes strong { display: block; overflow-wrap: anywhere; color: #ead6a7; font-size: clamp(1.2rem,3.5vw,1.65rem); font-weight: 300; line-height: 1.15; text-wrap: balance; }

.worlds-stage-lab { position: relative; }
.worlds-stage-lab::before { content: ''; position: absolute; z-index: -1; width: min(82vw, 31rem); aspect-ratio: 1; border: 1px solid rgba(201,168,106,.12); border-radius: 50%; transform: rotateX(67deg) rotateZ(-12deg); }
.world-flower-lab { display: block; width: min(82vw, 25rem); overflow: visible; filter: drop-shadow(0 22px 34px rgba(0,0,0,.3)); animation: flower-suspension 7s ease-in-out infinite; }
.lab-flower-shadow { fill: rgba(9,7,15,.34); filter: blur(7px); transform-origin:center; animation: flower-shadow-breathe 7s ease-in-out infinite; }
.lab-world-petal { cursor: pointer; transition: filter 220ms cubic-bezier(.23,1,.32,1); }
.lab-petal-shadow { fill: rgba(5,6,10,.35); transform: translateY(7px); }
.lab-petal-surface { stroke: rgba(244,239,229,.26); stroke-width: 1px; transform-box:fill-box; transform-origin:center; animation: petal-current 6.4s ease-in-out infinite; animation-delay:calc(var(--petal-index) * -.72s); }
.lab-petal-label { fill: #fff9e8; font: 500 10px/1 system-ui, sans-serif; letter-spacing: .015em; paint-order: stroke; pointer-events: none; stroke: rgba(35,23,39,.45); stroke-width: 2px; stroke-linejoin: round; }
.lab-flower-core { filter: drop-shadow(0 10px 18px rgba(0,0,0,.3)); transform-origin:center; animation: flower-core-pulse 4.8s ease-in-out infinite; }
.lab-flower-seed { fill: #080b11; transform-origin:center; animation: flower-seed-light 3.2s ease-in-out infinite; }
.lab-world-petal:hover, .lab-world-petal:focus-visible { filter: brightness(1.12) saturate(1.06); }
.lab-world-petal:focus-visible { outline: none; }
.lab-world-petal:focus-visible .lab-petal-surface { stroke: #ead6a7; stroke-width: 2.4px; }
@keyframes flower-suspension { 0%,100% { filter:drop-shadow(0 22px 34px rgba(0,0,0,.3)) brightness(.97); } 50% { filter:drop-shadow(0 28px 42px rgba(0,0,0,.38)) brightness(1.06); } }
@keyframes flower-shadow-breathe { 0%,100% { transform:scale(.92); opacity:.42; } 50% { transform:scale(1.08); opacity:.68; } }
@keyframes petal-current { 0%,100% { filter:brightness(.96) saturate(.94); } 50% { filter:brightness(1.1) saturate(1.08); } }
@keyframes flower-core-pulse { 0%,100% { transform:scale(.96); filter:drop-shadow(0 10px 18px rgba(0,0,0,.3)); } 50% { transform:scale(1.05); filter:drop-shadow(0 14px 28px rgba(234,214,167,.24)); } }
@keyframes flower-seed-light { 0%,100% { opacity:.68; } 50% { opacity:1; filter:drop-shadow(0 0 8px #ead6a7); } }

.nucleus-cloth-lab { border-radius: 47% 53% 51% 49% / 52% 46% 54% 48%; background: radial-gradient(circle at 52% 42%, rgba(42,38,67,.58), transparent 38%), radial-gradient(circle at 40% 35%, #151827, #080b11 74%); background-size:130% 130%; box-shadow: inset 0 0 80px rgba(129,115,183,.08), 0 30px 70px rgba(0,0,0,.28); animation: nucleus-cloth-current 8s ease-in-out infinite alternate; }
.nucleus-cloth-lab::before, .nucleus-cloth-lab::after { content: ''; position: absolute; inset: 2%; border: 1px solid rgba(129,115,183,.15); border-radius: 48% 52% 46% 54%; transform: rotate(18deg); }
.nucleus-cloth-lab::after { inset: 12% 4%; border-color: rgba(201,168,106,.09); transform: rotate(-26deg); }
.nucleus-thread { position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: linear-gradient(transparent, rgba(201,168,106,.48), transparent); }
.nucleus-light-lab { --angle: calc(var(--light) * 57deg); position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; border-radius: 50%; background: #f4efe5; box-shadow: 0 0 6px #f4efe5, 0 0 18px rgba(201,168,106,.5); transform: rotate(var(--angle)) translateY(-9rem) rotate(calc(var(--angle) * -1)); animation: nucleus-light-breathe 3.8s cubic-bezier(.23,1,.32,1) infinite; animation-delay: calc(var(--light) * -.47s); }
.nucleus-entry-core { width:min(68%,19rem); min-height:44px; color:#f4efe5; }
.nucleus-capture-lab { display:grid; width:min(100%,38rem); gap:.75rem; padding:1.15rem 0 0; border-top:1px solid rgba(129,115,183,.28); text-align:left; }
.nucleus-capture-lab label { color:#d6cedf; font:500 .78rem/1.35 system-ui,sans-serif; }
.nucleus-capture-lab textarea { width:100%; min-height:7.5rem; box-sizing:border-box; resize:vertical; border:1px solid rgba(129,115,183,.3); border-radius:14px; outline:0; background:radial-gradient(circle at 6% 0,rgba(129,115,183,.1),transparent 42%),#090d15; color:#f4efe5; caret-color:#c9a86a; padding:1rem 1.05rem; font:400 1rem/1.6 var(--font-aureo,serif); transition:border-color 180ms ease,box-shadow 220ms ease,background-color 180ms ease; }
.nucleus-capture-lab textarea::placeholder { color:#a9a2b1; opacity:1; }
.nucleus-capture-lab textarea:focus-visible { border-color:#8173b7; box-shadow:0 16px 36px rgba(0,0,0,.24),0 0 0 3px rgba(129,115,183,.13); }
.nucleus-capture-lab button { justify-self:end; min-height:44px; border:1px solid rgba(201,168,106,.44); border-radius:12px; background:rgba(201,168,106,.12); color:#ead6a7; padding:.65rem 1.1rem; font:600 .82rem/1 system-ui,sans-serif; cursor:pointer; transition:background-color 180ms ease,border-color 180ms ease,transform 120ms ease; }
.nucleus-capture-lab button:hover,.nucleus-capture-lab button:focus-visible { border-color:#c9a86a; background:rgba(201,168,106,.2); }
.nucleus-capture-lab button:focus-visible { outline:2px solid #f4efe5; outline-offset:3px; }
.nucleus-capture-lab button:active { transform:scale(.98); }
.nucleus-capture-lab button:disabled { cursor:wait; opacity:.58; }
.nucleus-preview-plasma { position:absolute; z-index:1; inset:0; overflow:hidden; pointer-events:none; }
.nucleus-home-gate{display:grid;width:min(100%,34rem);justify-items:center;gap:1.2rem;padding:clamp(1.5rem,5vw,3rem);border-block:1px solid rgba(201,168,106,.24);background:radial-gradient(circle at 50% 35%,rgba(129,115,183,.13),transparent 60%);text-align:center}.nucleus-home-gate>svg{width:3rem;color:#8173b7}.nucleus-home-gate h2{margin:0;color:#f4efe5;font-size:2.2rem;font-weight:250}.nucleus-home-gate p{margin:0;color:#b9b3aa;font-style:italic}.nucleus-home-progress{display:flex;gap:.65rem}.nucleus-home-progress span{width:.55rem;aspect-ratio:1;border:1px solid rgba(201,168,106,.48);border-radius:50%}.nucleus-home-progress span.filled{background:#c9a86a;box-shadow:0 0 12px rgba(201,168,106,.45)}.nucleus-home-notes{display:grid;width:100%;grid-template-columns:repeat(7,minmax(0,1fr));gap:.4rem}.nucleus-home-notes button{min-height:48px;border:1px solid rgba(201,168,106,.25);border-radius:10px;background:#0d121b;color:#ead6a7;cursor:pointer}.nucleus-home-notes button:active{background:#c9a86a;color:#080b11;transform:translateY(2px)}.nucleus-home-error{color:#c47a5a!important}
.nucleus-preview-pool { position:absolute; width:34%; aspect-ratio:1; border-radius:46% 54% 63% 37%/55% 43% 57% 45%; background:radial-gradient(circle at 42% 38%,color-mix(in srgb,var(--emotion-color) 58%,transparent),color-mix(in srgb,var(--emotion-color) 14%,transparent) 44%,transparent 72%); filter:blur(17px); opacity:.36; mix-blend-mode:screen; transform:translate(-50%,-50%); animation:nucleus-preview-plasma 8.6s ease-in-out infinite alternate; animation-delay:calc(var(--plasma-index) * -1.2s); }
.nucleus-preview-point { position:absolute; z-index:20; display:grid; width:46px; height:46px; place-items:center; border:0; border-radius:50%; background:transparent; transform:translate(-50%,-50%); cursor:pointer; }
.nucleus-preview-point>span { position:relative; width:10px; height:10px; border:1px solid color-mix(in srgb,var(--thought-color) 76%,#fff); border-radius:50%; background:var(--thought-color); box-shadow:0 4px 12px color-mix(in srgb,var(--thought-color) 46%,transparent),0 8px 28px color-mix(in srgb,var(--thought-color) 38%,transparent); animation:nucleus-preview-point-pulse 3.5s ease-in-out infinite; animation-delay:calc(var(--thought-index) * -.48s); }
.nucleus-preview-point>span::after { content:''; position:absolute; inset:-7px; border:1px solid color-mix(in srgb,var(--thought-color) 34%,transparent); border-radius:50%; transform:scale(.72); transition:transform 180ms cubic-bezier(.16,1,.3,1),border-color 180ms ease; }
.nucleus-preview-point:hover>span::after,.nucleus-preview-point:focus-visible>span::after { border-color:var(--thought-color); transform:scale(1); }
.nucleus-preview-point:focus-visible { outline:2px solid #f4efe5; outline-offset:1px; }
.nucleus-preview-layer { position:fixed; z-index:90; inset:0; display:grid; place-items:center; padding:1.25rem; background:rgba(4,6,10,.72); backdrop-filter:blur(6px); }
.nucleus-preview-layer:focus { outline:none; }
.nucleus-preview-reading { position:relative; width:min(100%,28rem); box-sizing:border-box; padding:1.35rem 1.4rem 1.5rem; border:1px solid color-mix(in srgb,var(--thought-color) 38%,transparent); border-radius:14px; background:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--thought-color) 11%,transparent),transparent 44%),#0d121b; box-shadow:0 24px 62px rgba(0,0,0,.46); text-align:left; }
.nucleus-preview-reading::before { content:''; position:absolute; inset:0 auto 0 0; width:1px; background:linear-gradient(transparent,var(--thought-color),transparent); }
.nucleus-preview-reading header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.15rem; }
.nucleus-preview-reading header>div { display:grid; grid-template-columns:.65rem minmax(0,1fr); align-items:center; gap:.3rem .55rem; min-width:0; }
.nucleus-preview-reading header>div>span { width:.6rem; aspect-ratio:1; border-radius:50%; background:var(--thought-color); box-shadow:0 5px 14px color-mix(in srgb,var(--thought-color) 46%,transparent); }
.nucleus-preview-reading header strong { color:color-mix(in srgb,var(--thought-color) 76%,#f4efe5); font:600 .83rem/1.25 system-ui,sans-serif; }
.nucleus-preview-reading header time { grid-column:2; color:#a9a2b1; font:500 .7rem/1.3 system-ui,sans-serif; }
.nucleus-preview-reading header button { display:grid; width:44px; height:44px; flex:0 0 auto; place-items:center; margin:-.75rem -.75rem 0 0; border:0; background:transparent; color:#d6cedf; cursor:pointer; }
.nucleus-preview-reading header button svg { width:1rem; }
.nucleus-preview-reading>svg { width:1.45rem; color:var(--thought-color); filter:drop-shadow(0 7px 14px color-mix(in srgb,var(--thought-color) 26%,transparent)); }
.nucleus-preview-reading p { max-height:min(46svh,22rem); margin:1rem 0 0; overflow:auto; color:#f4efe5; line-height:1.65; white-space:pre-wrap; }
.nucleus-preview-card-enter-active,.nucleus-preview-card-leave-active { transition:opacity 180ms ease; }.nucleus-preview-card-enter-active .nucleus-preview-reading,.nucleus-preview-card-leave-active .nucleus-preview-reading { transition:transform 340ms cubic-bezier(.16,1,.3,1),filter 260ms ease; }.nucleus-preview-card-enter-from,.nucleus-preview-card-leave-to { opacity:0; }.nucleus-preview-card-enter-from .nucleus-preview-reading,.nucleus-preview-card-leave-to .nucleus-preview-reading { filter:blur(5px); transform:translateY(1rem) scale(.94); }
@keyframes nucleus-light-breathe { 0%,100% { opacity: .45; filter: blur(.2px); } 52% { opacity: 1; filter: blur(0); } }
@keyframes nucleus-cloth-current { from { background-position:42% 44%; filter:brightness(.96); } to { background-position:58% 56%; filter:brightness(1.06); } }
@keyframes nucleus-preview-plasma { 0% { border-radius:46% 54% 63% 37%/55% 43% 57% 45%; filter:blur(19px) brightness(.86); transform:translate(-53%,-48%) scale(.86); } 50% { border-radius:61% 39% 42% 58%/43% 62% 38% 57%; filter:blur(14px) brightness(1.08); transform:translate(-46%,-54%) scale(1.12); } 100% { border-radius:39% 61% 54% 46%/64% 38% 62% 36%; filter:blur(17px) brightness(.96); transform:translate(-50%,-47%) scale(.96); } }
@keyframes nucleus-preview-point-pulse { 0%,100% { opacity:.64; transform:scale(.78); } 50% { opacity:1; transform:scale(1.18); } }

.golden-daruma-home { display:grid; width:min(100%,47rem); grid-template-columns:minmax(15rem,20rem) minmax(16rem,1fr); align-items:center; justify-content:center; gap:clamp(1.5rem,5vw,4.5rem); margin-inline:auto; }
.golden-daruma-entry { display:grid; width:100%; min-width:0; place-items:center; gap:.25rem; padding:0 1rem .5rem; border:0; background:transparent; color:#f4efe5; cursor:pointer; }
.golden-daruma-entry-art { position:relative; display:block; width:100%; aspect-ratio:360/450; }
.golden-daruma-entry-art svg { position:relative; z-index:1; display:block; width:100%; height:100%; overflow:visible; animation:golden-daruma-entry-breathe 6.5s ease-in-out infinite; }
.golden-daruma-entry-aura { position:absolute; inset:20% 3% 5%; border-radius:50%; background:radial-gradient(circle,color-mix(in srgb,var(--sign-color) 24%,transparent),transparent 68%); filter:blur(24px); opacity:.62; transition:opacity 240ms ease; }
.golden-daruma-entry-ground { fill:#020305; opacity:.68; filter:blur(5px); }
.golden-daruma-entry-form { filter:drop-shadow(0 20px 16px rgba(0,0,0,.48)); transition:filter 240ms ease; }
.golden-daruma-entry-body { fill:url(#preview-daruma-body-gradient); stroke:rgba(234,214,167,.34); stroke-width:1.4; }
.golden-daruma-entry-sheen { fill:rgba(244,239,229,.07); }
.golden-daruma-entry-face { fill:url(#preview-daruma-face-gradient); stroke:#c9a86a; stroke-width:1.5; }
.golden-daruma-entry-ink { fill:none; stroke:#151720; stroke-width:8; stroke-linecap:round; }
.golden-daruma-entry-eye-rim { fill:#f4efe5; stroke:#171922; stroke-width:5; }
.golden-daruma-entry-eye { fill:#090b10; }
.golden-daruma-entry-nose { fill:#171922; }
.golden-daruma-entry-seal { fill:rgba(4,7,11,.34); stroke:rgba(234,214,167,.18); stroke-width:1.2; }
.golden-daruma-entry-crack { fill:none; stroke:url(#preview-daruma-gold-gradient); stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round; filter:drop-shadow(0 0 4px rgba(255,228,165,.6)); }
.golden-daruma-entry-copy { display:grid; gap:.45rem; margin-top:-.65rem; }
.golden-daruma-entry-copy strong { color:#ead6a7; font:300 clamp(1.65rem,4vw,2.15rem)/1.05 Georgia,'Times New Roman',serif; }
.golden-daruma-entry-copy>span { color:#bdb6aa; font:.95rem/1.5 system-ui,sans-serif; }
.golden-daruma-entry:hover .golden-daruma-entry-form,.golden-daruma-entry:focus-visible .golden-daruma-entry-form { filter:drop-shadow(0 22px 20px rgba(0,0,0,.56)) brightness(1.12); }
.golden-daruma-entry:hover .golden-daruma-entry-aura,.golden-daruma-entry:focus-visible .golden-daruma-entry-aura { opacity:1; }
.golden-daruma-practice { display:grid; align-content:center; gap:1rem; min-width:0; }
.golden-daruma-capture { display:grid; gap:.8rem; }
.golden-daruma-capture label { color:#ead6a7; font:300 clamp(1.45rem,3vw,2rem)/1.15 Georgia,'Times New Roman',serif; }
.golden-daruma-capture textarea { width:100%; min-height:8rem; box-sizing:border-box; resize:vertical; padding:.85rem .1rem; border:0; border-bottom:1px solid rgba(201,168,106,.4); border-radius:0; outline:0; background:transparent; color:#f4efe5; font:1.05rem/1.6 Georgia,'Times New Roman',serif; }
.golden-daruma-capture textarea::placeholder { color:#938d85; opacity:1; }
.golden-daruma-capture textarea:focus { border-bottom-color:#ead6a7; background:linear-gradient(180deg,transparent,rgba(201,168,106,.04)); box-shadow:0 14px 24px -22px rgba(234,214,167,.75); }
.golden-daruma-capture>button { justify-self:end; min-width:11rem; min-height:44px; padding:.7rem 1.1rem; border:1px solid rgba(201,168,106,.68); border-radius:14px; background:rgba(201,168,106,.13); color:#ead6a7; font:600 .82rem/1 system-ui,sans-serif; cursor:pointer; transition:background-color 180ms ease,border-color 180ms ease; }
.golden-daruma-capture>button:hover { border-color:#ead6a7; background:rgba(201,168,106,.21); }
.golden-daruma-capture>button:disabled { cursor:wait; opacity:.58; }
.golden-daruma-saved { display:flex; align-items:center; gap:.55rem; margin:0; color:#cfc5b0; font:.84rem/1.45 system-ui,sans-serif; }
.golden-daruma-saved svg { width:1rem; flex:0 0 auto; color:#ead6a7; }
.golden-daruma-contemplate { justify-self:start; min-height:44px; padding:.25rem 0; border:0; border-bottom:1px solid rgba(201,168,106,.36); background:transparent; color:#bdb6aa; font:600 .78rem/1.2 system-ui,sans-serif; cursor:pointer; transition:color 180ms ease,border-color 180ms ease; }
.golden-daruma-contemplate:hover { border-color:#ead6a7; color:#ead6a7; }
@keyframes golden-daruma-entry-breathe { 0%,100% { filter:brightness(.94) saturate(.94); } 50% { filter:brightness(1.06) saturate(1.04); } }

@media (max-width: 639px) {
  .axis-heading-lab { justify-content: space-between !important; padding-inline: 0; text-align: left; }
  .axis-heading-lab::after { left: 0; transform: none; }
  .ritual-stage-lab { margin-top: .75rem; }
  .ritual-stage-lab { max-width: 100%; }
  .lab-orbit-one { width: min(19rem, 82vw); height: min(19rem, 82vw); }
  .lab-orbit-two { width: min(28rem, 112vw); height: min(28rem, 112vw); }
  .lab-orbit-three { width: min(31rem, 138vw); height: min(31rem, 138vw); }
  .balance-sky-ring-one { width: min(15rem, 76vw); height: min(15rem, 76vw); }
  .balance-sky-ring-two { width: min(21rem, 104vw); height: min(21rem, 104vw); }
  .balance-sky-ring-three { width: min(28rem, 132vw); height: min(28rem, 132vw); }
  .balance-field-lab { min-height:25rem; }
  .balance-tree-entry { left:50%; width:112%; max-width:none; margin:0; transform:translateX(-50%); }
  .privacy-seal-lab { top:18%; font-size:.52rem; }
  .balance-home-count,.balance-home-empty { max-width:76%; }
  .balance-overlay-layer { align-items:end; padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom)); }
  .balance-overlay-sheet { width:100%; max-height:min(42rem,calc(100svh - 1rem)); padding:1.25rem 1.2rem calc(1.35rem + env(safe-area-inset-bottom)); }
  .golden-daruma-home { width:100%; grid-template-columns:minmax(0,1fr); gap:.75rem; }
  .golden-daruma-entry { width:100%; max-width:16rem; margin-inline:auto; }
  .golden-daruma-practice { width:min(100%,30rem); margin-inline:auto; }
  .golden-daruma-capture textarea { min-height:6.5rem; }
  .golden-daruma-capture>button { width:100%; }
  .nucleus-light-lab { transform: rotate(var(--angle)) translateY(-7rem) rotate(calc(var(--angle) * -1)); }
  .umbral-datum { min-width: 4.5rem; padding: .45rem .5rem .5rem; }
  .umbral-datum dd { max-width: 7.5rem; font-size: 1.08rem; }
  .umbral-datum-number { left: 0; top: 16%; }
  .umbral-datum-sign { right: 0; top: 19%; }
  .umbral-datum-arcana { left: 1%; bottom: 3%; width: 7.6rem; }
  .tarot-deck { transform: scale(.9); transform-origin: center top; margin-bottom: -.45rem; }
  .tarot-card-name { max-width: 7rem; font-size: .96rem; }
  .umbral-threshold-notes { grid-template-columns: minmax(0,1fr); gap: .75rem; }
  .umbral-threshold-notes>button { min-height: 6.5rem; }
  .nucleus-preview-layer { align-items:end; padding:1rem 1rem calc(6rem + env(safe-area-inset-bottom)); }
  .nucleus-preview-reading { width:100%; }
  .nucleus-capture-lab { width:100%; padding-top:1rem; }
  .nucleus-capture-lab textarea { min-height:6.75rem; }
}

@media (max-width: 360px) {
  .balance-stage-lab > div:last-child { grid-template-columns: minmax(0, 1fr); }
  .world-flower-lab { width: min(88vw, 19rem); }
  .axis-heading-lab h1 { font-size: clamp(2.25rem, 13vw, 3rem) !important; }
}

@media (max-width: 420px) {
  .axis-date-full { display: none; }
  .axis-date-short { display: inline; }
}

@media (max-width: 760px) and (max-height: 520px) {
  .axis-heading-lab { padding-bottom: .5rem; }
  .ritual-stage-lab { min-height: 16rem !important; }
  .golden-daruma-entry { width:min(15rem,52svh) !important; }
  .golden-daruma-entry-copy { margin-top:-1.5rem; }
  .golden-daruma-practice { grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:.5rem 1rem; }
  .golden-daruma-capture { grid-column:1/-1; grid-template-columns:minmax(0,1fr) auto; align-items:end; }
  .golden-daruma-capture label { grid-column:1/-1; font-size:1.25rem; }
  .golden-daruma-capture textarea { min-height:3.5rem; max-height:5rem; }
  .golden-daruma-capture>button { width:auto; }
  .golden-daruma-saved { margin:0; }
  .golden-daruma-contemplate { justify-self:end; }
  .nucleus-cloth-lab { width: min(19rem, 66svh) !important; }
}

@media (min-width: 640px) {
  .balance-field-lab { min-height: 30rem; }
}

@media (prefers-reduced-motion: reduce) {
  .lab-orbit, .balance-sky-ring, .balance-home-blossom, .world-flower-lab, .lab-flower-shadow, .lab-petal-surface, .lab-flower-core, .lab-flower-seed, .nucleus-cloth-lab, .nucleus-light-lab, .nucleus-preview-pool, .nucleus-preview-point>span, .golden-daruma-entry-art svg, .umbral-datum, .moon-atmosphere, .tarot-card { animation: none; }
  .umbral-light-rays{display:none}
  .balance-home-blossom { opacity:1; filter:none; transform:translate(-50%,-50%); }
  .balance-overlay-enter-active,.balance-overlay-leave-active,.balance-overlay-enter-active .balance-overlay-sheet,.balance-overlay-leave-active .balance-overlay-sheet { transition-duration:1ms; }
  .axis-heading-lab { animation: none; }
  .axis-ritual-enter-active, .axis-ritual-leave-active { transition-duration: 1ms; }
  .nucleus-preview-card-enter-active,.nucleus-preview-card-leave-active,.nucleus-preview-card-enter-active .nucleus-preview-reading,.nucleus-preview-card-leave-active .nucleus-preview-reading { transition-duration:1ms; }
}

/* v1.3 — capas espaciales de Vue Bits y superficies menos administrativas. */
.umbral-light-rays{position:fixed!important;z-index:1!important;inset:0!important;width:100vw!important;height:100svh!important;pointer-events:none;opacity:.34}.aureo-app-frame{position:relative;z-index:2;width:100%;max-width:none}.aureo-content-shell{padding-inline:clamp(1.25rem,4vw,5rem)}.aureo-content-width{max-width:none}.tailwind-lab::after{content:'';position:fixed;z-index:0;inset:0;pointer-events:none;background:radial-gradient(ellipse 68% 42% at 50% 42%,transparent 38%,rgba(3,5,9,.32) 100%);mix-blend-mode:multiply}
.tailwind-lab>.aureo-app-frame>aside{position:relative;border-right-color:rgba(201,168,106,.13)!important;background:linear-gradient(128deg,rgba(12,17,27,.94),rgba(8,11,17,.76))!important;backdrop-filter:blur(18px)}.tailwind-lab>.aureo-app-frame>aside::after{content:'';position:absolute;right:-1px;top:7%;bottom:7%;width:1px;background:linear-gradient(transparent,var(--zodiac-color),transparent);opacity:.52}.desktop-axis-nav{gap:.55rem!important}.desktop-axis-nav button{min-height:3.25rem!important;border-radius:999px!important;padding-inline:1rem!important;transition:background-color 220ms ease,color 220ms ease,transform 220ms cubic-bezier(.16,1,.3,1)!important}.desktop-axis-nav button:hover{background:color-mix(in srgb,var(--zodiac-color) 8%,transparent)!important;transform:translateX(.2rem)}.desktop-axis-active{background:linear-gradient(90deg,color-mix(in srgb,var(--zodiac-color) 15%,transparent),rgba(201,168,106,.06),transparent)!important}.desktop-axis-nav button::before{left:.35rem!important;height:1.55rem!important}.desktop-axis-active .desktop-axis-icon{box-shadow:0 0 0 4px color-mix(in srgb,var(--zodiac-color) 8%,transparent),0 10px 24px rgba(0,0,0,.2)}
.axis-home-lab{display:grid;grid-template-rows:auto minmax(0,1fr) auto;min-height:calc(100svh - 6rem);padding:clamp(.25rem,1.2vw,1rem);border-radius:2rem 1rem 3.5rem 1.5rem/1.6rem 1.1rem 2.5rem 1.4rem}.axis-heading-lab{padding:clamp(.6rem,1.2vw,1rem) clamp(.4rem,1vw,.8rem) 1.25rem}.axis-heading-lab::after{width:min(42vw,8.5rem);background:linear-gradient(90deg,transparent,#c9a86a 26%,var(--zodiac-color) 60%,transparent)}.axis-heading-meta{padding:.55rem .65rem;border:1px solid rgba(201,168,106,.15);border-radius:45% 55% 52% 48%/48% 46% 54% 52%;background:rgba(8,11,17,.24);backdrop-filter:blur(10px)}
.umbral-datum{border-radius:47% 53% 46% 54%/52% 44% 56% 48%;background:linear-gradient(135deg,rgba(17,24,36,.84),rgba(8,11,17,.72));backdrop-filter:blur(14px)}.umbral-datum-number{padding-inline:1rem}.umbral-datum-sign{border-radius:56% 44% 53% 47%/44% 55% 45% 56%}.umbral-datum-arcana{border-radius:45% 55% 52% 48%/58% 46% 54% 42%}.tarot-card{border-radius:8px 8px 14px 8px}.umbral-threshold-notes>button{border-radius:1.5rem 1rem 1.5rem .9rem!important;background:linear-gradient(125deg,rgba(22,28,40,.56),rgba(8,11,17,.2))!important;backdrop-filter:blur(11px)}
.worlds-stage-lab::before{width:min(91vw,35rem);border-color:color-mix(in srgb,var(--zodiac-color) 28%,rgba(201,168,106,.1));box-shadow:0 0 70px color-mix(in srgb,var(--zodiac-color) 8%,transparent)}.world-flower-lab{filter:drop-shadow(0 22px 34px rgba(0,0,0,.3))}.lab-world-petal{cursor:pointer}.lab-world-petal:hover .lab-petal-surface,.lab-world-petal:focus .lab-petal-surface{filter:brightness(1.16) saturate(1.08)}
.balance-stage-lab>div:last-of-type{margin:1.25rem auto 0;width:min(100%,39rem);padding:.35rem;border:1px solid rgba(201,168,106,.16);border-radius:2rem 1.1rem 2rem 1.1rem/1.2rem 2rem 1.1rem 2rem;background:rgba(11,16,24,.42);backdrop-filter:blur(14px)}.balance-stage-lab>div:last-of-type>button{border-radius:999px!important;border-color:rgba(201,168,106,.28)!important;background:transparent!important}.balance-stage-lab>div:last-of-type>button:first-child{background:linear-gradient(90deg,rgba(201,168,106,.2),rgba(201,168,106,.06))!important}.balance-home-reading{padding:.7rem 1rem;border-radius:50% 50% 42% 58%/55% 45% 55% 45%;background:rgba(8,11,17,.18);backdrop-filter:blur(6px)}.balance-home-value strong{text-shadow:0 12px 30px rgba(0,0,0,.42)}
.nucleus-home-gate{border:1px solid rgba(129,115,183,.26);border-radius:46% 54% 48% 52%/42% 56% 44% 58%;box-shadow:0 28px 70px rgba(0,0,0,.24);background:radial-gradient(circle at 46% 20%,rgba(129,115,183,.18),transparent 47%),rgba(9,13,21,.52);backdrop-filter:blur(15px)}.nucleus-home-notes button{border-radius:50%!important;background:rgba(13,18,29,.72)!important}.nucleus-capture-lab{padding:1.25rem 1.3rem 1.1rem;border:1px solid rgba(129,115,183,.22);border-radius:1.8rem 1.25rem 2.7rem 1.1rem/1.4rem 2.4rem 1.35rem 2.1rem;background:rgba(9,13,21,.46);backdrop-filter:blur(14px)}.nucleus-capture-lab textarea{border-radius:1.15rem 1.15rem 1.9rem 1.15rem}.nucleus-capture-lab button{border-radius:999px}
.golden-daruma-practice{padding:clamp(.9rem,2vw,1.45rem);border:1px solid color-mix(in srgb,var(--sign-color) 22%,rgba(201,168,106,.18));border-radius:1.8rem 1.1rem 2.8rem 1.25rem/1.3rem 2.25rem 1.6rem 2.2rem;background:linear-gradient(135deg,color-mix(in srgb,var(--sign-color) 7%,rgba(8,11,17,.5)),rgba(8,11,17,.22));backdrop-filter:blur(15px)}.golden-daruma-capture>button{border-radius:999px}.golden-daruma-contemplate{border-radius:999px;padding:.55rem .9rem;border:1px solid rgba(201,168,106,.28);background:rgba(8,11,17,.28)}
.lab-mobile-nav{border-radius:2rem 2rem 1.3rem 1.3rem!important;background:linear-gradient(135deg,rgba(14,20,31,.95),rgba(8,11,17,.88))!important;box-shadow:0 -14px 42px rgba(0,0,0,.28),inset 0 1px rgba(234,214,167,.08)}.lab-mobile-nav button{border-radius:999px!important}.mobile-axis-active{background:color-mix(in srgb,var(--zodiac-color) 11%,transparent)!important}
@media(max-width:760px){.umbral-light-rays{opacity:.25}.ritual-stage-lab{min-height:clamp(18rem,50svh,30rem)}.axis-home-lab{min-height:calc(100svh - 9rem);padding:.15rem 0 .7rem;border-radius:1.5rem 1rem 2.6rem 1rem}.axis-heading-meta{padding:.35rem .45rem}.balance-stage-lab>div:last-of-type{border-radius:1.55rem 1rem 1.55rem 1rem}.nucleus-home-gate{border-radius:2rem 1.45rem 2.7rem 1.25rem}.nucleus-capture-lab,.golden-daruma-practice{border-radius:1.4rem 1rem 2.1rem 1rem}.umbral-datum{transform:scale(.92)}}
@media(min-width:1024px){.aureo-content-width{max-width:72rem}.axis-home-lab{padding:.75rem}.axis-heading-lab{padding:.5rem .5rem 1rem}.axis-welcome-title{font-size:clamp(3.4rem,4.25vw,4.25rem)}.ritual-stage-lab{min-height:clamp(24rem,50svh,36rem)}.world-flower-lab{width:min(70vw,22rem)}.worlds-stage-lab::before{width:min(78vw,31rem)}.balance-field-lab{min-height:27rem}.balance-tree-entry{width:min(100%,34rem)}.nucleus-cloth-lab{max-width:25rem!important}.golden-daruma-home{width:min(100%,42rem);grid-template-columns:minmax(14rem,17rem) minmax(16rem,1fr);gap:2.25rem}}
@media(prefers-reduced-motion:reduce){.desktop-axis-nav button:hover{transform:none}.lab-world-petal:hover .lab-petal-surface{filter:none}}
</style>
