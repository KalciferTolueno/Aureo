<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CollectionRepository, makeId } from '@/data/repositories'
import { storage } from '@/data/storage'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useProfileStore } from '@/stores/profile'
import type { BalanceMovement, DailyArcana, Daruma, GoldenDeclaration, Idea, NucleusThought, Pulse } from '@/domain/types'
import { dailyPulsePrompt, greetingForHour, isSameLocalDay, localDateKey, lunarPhaseIndex as phaseIndexFor, MAXIMS, nextMaximIndex, recentDailyArcana, umbralDateLabel, arcanaPhrase, LUNAR_PHASES, resolveLumen, type LumenMode } from '@/domain/umbral'
import TailwindWorkspace from './tailwind/TailwindWorkspace.vue'
import VueBitsLightRays from './tailwind/VueBitsLightRays.vue'
import MundosNightSky from './tailwind/MundosNightSky.vue'
import UmbralMoonStrip from './tailwind/UmbralMoonStrip.vue'
import CaptureSeal from './tailwind/CaptureSeal.vue'
import AureoSettingsPage from './settings/AureoSettingsPage.vue'
import OpeningMoment from './onboarding/OpeningMoment.vue'
import { playChord, playTone, unlockTone } from '@/composables/useTone'
import { MELODY_NOTES, recoverMelodyNotes } from '@/domain/melody'
import { goldenDarumaCrackPatterns } from './tailwind/goldenDaruma'
import { signColors, signLabels } from '@/domain/zodiac'

type AxisId = 'umbral' | 'mundos' | 'balance' | 'nucleo' | 'edad-dorada'
type DetailId = 'umbral' | 'world-vinculos' | 'world-decretos' | 'world-hobbies' | 'world-travesias' | 'world-cuidado' | 'balance' | 'nucleo' | 'edad-dorada'

interface AxisDefinition {
  id: AxisId
  label: string
  icon: string
  phrase: string
}

const worlds = [
  { label: 'Vínculos', key: 'vinculos', gradient: 'oro', angle: 0, detail: 'world-vinculos' },
  { label: 'Decretos', key: 'decretos', gradient: 'lavanda', angle: 144, detail: 'world-decretos' },
  { label: 'Hobbies', key: 'hobbies', gradient: 'oro', angle: 216, detail: 'world-hobbies' },
  { label: 'Travesías', key: 'travesias', gradient: 'salvia', angle: 72, detail: 'world-travesias' },
  { label: 'Lo que cuido', lines: ['Lo que', 'cuido'], key: 'cuidado', gradient: 'ciruela', angle: 288, detail: 'world-cuidado' },
] as const
const detailIds: DetailId[] = ['umbral', 'world-vinculos', 'world-decretos', 'world-hobbies', 'world-travesias', 'world-cuidado', 'balance', 'edad-dorada']

const axes: AxisDefinition[] = [
  { id: 'umbral', label: 'Umbral', icon: 'sun', phrase: 'Un comienzo que orienta, sin imponer.' },
  { id: 'mundos', label: 'Mundos', icon: 'worlds', phrase: 'Lo que amas también dibuja quién eres.' },
  { id: 'balance', label: 'Mi Balance', icon: 'balance', phrase: 'Lo que registro no me define. Me orienta.' },
  { id: 'nucleo', label: 'Núcleo', icon: 'moon', phrase: 'Lo más íntimo permanece solo en este dispositivo.' },
  { id: 'edad-dorada', label: 'Edad Dorada', icon: 'star', phrase: 'Tu porvenir se construye desde lo que ya está naciendo.' },
]

function initialAxis(queryAxis: unknown): AxisId {
  const requested = typeof queryAxis === 'string' ? queryAxis : null
  if (axes.some((axis) => axis.id === requested)) return requested as AxisId
  const stored = sessionStorage.getItem('aureo_tailwind_axis')
  return axes.some((axis) => axis.id === stored) ? stored as AxisId : 'umbral'
}

const route = useRoute()
const router = useRouter()
const settingsActive = computed(() => route.name === 'configuracion-aureo')
const profile = useProfileStore()
const zodiacKey = computed(() => profile.profile?.signo?.toLowerCase() ?? 'aries')
const zodiacLabel = computed(() => signLabels[zodiacKey.value] ?? signLabels.aries)
const zodiacStyle = computed(() => {
  const color = signColors[zodiacKey.value] ?? signColors.aries
  return { '--zodiac-color': color, '--sign-color': color }
})
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
const selectedNucleusThoughtId = ref<string | null>(null)
const nucleusPreviewDialog = ref<HTMLElement | null>(null)
const balanceOverlay = ref<'movement' | 'goal' | null>(null)
const balanceOverlayDialog = ref<HTMLElement | null>(null)
const arcanaOverlayDialog = ref<HTMLElement | null>(null)
const balanceSaving = ref(false)
const arcanaHistory = ref<DailyArcana[]>([])
const showArcanaDeck = ref(false)
const nucleusUnlocked = ref(false)
const nucleusMelody = ref<string[]>([])
const nucleusHintNote = ref('')
const nucleusHinting = ref(false)
const nucleusError = ref('')
const notes = MELODY_NOTES
const balanceAmountVisible = ref(false)
const openingDone = ref(false)
const balanceMovementForm = reactive({ tipo: 'gasto' as 'ingreso' | 'gasto', monto: 0, categoria: 'El nido', nota: '', recurrente: false })
const balanceGoalForm = reactive({ nombre: '', objetivo: 0, color: '#C9A86A' })
const balanceCategories = ['El nido', 'El cuerpo', 'El movimiento', 'El cuidado', 'Lo inesperado', 'Lo que construyo']
const balanceGoalColors = [{ name: 'Suerte y fuerza', value: '#C0392B' }, { name: 'Dinero y prosperidad', value: '#C9A86A' }, { name: 'Nuevo comienzo', value: '#F5F0E6' }, { name: 'Crecimiento personal', value: '#9B7D9B' }, { name: 'Salud y bienestar', value: '#7D9B8A' }, { name: 'Trabajo y logros', value: '#5B8DB8' }, { name: 'Protección', value: '#2C2C2C' }, { name: 'Amor y cuidado propio', value: '#D4849A' }]
const nucleusRepository = new CollectionRepository<NucleusThought>(storage, 'nucleo_pensamientos')
const goldenRepository = new CollectionRepository<GoldenDeclaration>(storage, 'edad_dorada_declaraciones')
const balanceMovementRepository = new CollectionRepository<BalanceMovement>(storage, 'balance_movimientos')
const balanceGoalRepository = new CollectionRepository<Daruma>(storage, 'balance_darumas')
const arcanaRepository = new CollectionRepository<DailyArcana>(storage, 'umbral_arcanos')
const pulseRepository = new CollectionRepository<Pulse>(storage, 'pulso')
const ideaRepository = new CollectionRepository<Idea>(storage, 'ideas')
const pulses = ref<Pulse[]>([])
const pulseDraft = ref('')
const pulseSaving = ref(false)
const captureOpen = ref(false)
const captureText = ref('')
const captureStep = ref<'write' | 'classify'>('write')
const intentionDraft = ref('')
const maximIndex = ref(Math.floor(Math.random() * MAXIMS.length))
const maximFading = ref(false)
const lumenPref = ref<LumenMode>('auto')
const resolvedLumen = computed(() => resolveLumen(lumenPref.value))

const selected = computed(() => axes.find((axis) => axis.id === selectedId.value) ?? axes[0]!)
const goldenPreviewCracks = computed(() => goldenDarumaCrackPatterns.slice(0, Math.min(counts.value['edad-dorada'], goldenDarumaCrackPatterns.length)))
const balancePreviewAnchors = [[24, 44], [31, 31], [37, 48], [43, 27], [49, 40], [55, 23], [61, 36], [67, 28], [73, 44], [79, 33], [32, 57], [64, 54]] as const
const balancePreviewFlowers = computed(() => [...balanceMovements.value]
  .filter((item) => item.tipo === 'gasto')
  .reverse()
  .slice(0, balancePreviewAnchors.length)
  .map((item, index) => ({ item, x: balancePreviewAnchors[index]![0], y: balancePreviewAnchors[index]![1], delay: index * 55 })))
const balanceCurrency = computed(() => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }))
const balanceBaseIncome = ref(0)
const balanceTotal = computed(() => (Number.isFinite(balanceBaseIncome.value) ? balanceBaseIncome.value : 0) + balanceMovements.value.reduce((sum, item) => sum + (item.tipo === 'ingreso' ? item.monto : -item.monto), 0))
const balanceAmountLabel = computed(() => balanceAmountVisible.value ? balanceCurrency.value.format(balanceTotal.value) : '********')
async function toggleBalanceAmount() {
  balanceAmountVisible.value = !balanceAmountVisible.value
  await storage.set('balance_oculto', !balanceAmountVisible.value)
}
const greeting = computed(() => greetingForHour())
const umbralDate = computed(() => umbralDateLabel())
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
const card = computed(() => arcanaHistory.value.find((item) => item.fecha === localDateKey())?.nombre ?? arcana[(new Date().getDate() + new Date().getMonth()) % arcana.length]!)
const recentArcana = computed(() => recentDailyArcana(arcanaHistory.value))
const lunarPhaseIndex = computed(() => phaseIndexFor())
const lunarPhase = computed(() => LUNAR_PHASES[lunarPhaseIndex.value]!)
const dailyPrompt = computed(() => dailyPulsePrompt())
const todayPulse = computed(() => [...pulses.value].reverse().find((item) => item.fecha === localDateKey()))
const showCaptureSeal = computed(() => selectedId.value !== 'nucleo' && activeDetail.value !== 'world-cuidado' && activeDetail.value !== 'world-vinculos' && activeDetail.value !== 'world-travesias' && activeDetail.value !== 'world-hobbies' && activeDetail.value !== 'world-decretos')
const showCareMuralSeal = computed(() => activeDetail.value === 'world-cuidado' && !settingsActive.value)
const showConstellationSeal = computed(() => activeDetail.value === 'world-vinculos' && !settingsActive.value)
const showJourneySeal = computed(() => activeDetail.value === 'world-travesias' && !settingsActive.value)
const showHobbySeal = computed(() => activeDetail.value === 'world-hobbies' && !settingsActive.value)
const showDecreeSeal = computed(() => activeDetail.value === 'world-decretos' && !settingsActive.value)
const workspaceRef = ref<{ onCareImageChange: (event: Event) => Promise<void>; careImageLoading: boolean; openConstellationComposer: () => void; openJourneyComposer: () => void; openHobbyComposer: () => void; openDecreeComposer: () => void } | null>(null)
const currentMaxim = computed(() => MAXIMS[maximIndex.value] ?? MAXIMS[0]!)
const cardPhrase = computed(() => arcanaPhrase(card.value))
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
  setAxis(id)
  activeDetail.value = null
  detailAction.value = ''
  selectedNucleusThoughtId.value = null
  void router.replace({ name: 'laboratorio-tailwind', query: { axis: id } })
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
    if (world.key === 'cuidado') return [world.key, await collectionCount(['companeros', 'plantas', 'locuidado_memoria'])] as const
    return [world.key, await collectionCount([world.key])] as const
  }))
  worldCounts.value = Object.fromEntries(worldEntries)
  balanceMovements.value = (await storage.get<BalanceMovement[]>('balance_movimientos')) ?? []
  const storedIncome = await storage.get<number>('balance_ingreso_base')
  balanceBaseIncome.value = typeof storedIncome === 'number' && Number.isFinite(storedIncome) ? storedIncome : 0
  nucleusThoughts.value = (await storage.get<NucleusThought[]>('nucleo_pensamientos')) ?? []
  pulses.value = (await storage.get<Pulse[]>('pulso')) ?? []
  counts.value = {
    umbral: await collectionCount(['intenciones', 'pulso']),
    mundos: await collectionCount(['vinculos', 'companeros', 'plantas', 'locuidado_memoria', 'decretos', 'hobbies', 'travesias']),
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
  unlockTone()
  playTone(note)
  if (nucleusMelody.value.length >= 3) nucleusMelody.value = []
  nucleusMelody.value.push(note)
  if (nucleusMelody.value.length !== 3) return
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nucleusMelody.value.join('|')))
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
  if (hash === profile.profile?.clave_app_hash) {
    playChord(nucleusMelody.value)
    sessionStorage.setItem(`aureo_nucleo_${nucleusTimeBand()}`, '1')
    nucleusUnlocked.value = true
    nucleusError.value = ''
  } else {
    nucleusError.value = 'No es esa. Respira.'
    nucleusMelody.value = []
  }
}
let nucleusHintTimer = 0
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
watch(selectedId, (id) => {
  if (id === 'nucleo') captureOpen.value = false
  if (id !== 'umbral') showArcanaDeck.value = false
})
watch(activeDetail, (detail) => {
  if (detail === 'world-cuidado') captureOpen.value = false
})
watch(captureOpen, (value) => { if (!value) { captureStep.value = 'write'; captureText.value = '' } })

async function openDailyCard() {
  showArcanaDeck.value = true
  await nextTick()
  arcanaOverlayDialog.value?.focus()
}

function closeArcanaDeck() { showArcanaDeck.value = false }

function onCareMuralFabChange(event: Event) {
  void workspaceRef.value?.onCareImageChange(event)
}

function openConstellationComposer() {
  workspaceRef.value?.openConstellationComposer()
}

function openJourneyComposer() {
  workspaceRef.value?.openJourneyComposer()
}

function openHobbyComposer() {
  workspaceRef.value?.openHobbyComposer()
}

function openDecreeComposer() {
  workspaceRef.value?.openDecreeComposer()
}

function toggleArcanaDeck() {
  if (showArcanaDeck.value) closeArcanaDeck()
  else void openDailyCard()
}

async function setLumen(mode: 'dia' | 'noche') {
  lumenPref.value = mode
  await storage.set('umbral_lumen', mode)
}

function rotateMaxim() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const next = nextMaximIndex(maximIndex.value)
  if (reduced) {
    maximIndex.value = next
    void storage.set('maximaIdx', next)
    return
  }
  maximFading.value = true
  window.setTimeout(() => {
    maximIndex.value = next
    maximFading.value = false
    void storage.set('maximaIdx', next)
  }, 400)
}

async function rememberPulseInGoldenAge(respuesta: string) {
  const today = localDateKey()
  const declarations = await goldenRepository.all()
  const existing = declarations.find((item) => item.origen === 'pulso_umbral' && isSameLocalDay(item.timestamp, today))
  const now = new Date().toISOString()
  if (existing) await goldenRepository.update(existing.id, { texto: respuesta, timestamp: now })
  else await goldenRepository.add({ id: makeId(), texto: respuesta, timestamp: now, fecha_creacion: now, origen: 'pulso_umbral' })
}

async function saveCoverPulse() {
  const value = pulseDraft.value.trim()
  if (!value || pulseSaving.value) return
  pulseSaving.value = true
  try {
    if (todayPulse.value) pulses.value = await pulseRepository.update(todayPulse.value.id, { pregunta: dailyPrompt.value, respuesta: value })
    else pulses.value = await pulseRepository.add({ id: makeId(), pregunta: dailyPrompt.value, respuesta: value, fecha: localDateKey(), fecha_creacion: new Date().toISOString() })
    await rememberPulseInGoldenAge(value)
    pulseDraft.value = ''
    await refreshCounts()
  } finally { pulseSaving.value = false }
}

function submitCapture() {
  if (!captureText.value.trim()) return
  captureStep.value = 'classify'
}

async function classifyCapture(kind: 'hoy' | 'guardar') {
  const value = captureText.value.trim()
  if (!value) return
  if (kind === 'guardar') {
    await ideaRepository.add({ id: makeId(), texto: value, txt: value, palabraPoder: powerWord.value, ts: Date.now(), fecha_creacion: new Date().toISOString() })
    captureOpen.value = false
    captureText.value = ''
    captureStep.value = 'write'
    return
  }
  intentionDraft.value = value
  captureOpen.value = false
  captureText.value = ''
  captureStep.value = 'write'
  if (activeDetail.value !== 'umbral') openDetail('umbral')
}

onMounted(async () => {
  await refreshCounts()
  pulses.value = await pulseRepository.all()
  balanceAmountVisible.value = !((await storage.get<boolean>('balance_oculto')) ?? true)
  const storedLumen = await storage.get<LumenMode>('umbral_lumen')
  if (storedLumen === 'dia' || storedLumen === 'noche' || storedLumen === 'auto') lumenPref.value = storedLumen
  maximIndex.value = Math.floor(Math.random() * MAXIMS.length)
  await storage.set('maximaIdx', maximIndex.value)
  arcanaHistory.value = await arcanaRepository.all()
  if (!arcanaHistory.value.some((item) => item.fecha === localDateKey())) {
    arcanaHistory.value = await arcanaRepository.add({ id: `arcano-${localDateKey()}`, fecha: localDateKey(), nombre: card.value, fecha_creacion: new Date().toISOString() })
  }
  if (route.name === 'laboratorio-tailwind' && route.query.detail === 'nucleo') {
    await router.replace({ name: 'laboratorio-tailwind', query: { axis: 'nucleo' } })
  }
})
onBeforeUnmount(() => { window.clearTimeout(nucleusHintTimer) })
</script>

<template>
  <main class="tailwind-lab tw:min-h-svh tw:bg-noche tw:font-aureo tw:text-marfil tw:selection:bg-oro/30" :style="zodiacStyle" :data-zodiac="zodiacKey" :data-lumen="selectedId === 'umbral' ? resolvedLumen : undefined">
    <VueBitsLightRays
      v-if="selectedId === 'umbral' && !activeDetail && !settingsActive"
      class-name="umbral-light-rays"
      :color="resolvedLumen === 'dia' ? '#ead9a8' : '#c9a86a'"
      :speed="0.38"
      :spread="1.8"
      :length="2.2"
      :pointer-influence=".012"
      :fps="24"
      :dpr="1.25"
    />
    <div class="aureo-app-frame tw:grid tw:min-h-svh tw:w-full tw:lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside class="tw:hidden tw:border-r tw:border-oro/15 tw:bg-noche/95 tw:px-5 tw:py-6 tw:lg:sticky tw:lg:top-0 tw:lg:flex tw:lg:h-svh tw:lg:flex-col">
        <div class="tw:flex tw:items-center tw:gap-3 tw:px-2">
          <span class="aureo-lab-mark" aria-hidden="true"><span /></span>
          <div>
            <strong class="tw:block tw:text-2xl tw:font-light tw:leading-none tw:text-oro-claro">Áureo</strong>
            <span class="tw:mt-1 tw:block tw:font-sans tw:text-[0.68rem] tw:font-medium tw:text-marfil-suave">Tu universo personal</span>
          </div>
        </div>

        <nav class="desktop-axis-nav tw:mt-8 tw:grid tw:content-center tw:gap-1 tw:lg:flex-1" aria-label="Ejes de Áureo">
          <button
            v-for="axis in axes"
            :key="axis.id"
            type="button"
            class="tw:group tw:relative tw:grid tw:min-h-12 tw:w-full tw:grid-cols-[2rem_1fr_auto] tw:items-center tw:gap-3 tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-3 tw:text-left tw:font-sans tw:text-sm tw:font-medium tw:text-marfil-suave tw:transition-colors tw:duration-200 tw:ease-aureo tw:hover:text-marfil"
            :class="!settingsActive && selectedId === axis.id ? 'desktop-axis-active tw:text-oro-claro' : ''"
            :aria-pressed="!settingsActive && selectedId === axis.id"
            @click="chooseAxis(axis.id)"
          >
            <span class="desktop-axis-icon tw:grid tw:size-8 tw:place-items-center tw:rounded-full"><AppIcon :name="axis.icon" class="tw:size-4" /></span>
            <span>{{ axis.label }}</span>
            <span v-if="counts[axis.id] > 0" class="tw:font-sans tw:text-xs tw:tabular-nums tw:text-marfil-suave" :aria-label="`${counts[axis.id]} registros`">{{ counts[axis.id] }}</span>
          </button>
        </nav>

        <div class="tw:relative tw:z-10 tw:mt-auto tw:border-t tw:border-oro/15 tw:pt-5">
          <button type="button" class="tw:flex tw:min-h-11 tw:w-full tw:items-center tw:gap-3 tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-2 tw:py-1 tw:text-left tw:text-inherit" :class="settingsActive ? 'desktop-axis-active tw:text-oro-claro' : ''" aria-label="Abrir configuración de mi Áureo" :aria-pressed="settingsActive" @click="router.push('/configuracion')">
            <span class="tw:grid tw:size-10 tw:place-items-center tw:rounded-full tw:bg-oro-claro tw:font-sans tw:text-xs tw:font-semibold tw:text-noche">{{ initials }}</span>
            <div class="tw:min-w-0">
              <strong class="tw:block tw:truncate tw:text-sm tw:font-light">{{ profile.name || 'Tu espacio' }}</strong>
              <span class="zodiac-profile-tone tw:flex tw:items-center tw:gap-1.5 tw:font-sans tw:text-[0.68rem] tw:text-marfil-suave"><i aria-hidden="true" />{{ zodiacLabel }} · tu matiz</span>
            </div>
          </button>
        </div>
      </aside>

      <div class="aureo-main-column tw:min-w-0" :class="{ 'clears-mobile-nav': settingsActive || !activeDetail }">
        <div class="aureo-content-shell tw:px-5 tw:py-3 tw:sm:px-8 tw:sm:py-5 tw:lg:py-6">
          <div class="aureo-content-width tw:mx-auto tw:w-full">
            <section aria-live="polite">
              <AureoSettingsPage v-if="settingsActive" />
              <TailwindWorkspace v-else-if="activeDetail" ref="workspaceRef" :detail="activeDetail" :initial-action="detailAction" :intention-draft="intentionDraft" @close="closeDetail" @changed="refreshCounts" @draft-consumed="intentionDraft = ''" />
              <div v-else class="axis-home-lab tw:relative tw:min-w-0">
                <div v-if="selectedId === 'umbral'" class="axis-heading-lab umbral-heading" data-axis="umbral">
                    <div class="umbral-heading-bar">
                      <time :datetime="localDateKey()">{{ umbralDate }}</time>
                      <h1 class="axis-welcome-title tw:mb-0 tw:max-w-none tw:font-extralight tw:leading-[0.96] tw:tracking-[-0.03em] tw:text-marfil">{{ greeting }}</h1>
                      <div class="umbral-lumen" role="group" aria-label="Claridad de Umbral">
                        <button type="button" :aria-pressed="resolvedLumen === 'dia'" aria-label="Modo día" @click="setLumen('dia')"><AppIcon name="sun" /></button>
                        <button type="button" :aria-pressed="resolvedLumen === 'noche'" aria-label="Modo noche" @click="setLumen('noche')"><AppIcon name="moon" /></button>
                      </div>
                    </div>
                    <button type="button" class="umbral-maxim" :class="{ fading: maximFading }" @click="rotateMaxim">{{ currentMaxim }}</button>
                </div>
                <h1 v-else class="tw:sr-only">{{ selected.label }}</h1>

                <div class="ritual-stage-lab tw:relative tw:overflow-visible">
                  <Transition name="axis-ritual">
                  <section v-if="selectedId === 'umbral'" key="umbral" class="umbral-carta tw:grid tw:place-items-center tw:text-center" aria-label="Carta del día">
                    <div class="lab-celestial" aria-hidden="true">
                      <svg class="lab-constellation lab-constellation-one" viewBox="0 0 180 120" fill="none"><path d="M12 94 48 58 82 72 126 24 166 48"/><circle cx="12" cy="94" r="2.4"/><circle cx="48" cy="58" r="3"/><circle cx="82" cy="72" r="2.2"/><circle cx="126" cy="24" r="3.2"/><circle cx="166" cy="48" r="2.4"/></svg>
                      <svg class="lab-constellation lab-constellation-two" viewBox="0 0 130 120" fill="none"><path d="M10 30 42 52 68 18 88 70 120 96"/><circle cx="10" cy="30" r="2.2"/><circle cx="42" cy="52" r="2.8"/><circle cx="68" cy="18" r="2.2"/><circle cx="88" cy="70" r="3"/><circle cx="120" cy="96" r="2.4"/></svg>
                      <span class="lab-orbit lab-orbit-one" />
                      <span class="lab-orbit lab-orbit-two" />
                      <span class="lab-orbit lab-orbit-three" />
                    </div>
                    <div class="umbral-moon-stage">
                    <button type="button" class="axis-entry-button tw:relative tw:z-10 tw:grid tw:place-items-center tw:border-0 tw:bg-transparent" :aria-label="`Entrar al Umbral. Fase lunar: ${lunarPhase}`" @click="openDetail('umbral')">
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
                    </button>
                    <UmbralMoonStrip :active-index="lunarPhaseIndex" :label="lunarPhase" />
                    </div>
                    <dl class="umbral-orbit-data">
                      <div class="umbral-datum umbral-datum-number">
                        <dt>Número</dt>
                        <dd><button type="button" class="umbral-number-trigger" :aria-expanded="showArcanaDeck" aria-controls="umbral-arcana-history" :aria-label="`Abrir la carta del día. Número ${dayNumber}`" @click="openDailyCard">{{ dayNumber }}</button></dd>
                      </div>
                      <div class="umbral-datum umbral-datum-arcana">
                        <dt>Arcano</dt>
                        <dd class="tarot-reading">
                          <button type="button" class="tarot-open" :aria-expanded="showArcanaDeck" aria-controls="umbral-arcana-history" @click="toggleArcanaDeck">
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

                  <section v-else-if="selectedId === 'mundos'" key="mundos" class="worlds-stage-lab tw:grid tw:place-items-center tw:pt-2 tw:pb-1 tw:text-center" aria-label="Mundos">
                    <MundosNightSky />
                    <svg class="world-flower-lab" viewBox="-70 -60 440 420" role="group" aria-label="Accesos a tus mundos">
                      <defs>
                        <radialGradient id="lab-petal-oro" cx="48%" cy="22%" r="82%"><stop offset="0" stop-color="#c9a86a"/><stop offset=".52" stop-color="#6a5424"/><stop offset="1" stop-color="#0e0c08"/></radialGradient>
                        <radialGradient id="lab-petal-salvia" cx="48%" cy="22%" r="82%"><stop offset="0" stop-color="#7da797"/><stop offset=".52" stop-color="#3d5a50"/><stop offset="1" stop-color="#0b100e"/></radialGradient>
                        <radialGradient id="lab-petal-lavanda" cx="48%" cy="22%" r="82%"><stop offset="0" stop-color="#8173b7"/><stop offset=".52" stop-color="#433a62"/><stop offset="1" stop-color="#0c0b12"/></radialGradient>
                        <radialGradient id="lab-petal-ciruela" cx="48%" cy="22%" r="82%"><stop offset="0" stop-color="#9b7d9b"/><stop offset=".52" stop-color="#4e3a4e"/><stop offset="1" stop-color="#100b10"/></radialGradient>
                        <radialGradient id="lab-flower-halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ead6a7" stop-opacity=".42"/><stop offset="1" stop-color="#ead6a7" stop-opacity="0"/></radialGradient>
                      </defs>
                      <ellipse class="lab-flower-shadow" cx="150" cy="178" rx="78" ry="18"/>
                      <g
                        v-for="(world, index) in worlds"
                        :key="world.key"
                        class="lab-world-petal"
                        :class="{ lit: (worldCounts[world.key] ?? 0) > 0 }"
                        :transform="`rotate(${world.angle} 150 150)`"
                        :style="{ '--petal-index': index }"
                        role="button"
                        :aria-label="`${world.label}, ${worldCounts[world.key] ?? 0} registros`"
                        tabindex="0"
                        @click="openDetail(world.detail)"
                        @keydown.enter.space.prevent="openDetail(world.detail)"
                      >
                        <path class="lab-petal-surface" :fill="`url(#lab-petal-${world.gradient})`" d="M150 148C128 110 110 74 120 42C128 22 150 12 150 12C150 12 172 22 180 42C190 74 172 110 150 148Z"/>
                        <path class="lab-petal-filament" d="M150 138V28"/>
                        <text class="lab-petal-label" x="150" y="72" text-anchor="middle" dominant-baseline="middle" :transform="`rotate(${[72,144,216].includes(world.angle) ? 270 : 90} 150 72)`">
                          <template v-if="'lines' in world">
                            <tspan x="150" dy="-0.55em">{{ world.lines[0] }}</tspan>
                            <tspan x="150" dy="1.2em">{{ world.lines[1] }}</tspan>
                          </template>
                          <template v-else>{{ world.label }}</template>
                        </text>
                      </g>
                      <circle class="lab-flower-halo" cx="150" cy="150" r="34" fill="url(#lab-flower-halo)"/>
                      <circle class="lab-flower-heart" cx="150" cy="150" r="22"/>
                      <circle class="lab-flower-ring" cx="150" cy="150" r="12"/>
                      <circle class="lab-flower-seed" cx="150" cy="150" r="6"/>
                    </svg>
                    <p class="worlds-caption tw:mb-0 tw:italic tw:text-marfil-suave">Todo lo que ya es tuyo.</p>
                  </section>

                  <section v-else-if="selectedId === 'balance'" key="balance" class="balance-stage-lab tw:flex tw:flex-col tw:px-0 tw:pb-1 tw:sm:px-6" aria-label="Mi Balance">
                    <div class="balance-field-lab tw:relative tw:flex tw:flex-1 tw:flex-col tw:justify-center tw:text-center">
                      <span class="balance-sky-ring balance-sky-ring-one" aria-hidden="true" />
                      <span class="balance-sky-ring balance-sky-ring-two" aria-hidden="true" />
                      <span class="balance-sky-ring balance-sky-ring-three" aria-hidden="true" />
                      <div class="balance-home-reading">
                        <div class="balance-home-value-row">
                          <button type="button" class="balance-home-value" :aria-label="balanceAmountVisible ? `Lo que tengo hoy, ${balanceAmountLabel}` : 'Lo que tengo hoy, oculto'" @click="openDetail('balance')">
                            <span>Lo que tengo hoy</span>
                            <strong>{{ balanceAmountLabel }}</strong>
                          </button>
                          <button type="button" class="balance-amount-toggle" :aria-pressed="balanceAmountVisible" :aria-label="balanceAmountVisible ? 'Ocultar el dinero' : 'Mostrar el dinero'" @click="toggleBalanceAmount">
                            <AppIcon :name="balanceAmountVisible ? 'eye-off' : 'eye'" />
                          </button>
                        </div>
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
                        <span v-if="balancePreviewFlowers.length" class="balance-home-count">{{ balancePreviewFlowers.length }} {{ balancePreviewFlowers.length === 1 ? 'gasto florece' : 'gastos florecen' }} en tu árbol</span>
                      </button>
                    </div>
                    <div class="balance-home-actions">
                      <button type="button" class="tw:flex tw:min-h-11 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-full tw:border tw:border-oro tw:bg-oro/14 tw:px-3 tw:font-sans tw:text-xs tw:font-semibold tw:text-oro-claro tw:transition-[background-color,transform] tw:duration-200 tw:ease-aureo tw:hover:bg-oro/22 tw:active:scale-[0.985] tw:sm:text-sm" @click="openBalanceOverlay('movement')">
                        <AppIcon name="plus" class="tw:size-4" />
                        Registrar movimiento
                      </button>
                      <button type="button" class="tw:flex tw:min-h-11 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-full tw:border tw:border-oro/35 tw:bg-transparent tw:px-3 tw:font-sans tw:text-xs tw:font-semibold tw:text-marfil tw:transition-[border-color,transform] tw:duration-200 tw:ease-aureo tw:hover:border-oro tw:active:scale-[0.985] tw:sm:text-sm" @click="openBalanceOverlay('goal')">
                        <AppIcon name="star" class="tw:size-4" />
                        Nueva meta
                      </button>
                    </div>
                    <p class="balance-home-caption">Cada gasto abre una flor.</p>
                    <Teleport to="body">
                      <Transition name="balance-overlay">
                        <div v-if="balanceOverlay" class="balance-overlay-layer" role="presentation" @click.self="closeBalanceOverlay" @keydown.esc.stop="closeBalanceOverlay">
                        <section ref="balanceOverlayDialog" class="balance-overlay-sheet" tabindex="-1" role="dialog" aria-modal="true" :aria-labelledby="balanceOverlay === 'movement' ? 'balance-movement-title' : 'balance-goal-title'">
                          <header><div><AppIcon :name="balanceOverlay === 'movement' ? 'balance' : 'star'" /><h2 :id="balanceOverlay === 'movement' ? 'balance-movement-title' : 'balance-goal-title'">{{ balanceOverlay === 'movement' ? 'Registrar movimiento' : 'Crear una meta' }}</h2></div><button type="button" :aria-label="balanceOverlay === 'movement' ? 'Cerrar registro de movimiento' : 'Cerrar nueva meta'" @click="closeBalanceOverlay"><AppIcon name="close" /></button></header>
                          <form v-if="balanceOverlay === 'movement'" class="balance-overlay-form" @submit.prevent="saveBalanceMovement">
                            <div class="balance-overlay-row" role="group" aria-labelledby="balance-home-kind-label">
                              <span id="balance-home-kind-label">¿Cómo se mueve?</span>
                              <div class="balance-kind-buttons">
                                <button type="button" :class="{ active: balanceMovementForm.tipo === 'ingreso' }" @click="balanceMovementForm.tipo = 'ingreso'">Entra</button>
                                <button type="button" :class="{ active: balanceMovementForm.tipo === 'gasto' }" @click="balanceMovementForm.tipo = 'gasto'">Sale</button>
                              </div>
                            </div>
                            <label for="balance-home-amount" class="balance-overlay-row"><span>Monto</span><span class="balance-money-field"><span class="balance-money-sign" aria-hidden="true">$</span><input id="balance-home-amount" v-model.number="balanceMovementForm.monto" type="number" min="1" inputmode="decimal" required autofocus /></span></label>
                            <label for="balance-home-category" class="balance-overlay-row"><span>Categoría</span><select id="balance-home-category" v-model="balanceMovementForm.categoria"><option v-for="category in balanceCategories" :key="category">{{ category }}</option></select></label>
                            <label for="balance-home-note" class="balance-overlay-row"><span>Una nota, si la necesitas</span><input id="balance-home-note" v-model="balanceMovementForm.nota" maxlength="160" /></label>
                            <label class="balance-home-recurring"><input v-model="balanceMovementForm.recurrente" type="checkbox" /> Es un movimiento fijo mensual</label>
                            <button class="balance-overlay-save" type="submit" :disabled="balanceMovementForm.monto <= 0 || balanceSaving">{{ balanceSaving ? 'Guardando…' : 'Guardar movimiento' }}</button>
                          </form>
                          <form v-else class="balance-overlay-form" @submit.prevent="saveBalanceGoal">
                            <label for="balance-home-goal" class="balance-overlay-row"><span>¿Qué estás construyendo?</span><input id="balance-home-goal" v-model="balanceGoalForm.nombre" required maxlength="120" autofocus /></label>
                            <label for="balance-home-target" class="balance-overlay-row"><span>Meta</span><span class="balance-money-field"><span class="balance-money-sign" aria-hidden="true">$</span><input id="balance-home-target" v-model.number="balanceGoalForm.objetivo" type="number" min="1" inputmode="decimal" required /></span></label>
                            <div class="balance-overlay-row" role="group" aria-labelledby="balance-home-color-label">
                              <span id="balance-home-color-label">El color que la acompaña</span>
                              <div class="balance-color-swatches">
                                <button v-for="color in balanceGoalColors" :key="color.value" type="button" :style="{ '--goal-color': color.value }" :class="{ selected: balanceGoalForm.color === color.value }" :aria-label="color.name" :title="color.name" @click="balanceGoalForm.color = color.value" />
                              </div>
                            </div>
                            <button class="balance-overlay-save" type="submit" :disabled="!balanceGoalForm.nombre.trim() || balanceGoalForm.objetivo <= 0 || balanceSaving">{{ balanceSaving ? 'Guardando…' : 'Crear meta' }}</button>
                          </form>
                          </section>
                        </div>
                      </Transition>
                    </Teleport>
                  </section>

                  <section v-else-if="selectedId === 'nucleo'" key="nucleo" class="nucleus-home-lab tw:grid tw:w-full tw:place-items-center tw:gap-3 tw:py-1" aria-label="Núcleo">
                    <section v-if="!nucleusUnlocked" class="nucleus-home-gate" aria-label="Acceso a Núcleo">
                      <AppIcon name="moon" />
                      <h2>Tu sanctum</h2>
                      <p>Toca tu melodía para entrar.</p>
                      <div class="nucleus-home-progress" aria-label="Notas ingresadas"><span v-for="index in 3" :key="index" :class="{ filled: nucleusMelody[index - 1] }" /></div>
                      <div class="nucleus-home-notes"><button v-for="note in notes" :key="note" type="button" :class="{ hint: nucleusHintNote === note }" @click="pressNucleusNote(note)">{{ note }}</button></div>
                      <button type="button" class="nucleus-home-hint" :disabled="nucleusHinting" @click="hintNucleusMelody">{{ nucleusHinting ? 'Escucha el orden…' : 'Recordar mi melodía' }}</button>
                      <p v-if="nucleusError" class="nucleus-home-error" role="alert">{{ nucleusError }}</p>
                    </section>
                    <template v-else>
                    <div class="nucleus-home-cluster">
                    <label class="nucleus-invite" for="nucleus-thought">Escríbelo. Nadie más lo verá.</label>
                    <div class="nucleus-cloth-lab">
                      <span v-if="nucleusEmotionClusters.length" class="nucleus-preview-plasma" aria-hidden="true"><span v-for="emotion in nucleusEmotionClusters" :key="emotion.tone" class="nucleus-preview-pool" :style="{ left: `${emotion.x}%`, top: `${emotion.y}%`, '--emotion-color': emotion.color, '--plasma-index': emotion.index }" /></span>
                      <span v-if="!groupedNucleusThoughts.length" class="nucleus-light-lab" aria-hidden="true" />
                      <button v-for="entry in groupedNucleusThoughts" :key="entry.thought.id" type="button" class="nucleus-preview-point" :class="{ 'is-newest': entry.newest }" :style="{ left: `${entry.x}%`, top: `${entry.y}%`, '--thought-color': entry.emotion.color, '--thought-index': entry.index, '--thought-freshness': entry.freshness }" :aria-label="`Abrir ${entry.emotion.label.toLowerCase()}: ${entry.thought.texto}`" @click="openNucleusThought(entry.thought.id)"><span /></button>
                    </div>
                    <form class="nucleus-capture-lab" @submit.prevent="addNucleusThought">
                      <textarea id="nucleus-thought" v-model="nucleusThoughtText" rows="2" maxlength="1200" placeholder="Escribe lo que aparece…" />
                      <button v-if="nucleusThoughtText.trim()" type="submit" :disabled="nucleusSaving">{{ nucleusSaving ? 'Guardando…' : 'Dejarlo aquí' }}</button>
                    </form>
                    </div>
                    <Transition name="nucleus-preview-card"><div v-if="selectedNucleusThought && selectedNucleusEmotion" ref="nucleusPreviewDialog" class="nucleus-preview-layer" tabindex="-1" role="presentation" @click.self="selectedNucleusThoughtId = null" @keydown.esc.stop="selectedNucleusThoughtId = null"><article class="nucleus-preview-reading" role="dialog" aria-modal="true" aria-label="Pensamiento de Núcleo" :style="{ '--thought-color': selectedNucleusEmotion.color }"><header><div><span aria-hidden="true" /><strong>{{ selectedNucleusEmotion.label }}</strong><time>{{ nucleusThoughtDate(selectedNucleusThought.timestamp) }}</time></div><button type="button" aria-label="Cerrar pensamiento" @click="selectedNucleusThoughtId = null"><AppIcon name="close" /></button></header><AppIcon :name="selectedNucleusThought.simbolo" /><p>{{ selectedNucleusThought.texto }}</p></article></div></Transition>
                    </template>
                  </section>

                  <section v-else key="edad-dorada" class="golden-daruma-home tw:py-1" aria-label="Edad Dorada">
                    <button type="button" class="axis-entry-button golden-daruma-entry" aria-label="Toca el daruma para contemplar sus grietas" @click="openDetail('edad-dorada')">
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
                        <textarea id="golden-declaration-home" v-model="goldenDeclarationText" rows="2" maxlength="1200" placeholder="Declara este momento…" />
                        <button v-if="goldenDeclarationText.trim()" type="submit" :disabled="goldenSaving">{{ goldenSaving ? 'Formando…' : 'Formar una grieta' }}</button>
                      </form>
                      <p class="golden-daruma-hint">Toca el daruma para contemplar sus grietas</p>
                      <p v-if="goldenSaved" class="golden-daruma-saved" role="status"><AppIcon name="star" /> Una nueva grieta guarda este momento.</p>
                    </div>
                  </section>
                  </Transition>
                </div>

                <section v-if="selectedId === 'umbral'" class="umbral-threshold-notes" aria-label="Tu día en Umbral">
                  <Teleport to="body">
                    <Transition name="balance-overlay">
                      <div v-if="showArcanaDeck" class="balance-overlay-layer" role="presentation" @click.self="closeArcanaDeck" @keydown.esc.stop="closeArcanaDeck">
                        <section id="umbral-arcana-history" ref="arcanaOverlayDialog" class="balance-overlay-sheet arcana-overlay-sheet" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="umbral-mazo-title">
                          <header>
                            <div><AppIcon name="star" /><h2 id="umbral-mazo-title">Tu mazo diario</h2></div>
                            <button type="button" aria-label="Cerrar el mazo" @click="closeArcanaDeck"><AppIcon name="close" /></button>
                          </header>
                          <div class="arcana-overlay-stage">
                            <span class="tarot-deck arcana-overlay-deck" aria-hidden="true">
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
                            <p class="tarot-card-name arcana-overlay-name">{{ card }}</p>
                            <p class="today-carta-reading">{{ dayNumber }} · {{ lunarPhase }} · {{ dailySign }}</p>
                            <p class="today-carta-phrase">{{ cardPhrase }}</p>
                          </div>
                          <ol>
                            <li v-for="item in recentArcana" :key="item.id">
                              <time :datetime="item.fecha">{{ new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(`${item.fecha}T12:00:00`)) }}</time>
                              <strong>{{ item.nombre }}</strong>
                            </li>
                          </ol>
                        </section>
                      </div>
                    </Transition>
                  </Teleport>
                  <div class="umbral-day-cluster">
                  <button type="button" @click="openDetail('umbral')">
                    <span class="threshold-symbol"><AppIcon name="decree" /></span>
                    <span><small>Tu sello</small><strong>{{ powerWord }}</strong></span>
                  </button>
                  <button type="button" @click="openDetail('umbral')">
                    <span class="threshold-symbol"><AppIcon name="star" /></span>
                    <span><small>Lo que tengo en mente hoy</small><strong>{{ umbralEcho }}</strong></span>
                  </button>
                  </div>
                  <form class="umbral-pulse-card" @submit.prevent="saveCoverPulse">
                    <header>
                      <span class="threshold-symbol"><AppIcon name="sun" /></span>
                      <div>
                        <small>Mi pulso de hoy</small>
                        <strong>{{ dailyPrompt }}</strong>
                      </div>
                    </header>
                    <label for="umbral-pulse-home">
                      <span class="tw:sr-only">Respuesta a mi pulso de hoy</span>
                      <textarea id="umbral-pulse-home" v-model="pulseDraft" rows="2" maxlength="1200" placeholder="una palabra, una imagen, una sensación..." />
                    </label>
                    <button v-if="pulseDraft.trim()" type="submit" :disabled="pulseSaving">{{ pulseSaving ? 'Guardando…' : 'Guardar pulso' }}</button>
                  </form>
                </section>

              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <nav class="lab-mobile-nav tw:fixed tw:z-40 tw:grid tw:grid-cols-6 tw:border tw:border-oro/20 tw:bg-noche/95 tw:backdrop-blur-xl tw:lg:hidden" aria-label="Ejes de Áureo">
      <button
        v-for="axis in axes"
        :key="`mobile-${axis.id}`"
        type="button"
        class="tw:relative tw:grid tw:min-h-12 tw:min-w-0 tw:place-content-center tw:gap-0.5 tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-0.5 tw:font-sans tw:text-[0.55rem] tw:font-medium tw:text-marfil-suave"
        :class="!settingsActive && selectedId === axis.id ? 'mobile-axis-active tw:text-oro-claro' : ''"
        :aria-label="axis.label"
        :aria-pressed="!settingsActive && selectedId === axis.id"
        @click="chooseAxis(axis.id)"
      >
        <span class="mobile-axis-icon tw:mx-auto tw:grid tw:size-7 tw:place-items-center tw:rounded-full"><AppIcon :name="axis.icon" class="tw:size-4" /></span>
        <span class="tw:truncate">{{ axis.label }}</span>
      </button>
      <button
        type="button"
        class="tw:relative tw:grid tw:min-h-12 tw:min-w-0 tw:place-content-center tw:gap-0.5 tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-0.5 tw:font-sans tw:text-[0.55rem] tw:font-medium tw:text-marfil-suave"
        :class="settingsActive ? 'mobile-axis-active tw:text-oro-claro' : ''"
        aria-label="Abrir configuración de mi Áureo"
        :aria-pressed="settingsActive"
        @click="router.push('/configuracion')"
      >
        <span class="mobile-axis-icon tw:mx-auto tw:grid tw:size-7 tw:place-items-center tw:rounded-full"><AppIcon name="settings" class="tw:size-4" /></span>
        <span class="tw:truncate">Áureo</span>
      </button>
    </nav>
    <CaptureSeal v-model:open="captureOpen" v-model:text="captureText" :visible="showCaptureSeal && !settingsActive" :step="captureStep" @submit="submitCapture" @classify="classifyCapture" />
    <Transition name="fab-slot">
      <label v-if="showCareMuralSeal" key="care-fab" class="world-fab is-care" :class="{ loading: workspaceRef?.careImageLoading }">
        <input type="file" accept="image/*" :disabled="Boolean(workspaceRef?.careImageLoading)" aria-label="Elegir imagen para el mural" @change="onCareMuralFabChange" />
        <AppIcon name="plus" />
      </label>
      <button v-else-if="showConstellationSeal" key="vinculos-fab" type="button" class="world-fab is-vinculos" aria-label="Encender un vínculo" @click="openConstellationComposer">
        <AppIcon name="plus" />
      </button>
      <button v-else-if="showJourneySeal" key="travesias-fab" type="button" class="world-fab is-travesias" aria-label="Guardar una postal" @click="openJourneyComposer">
        <AppIcon name="plus" />
      </button>
      <button v-else-if="showHobbySeal" key="hobbies-fab" type="button" class="world-fab is-hobbies" aria-label="Sumar una espiral" @click="openHobbyComposer">
        <AppIcon name="plus" />
      </button>
      <button v-else-if="showDecreeSeal" key="decretos-fab" type="button" class="world-fab is-decretos" aria-label="Escribir un decreto" @click="openDecreeComposer">
        <AppIcon name="plus" />
      </button>
    </Transition>
    <OpeningMoment v-if="selectedId === 'umbral' && !activeDetail && !settingsActive && !openingDone" @done="openingDone = true" />
  </main>
</template>

<style scoped>
.tailwind-lab {
  --lab-gold: #c9a86a;
  --zodiac-color: #b86b56;
  max-width: 100%;
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
/* Un solo hueco para la barra móvil. El workspace ya reserva 4.75rem;
   repetirlo aquí inventaba scroll sobre fondo vacío. */
@media (max-width: 1023px) {
  .aureo-main-column.clears-mobile-nav {
    padding-bottom: calc(6.7rem + env(safe-area-inset-bottom));
  }
}
.tailwind-lab:is(.app-forward-enter-active,.app-back-enter-active,.app-forward-enter-from,.app-back-enter-from,.app-forward-enter-to,.app-back-enter-to) { transform: none !important; }
.tailwind-lab * { scrollbar-width: thin; }
.tailwind-lab *::-webkit-scrollbar { width: 10px; height: 10px; }
.tailwind-lab *::-webkit-scrollbar-track { background: #080b11; }
.tailwind-lab *::-webkit-scrollbar-thumb { border: 3px solid #080b11; border-radius: var(--radio-pill); background: rgba(201,168,106,.55); }
@media (max-width: 1023px) {
  .tailwind-lab { scrollbar-color: rgba(201,168,106,.5) transparent; }
  .tailwind-lab *::-webkit-scrollbar { width: 5px; height: 5px; }
  .tailwind-lab *::-webkit-scrollbar-track { background: transparent; }
  .tailwind-lab *::-webkit-scrollbar-thumb { border: 0; }
}

.aureo-lab-mark { position: relative; display: block; width: 42px; height: 42px; flex: 0 0 auto; border: 1px solid var(--lab-gold); border-radius: 50%; pointer-events: none; }
.aureo-lab-mark::before { content: ''; position: absolute; inset: 9px; border: 1px solid var(--zodiac-color); border-radius: 50%; }
.aureo-lab-mark span { position: absolute; inset: 17px; border-radius: 50%; background: #c9a86a; box-shadow:0 0 12px color-mix(in srgb,var(--zodiac-color) 54%,transparent); }
.zodiac-profile-tone i { display:block; width:.45rem; aspect-ratio:1; flex:0 0 auto; border:1px solid rgba(234,214,167,.58); border-radius:50%; background:var(--zodiac-color); }

.tailwind-lab :is(button, a):focus-visible { outline: 2px solid #ead6a7 !important; outline-offset: 3px; box-shadow:0 0 0 1px var(--zodiac-color); }
.axis-entry-button { color: inherit; font: inherit; cursor: pointer; transition: filter var(--dur-2) cubic-bezier(.23,1,.32,1); }
.axis-entry-button:hover { filter: brightness(1.08); }
.aureo-moon { width: 5.1rem; height: 5.1rem; overflow: visible; filter: drop-shadow(0 12px 24px rgba(0,0,0,.38)); transition: filter .45s ease; }
.moon-atmosphere { fill: none; stroke: rgba(201,168,106,.16); stroke-width: 1; stroke-dasharray: 2 7; transform-origin: 48px 48px; animation: moon-atmosphere-turn 18s linear infinite; }
.moon-light { fill: url(#aureo-moon-light); }
.moon-shadow { fill: url(#aureo-moon-night); }
.moon-markings { fill: none; stroke: rgba(128,94,39,.34); stroke-width: 1.15; stroke-linecap: round; }
.moon-rim { fill: none; stroke: rgba(234,214,167,.72); stroke-width: 1.1; }
.moon-orbit-point { fill: #ead6a7; filter: drop-shadow(0 0 5px #c9a86a); }
.moon-phase-label { position: absolute; top: 72%; max-width: 7rem; color: #b9b3aa; font: 600 var(--texto-1)/1.25 system-ui,sans-serif; letter-spacing: .09em; text-transform: uppercase; text-wrap: balance; }
.umbral-moon-stage { position: relative; z-index: 4; display: grid; justify-items: center; gap: .3rem; }
/* El área de toque crece con un pseudo-elemento para no alterar la composición. */
.umbral-number-trigger { position: relative; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.umbral-number-trigger::after { content: ''; position: absolute; top: 50%; left: 50%; width: var(--toque); height: var(--toque); transform: translate(-50%, -50%); }
.umbral-datum-number { pointer-events: auto; }
.today-carta-reading { margin: 0 0 .85rem; color: #ead6a7; font: 300 var(--texto-4)/1.45 Spectral, 'Aureo Serif', Georgia, serif; }
.umbral-pulse-card { grid-column: 1 / -1; display: grid; gap: .3rem; min-width: 0; padding: .5rem .7rem .55rem; border-block: 1px solid rgba(201,168,106,.28); background: radial-gradient(circle at 0 0, rgba(201,168,106,.09), transparent 48%); }
.umbral-pulse-card header { display: grid; grid-template-columns: 1.65rem minmax(0,1fr); align-items: center; gap: .5rem; }
.umbral-pulse-card textarea { width: 100%; min-height: 2rem; box-sizing: border-box; resize: vertical; padding: .25rem .1rem; border: 0; border-bottom: 1px solid rgba(201,168,106,.34); border-radius: 0; outline: 0; background: transparent; color: #f4efe5; font: 300 var(--texto-3)/1.4 Georgia, 'Times New Roman', serif; caret-color: #ead6a7; }
/* El foco engrosa el filete y deja un halo: un cambio de color de 1px no se ve. */
.umbral-pulse-card textarea:focus { border-bottom-color: #ead6a7; border-bottom-width: 2px; padding-bottom: calc(.25rem - 1px); box-shadow: 0 14px 24px -22px rgba(234,214,167,.75); }
.umbral-pulse-card > button { justify-self: end; min-height: 44px; min-width: 9.5rem; border: 1px solid #c9a86a; border-radius: var(--radio-pill); background: rgba(201,168,106,.14); color: #ead6a7; font: 300 var(--texto-3)/1 Georgia, 'Times New Roman', serif; cursor: pointer; }
.umbral-pulse-card > button:disabled { cursor: wait; opacity: .58; }
@keyframes moon-atmosphere-turn { to { transform: rotate(360deg); } }
.mobile-axis-active::after { content: ''; position: absolute; left: 50%; bottom: .08rem; width: 4px; height: 4px; border:1px solid #ead6a7; border-radius: 50%; background:var(--zodiac-color); transform: translateX(-50%); }
.desktop-axis-nav button::before { content: ''; position: absolute; left: 0; width: 1px; height: 1.25rem; border-radius: var(--radio-pill); background: transparent; transform: scaleY(.4); transition: background-color var(--dur-2) cubic-bezier(.23,1,.32,1), transform var(--dur-2) cubic-bezier(.23,1,.32,1); }
.desktop-axis-nav button:hover .desktop-axis-icon { color: #ead6a7; background: rgba(201,168,106,.07); }
.desktop-axis-active::before { background:linear-gradient(#c9a86a,var(--zodiac-color)) !important; transform: scaleY(1) !important; }
.desktop-axis-icon { border: 1px solid transparent; transition: color var(--dur-2) cubic-bezier(.23,1,.32,1), background-color var(--dur-2) cubic-bezier(.23,1,.32,1), border-color var(--dur-2) cubic-bezier(.23,1,.32,1); }
.desktop-axis-active .desktop-axis-icon { border-color:color-mix(in srgb,var(--zodiac-color) 58%,#c9a86a); background:color-mix(in srgb,var(--zodiac-color) 10%,transparent); }
.lab-mobile-nav button:focus-visible { outline: none !important; }
.lab-mobile-nav { left: max(.85rem, env(safe-area-inset-left)) !important; right: max(.85rem, env(safe-area-inset-right)) !important; bottom: max(.55rem, env(safe-area-inset-bottom)) !important; width: auto !important; max-width: none; box-sizing: border-box; padding: .18rem .28rem .16rem; border: 1px solid rgba(201,168,106,.22); border-radius: var(--radio-pill); transform: none !important; box-shadow: 0 14px 36px rgba(0,0,0,.38); }
.lab-mobile-nav button:focus-visible .mobile-axis-icon { box-shadow: 0 0 0 2px #080b11, 0 0 0 4px #ead6a7; }
.mobile-axis-icon { border: 1px solid transparent; transition: color var(--dur-2) cubic-bezier(.23,1,.32,1), background-color var(--dur-2) cubic-bezier(.23,1,.32,1), border-color var(--dur-2) cubic-bezier(.23,1,.32,1); }
.mobile-axis-active .mobile-axis-icon { border-color:color-mix(in srgb,var(--zodiac-color) 58%,#c9a86a); background:color-mix(in srgb,var(--zodiac-color) 10%,transparent); }

.axis-heading-lab { position: relative; animation: axis-heading-in var(--dur-3) cubic-bezier(.23,1,.32,1) both; }
.axis-welcome-title { font-size:clamp(1.7rem,4.4vw,2.55rem); }
.axis-heading-lab::after { content: ''; position: absolute; left: 0; bottom: 0; width: 4.5rem; height: 1px; background:linear-gradient(90deg,#c9a86a 0 42%,var(--zodiac-color) 68%,transparent); }
.axis-heading-lab>div:first-child { min-width: 0; }
.axis-heading-lab.umbral-heading { display: grid; justify-items: center; gap: .28rem; text-align: center; }
.axis-heading-lab.umbral-heading .umbral-heading-bar { justify-self: stretch; }
.umbral-carta { position: relative; min-height: 15.5rem; padding: .15rem 0 .2rem; }
.worlds-stage-lab { min-height: 22rem; }
.worlds-caption { margin-top: -1.35rem; font-size: var(--texto-4); }
.nucleus-privacy-note { margin: 0; color: #b9b3aa; font: 500 var(--texto-1)/1.35 system-ui, sans-serif; letter-spacing: .04em; }
.nucleus-home-cluster { display: grid; justify-items: center; gap: .7rem; width: min(100%, 34rem); }
.nucleus-invite { width: 100%; margin: 0; color: #d6cedf; font: 300 clamp(var(--texto-5), 2.4vw, var(--texto-6))/1.15 Georgia, 'Times New Roman', serif; text-align: center; text-wrap: balance; }
.nucleus-capture-lab textarea, .golden-daruma-capture textarea, .umbral-pulse-card textarea { resize: none; }
.balance-home-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; width: min(100%, 34rem); margin: .35rem auto 0; }
.umbral-heading .axis-welcome-title { font-family: Fraunces, 'Aureo Serif', Georgia, serif; font-weight: 200; font-size: clamp(var(--texto-4), 3.6vw, var(--texto-6)); }
.umbral-heading::after { left: 50%; width: min(38vw, 7.5rem); transform: translateX(-50%); }
.umbral-heading-bar { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; gap: .4rem; width: 100%; }
.umbral-heading-bar time { justify-self: start; color: #c9c1b5; font: 300 var(--texto-3)/1.3 Spectral, 'Aureo Serif', Georgia, serif; white-space: nowrap; }
.umbral-heading-bar .axis-welcome-title { justify-self: center; text-align: center; white-space: nowrap; }
.umbral-heading-bar .umbral-lumen { justify-self: end; }
.umbral-lumen { display: flex; align-items: center; justify-content: flex-end; gap: .05rem; }
/* Iconos dibujados, no glifos Unicode; y el área de toque completa. */
.umbral-lumen button { display: grid; width: var(--toque); height: var(--toque); place-items: center; padding: 0; border: 0; border-radius: var(--radio-pill); background: transparent; color: rgba(201, 168, 106, .62); cursor: pointer; transition: color var(--respuesta), background-color var(--respuesta); }
.umbral-lumen button svg { width: 1.05rem; }
.umbral-lumen button:hover { background: rgba(201, 168, 106, .08); color: #ead6a7; }
.umbral-lumen button[aria-pressed="true"] { background: rgba(201, 168, 106, .14); color: #ead6a7; }
/* Alto reservado para dos líneas: alcanza el área de toque y evita que al rotar la
   máxima se muevan la fecha y los botones de claridad. */
.umbral-maxim { display: inline-flex; max-width: 34rem; min-height: var(--toque); align-items: center; margin: .05rem 0 0; padding: 0; border: 0; background: transparent; color: #c9a86a; font: italic 300 var(--texto-3)/1.45 Spectral, 'Aureo Serif', Georgia, serif; cursor: pointer; transition: opacity .4s ease; }
.umbral-maxim.fading { opacity: 0; }
.today-carta-phrase { margin: .15rem 0 1.05rem; color: #c9a86a; font: italic 300 var(--texto-5)/1.5 Spectral, 'Aureo Serif', Georgia, serif; }
.axis-heading-meta { display: grid; flex: 0 0 auto; justify-items: end; gap: 1rem; text-align: right; }
.axis-heading-meta time { color: #b9b3aa; font: 500 var(--texto-1)/1.35 system-ui,sans-serif; white-space: nowrap; }
.axis-date-short { display: none; }
.axis-sigil-lab { border-color:color-mix(in srgb,var(--zodiac-color) 42%,#c9a86a) !important; background:color-mix(in srgb,var(--zodiac-color) 7%,transparent); box-shadow:0 14px 34px rgba(0,0,0,.2),inset 0 0 0 1px rgba(201,168,106,.06); }
.ritual-stage-lab { display:grid; isolation: isolate; min-height:0; }
.ritual-stage-lab > section { min-height:0; }
.ritual-stage-lab > .umbral-carta { min-height: 15.5rem; }
.ritual-stage-lab > .worlds-stage-lab { min-height: 22rem; }
@keyframes axis-heading-in { from { opacity: .65; transform: translateY(6px); } }
.axis-ritual-enter-active { transition: opacity var(--dur-1) cubic-bezier(.23,1,.32,1); }
.ritual-stage-lab > .axis-ritual-leave-active { position:absolute; z-index:2; inset:0 0 auto; width:100%; pointer-events:none; transition:opacity var(--dur-1) ease-out; }
.axis-ritual-enter-from { opacity: .55; }
.axis-ritual-leave-to { opacity: 0; }

.balance-stage-lab { position: relative; }
.balance-field-lab { isolation:isolate; min-height:0; perspective:700px; transform-style:preserve-3d; }
.balance-field-lab::before { content:''; position:absolute; inset:3% 0 2%; z-index:-2; background:radial-gradient(circle at 50% 34%,rgba(233,182,198,.1),transparent 20%),radial-gradient(circle at 60% 40%,color-mix(in srgb,var(--zodiac-color) 10%,transparent),transparent 44%); mask-image:linear-gradient(to bottom,transparent,#000 12%,#000 88%,transparent); }
.balance-sky-ring { position:absolute; z-index:-1; left:50%; top:44%; border:1px solid rgba(201,168,106,.23); border-radius:50%; transform:translate(-50%,-50%) rotateX(68deg) rotateZ(-12deg); filter:drop-shadow(0 12px 20px rgba(0,0,0,.18)); animation:balance-sky-turn 16s linear infinite; }
.balance-sky-ring-one { width:23rem; height:23rem; }
.balance-sky-ring-two { width:33rem; height:33rem; border-color:color-mix(in srgb,var(--zodiac-color) 32%,transparent); animation-duration:24s; animation-direction:reverse; }
.balance-sky-ring-three { width:43rem; height:43rem; border-color:rgba(201,168,106,.09); animation-duration:34s; }
.balance-tree-entry { position:relative; display:block; width:min(100%,28rem); aspect-ratio:720/560; margin-inline:auto; padding:0; overflow:visible; border:0; border-radius:0; background:transparent; color:#f4efe5; cursor:pointer; }
.balance-home-reading { position:relative; z-index:6; width:100%; margin:0 auto .1rem; text-align:center; }
.balance-home-value-row { display:grid; grid-template-columns:2.75rem auto 2.75rem; align-items:center; justify-content:center; width:max-content; max-width:100%; margin-inline:auto; column-gap:.15rem; }
.balance-home-value { display:grid; justify-items:center; gap:.35rem; margin:0; border:0; background:transparent; color:#f4efe5; text-align:center; cursor:pointer; grid-column:2; }
.balance-home-value span { color:#b9b3aa; font: 600 var(--texto-1)/1 system-ui,sans-serif; text-transform:uppercase; letter-spacing:.1em; }
.balance-home-value strong { color:#ead6a7; font-size:clamp(1.55rem,4.5vw,2.15rem); font-weight:200; font-variant-numeric:tabular-nums; letter-spacing:.08em; padding-inline-start:.08em; }
.balance-amount-toggle { display:grid; width:2.75rem; height:44px; place-items:center; margin-top:1.05rem; border:0; background:transparent; color:#ead6a7; cursor:pointer; grid-column:3; }
.balance-amount-toggle svg { width:1.2rem; }
.balance-home-caption { max-width:36ch; margin:.55rem auto 0; color:#b9b3aa; font-style:italic; line-height:1.45; text-align:center; }
.balance-tree-entry:focus-visible { outline:2px solid #ead6a7; outline-offset:5px; }
.balance-home-tree { position:absolute; inset:0; width:100%; height:100%; overflow:visible; transition:filter var(--dur-2) ease,transform var(--dur-3) cubic-bezier(.16,1,.3,1); }
.balance-home-pot{fill:#30241f;stroke:#c0987a;stroke-width:2}.balance-home-pot-rim{fill:#563b30;stroke:#d0a185;stroke-width:2}
.balance-tree-entry:is(:hover,:focus-visible) .balance-home-tree { filter:brightness(1.08); transform:translateY(-.25rem); }
.balance-home-ground { fill:rgba(0,0,0,.42); filter:blur(8px); }
.balance-home-trunk { fill:url(#balance-home-trunk); stroke:rgba(234,214,167,.18); stroke-width:1; }
.balance-home-trunk-light { fill:rgba(244,218,198,.1); }
.balance-home-branch,.balance-home-twig { fill:none; stroke:url(#balance-home-branch); stroke-linecap:round; stroke-linejoin:round; }
.balance-home-branch { stroke-width:13; }.balance-home-twig { stroke-width:5; }.balance-home-tree .branch-two,.balance-home-tree .branch-five { stroke-width:9; }.balance-home-tree .branch-four { stroke-width:11; }
.privacy-seal-lab { position:absolute; z-index:5; left:50%; top:19%; width:max-content; padding:5px 10px; border:1px solid rgba(125,167,151,.54); border-radius: var(--radio-pill); background:#171d29; color:#c4dfd5; box-shadow:0 8px 20px rgba(0,0,0,.3); font: 700 var(--texto-1)/1 system-ui,sans-serif; letter-spacing:.08em; text-transform:uppercase; transform:translateX(-50%); }
.balance-home-blossom { position:absolute; z-index:3; width:28px; height:28px; opacity:0; filter:blur(4px); transform:translate(-50%,-50%); animation:balance-home-bloom var(--dur-3) var(--flower-delay) cubic-bezier(.16,1,.3,1) forwards; }
.balance-home-blossom i { position:absolute; left:8px; top:1px; width:11px; height:15px; border-radius:70% 70% 58% 58%; background:linear-gradient(155deg,#fff0f2,#e9b6c6 58%,#b9788d); box-shadow:0 5px 12px rgba(32,11,20,.2); transform:rotate(calc((var(--petal) - 1) * 72deg)) translateY(-5px); transform-origin:5.5px 12px; }
.balance-home-blossom b { position:absolute; left:11px; top:11px; width:6px; height:6px; border-radius:50%; background:#d6aa68; box-shadow:0 2px 7px rgba(214,170,104,.45); }
.balance-home-count { position:absolute; z-index:4; left:50%; bottom:2%; width:max-content; max-width:80%; color:#aaa197; font: 500 var(--texto-1)/1.4 system-ui,sans-serif; letter-spacing:.03em; transform:translateX(-50%); }
.balance-overlay-layer { position:fixed; z-index:80; inset:0; display:grid; place-items:center; padding:clamp(1rem,4vw,2.5rem); background:rgba(4,6,10,.72); backdrop-filter:blur(9px); }
.balance-overlay-sheet { position:relative; width:min(100%,32rem); max-height:min(38rem,calc(100svh - 2rem)); box-sizing:border-box; overflow:auto; padding:clamp(1rem,3vw,1.35rem); border:1px solid rgba(201,168,106,.3); border-radius:16px; outline:0; background:radial-gradient(circle at 92% 2%,rgba(233,182,198,.1),transparent 32%),#0d121b; box-shadow:0 28px 80px rgba(0,0,0,.58); }
.balance-home-recurring{display:flex!important;grid-template-columns:none!important;align-items:center;gap:.55rem;color:#c9c1b5;font: 300 var(--texto-2)/1.35 Georgia,'Times New Roman',serif}.balance-home-recurring input{width:18px!important;min-height:18px!important;flex:0 0 auto}
.balance-overlay-sheet::before { content:''; position:absolute; inset:0 auto 0 0; width:1px; background:linear-gradient(transparent,#c9a86a,transparent); }
.balance-overlay-sheet>header { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; margin-bottom:.7rem; }
.balance-overlay-sheet>header>div { display:flex; align-items:center; gap:.55rem; min-width:0; }.balance-overlay-sheet>header>div>svg { width:1.05rem; flex:0 0 auto; color:#d7b873; }.balance-overlay-sheet h2 { margin:0; color:#f4efe5; font: 300 clamp(var(--texto-5),2.6vw,var(--texto-6))/1.1 Georgia,'Times New Roman',serif; letter-spacing:-.02em; }
.balance-overlay-sheet>header>button { display:grid; width:44px; height:44px; flex:0 0 auto; place-items:center; margin:-.65rem -.65rem 0 0; border:0; background:transparent; color:#d8d1c6; cursor:pointer; }.balance-overlay-sheet>header>button svg { width:1rem; }
.balance-overlay-sheet :is(button,input,select):focus-visible { outline:2px solid #ead6a7; outline-offset:2px; }
.balance-overlay-form { display:grid; gap:.55rem; }
.balance-overlay-row { display:grid; grid-template-columns:minmax(5.5rem,auto) minmax(0,1fr); align-items:center; gap:.28rem .7rem; color:#c9c1b5; font: 300 var(--texto-2)/1.25 Georgia,'Times New Roman',serif; }
.balance-overlay-row>span:first-child { max-width:11rem; }
.balance-overlay-row>span:first-child { min-width:0; }
.balance-overlay-form :is(input,select) { width:100%; min-height:2.2rem; box-sizing:border-box; padding:.2rem .1rem; border:0; border-bottom:1px solid rgba(201,168,106,.34); border-radius:0; outline:0; background:transparent; color:#f4efe5; font: 300 var(--texto-3)/1.3 Georgia,'Times New Roman',serif; caret-color:#ead6a7; }
.balance-overlay-form :is(input,select):focus { border-bottom-color:#ead6a7; background:linear-gradient(180deg,transparent,rgba(201,168,106,.04)); }
.balance-overlay-form select { color-scheme:dark; min-height:2.2rem; }
.balance-money-field { display:flex; align-items:baseline; gap:.28rem; min-width:0; border-bottom:1px solid rgba(201,168,106,.34); }
.balance-money-field:focus-within { border-bottom-color:#ead6a7; }
.balance-money-field input { border-bottom:0; padding:.15rem 0; min-height:2.1rem; }
.balance-money-sign { flex:0 0 auto; color:#d7b873; font: 300 var(--texto-4)/1 Georgia,'Times New Roman',serif; }
.balance-overlay-form input[type=number] { appearance:textfield; -moz-appearance:textfield; }
.balance-overlay-form input[type=number]::-webkit-outer-spin-button,.balance-overlay-form input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.balance-kind-buttons,.balance-color-swatches { display:flex; flex-wrap:nowrap; align-items:center; gap:.32rem; min-width:0; }
.balance-kind-buttons button { min-height:40px; flex:1 1 5.25rem; border:1px solid rgba(201,168,106,.27); border-radius: var(--radio-pill); background:transparent; color:#c9c1b5; font: 300 var(--texto-2)/1 Georgia,'Times New Roman',serif; cursor:pointer; }
.balance-kind-buttons button.active { border-color:#c9a86a; background:rgba(201,168,106,.13); color:#ead6a7; }
.balance-color-swatches button { width:28px; height:28px; flex:0 0 auto; padding:0; border:2px solid transparent; border-radius:50%; background:var(--goal-color); cursor:pointer; }
.balance-color-swatches button.selected { border-color:#f4efe5; outline:2px solid #c9a86a; outline-offset:2px; }
.balance-overlay-save { min-height:44px; margin-top:.1rem; border:1px solid #c9a86a; border-radius: var(--radio-pill); background:rgba(201,168,106,.14); color:#ead6a7; font: 300 var(--texto-3)/1 Georgia,'Times New Roman',serif; cursor:pointer; }.balance-overlay-save:is(:hover,:focus-visible) { background:rgba(201,168,106,.22); }.balance-overlay-save:disabled { cursor:not-allowed; opacity:.46; }
.balance-overlay-enter-active,.balance-overlay-leave-active { transition:opacity var(--dur-2) ease; }.balance-overlay-enter-active .balance-overlay-sheet,.balance-overlay-leave-active .balance-overlay-sheet { transition:transform var(--dur-3) cubic-bezier(.16,1,.3,1),filter var(--dur-2) ease; }.balance-overlay-enter-from,.balance-overlay-leave-to { opacity:0; }.balance-overlay-enter-from .balance-overlay-sheet,.balance-overlay-leave-to .balance-overlay-sheet { filter:blur(5px); transform:translateY(1rem) scale(.96); }
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

.umbral-orbit-data { position: absolute; z-index: 5; inset: 0; margin: 0; pointer-events: none; }
.umbral-datum { position: absolute; min-width: 5.5rem; padding: .55rem .7rem .62rem; border: 1px solid rgba(201,168,106,.22); background: rgba(8,11,17,.88); box-shadow: 0 12px 26px rgba(0,0,0,.26); text-align: center; animation: umbral-object-reveal var(--dur-3) cubic-bezier(.16,1,.3,1) both; }
.umbral-datum dt { color: #b9b3aa; font: 300 var(--texto-2)/1.3 Spectral, 'Aureo Serif', Georgia, serif; letter-spacing: .03em; }
.umbral-datum dd { max-width: 9rem; margin: .25rem 0 0; color: #ead6a7; font-family: Fraunces, 'Aureo Serif', Georgia, serif; font-size: var(--texto-6); font-weight: 300; line-height: 1.05; text-wrap: balance; }
.umbral-datum-number { left: 3%; right: auto; top: calc(2% + 2.65rem); bottom: auto; animation-delay: var(--dur-1); }
.umbral-datum-arcana { left: auto; right: 2%; top: 2%; bottom: auto; width: 8.75rem; pointer-events:auto; animation-delay: var(--dur-2); }
@keyframes umbral-object-reveal { from { opacity: .32; filter: blur(6px); clip-path: inset(0 50%); } to { opacity: 1; filter: blur(0); clip-path: inset(0); } }

.tarot-reading { display: grid; justify-items: center; gap: .42rem; }
.tarot-open{display:grid;justify-items:center;padding:.25rem;border:0;background:transparent;color:inherit;cursor:pointer}.tarot-open:focus-visible{outline:2px solid #ead6a7;outline-offset:4px}.tarot-open small{margin-top:.3rem;color:#9f978d;font: 300 var(--texto-1)/1.3 Spectral,'Aureo Serif',Georgia,serif;letter-spacing:.03em}
.tarot-deck { position: relative; display: block; width: 4.65rem; height: 4.85rem; margin-top: .3rem; perspective: 360px; }
.tarot-card { position: absolute; left: 50%; top: 0; display: grid; width: 2.75rem; height: 4.25rem; place-items: center; border: 1px solid rgba(234,214,167,.72); border-radius: 4px; transform-origin: 50% 90%; box-shadow: 0 10px 22px rgba(0,0,0,.38); }
.tarot-card-back { background: #111724; }
.tarot-card-back::before { content: ''; position: absolute; inset: 4px; border: 1px solid rgba(129,115,183,.68); border-radius: 2px; }
.tarot-card-mark { position: relative; width: 1.05rem; aspect-ratio: 1; border: 1px solid rgba(234,214,167,.8); transform: rotate(45deg); }
.tarot-card-mark::before { content: ''; position: absolute; inset: 3px; border: 1px solid rgba(129,115,183,.85); border-radius: 50%; }
.tarot-card-back-left { z-index: 1; transform: translateX(calc(-50% - .38rem)) rotate(-7deg); animation: tarot-shuffle-left 1.45s cubic-bezier(.16,1,.3,1) var(--dur-3) both; }
.tarot-card-back-right { z-index: 2; transform: translateX(calc(-50% + .38rem)) rotate(7deg); animation: tarot-shuffle-right 1.45s cubic-bezier(.16,1,.3,1) var(--dur-3) both; }
.tarot-card-face { z-index: 3; color: #ead6a7; background: radial-gradient(circle at 50% 38%, rgba(201,168,106,.18), transparent 48%), #171d29; transform: translateX(-50%) translateY(-.18rem); animation: tarot-card-reveal 1.75s cubic-bezier(.16,1,.3,1) var(--dur-3) both; backface-visibility: hidden; }
.tarot-card-face svg { width: 2.35rem; stroke: currentColor; stroke-width: 1; }
.tarot-card-name { max-width: 8rem; color: #ead6a7; font-family: Fraunces, 'Aureo Serif', Georgia, serif; font-size: var(--texto-4); font-weight: 300; line-height: 1.05; text-wrap: balance; }
.arcana-overlay-sheet { width: min(100%, 28rem); max-height: min(40rem, calc(100svh - 2rem)); }
.arcana-overlay-stage { display: grid; justify-items: center; gap: .28rem; padding: .15rem 0 .55rem; text-align: center; }
.arcana-overlay-deck { width: 6.2rem; height: 6.5rem; margin: .1rem 0 .45rem; }
.arcana-overlay-deck .tarot-card { width: 3.4rem; height: 5.25rem; }
.arcana-overlay-deck .tarot-card-face svg { width: 2.85rem; }
.arcana-overlay-name { max-width: 16rem; margin: 0; font-size: var(--texto-6); }
.arcana-overlay-sheet .today-carta-reading { margin: .2rem 0 0; font-size: var(--texto-3); }
.arcana-overlay-sheet .today-carta-phrase { margin: .1rem 0 0; max-width: 32ch; font-size: var(--texto-4); }
.arcana-overlay-sheet ol { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.4rem, 1fr)); gap: .35rem .55rem; margin: .7rem 0 0; padding: .7rem 0 0; border-top: 1px solid rgba(201,168,106,.2); list-style: none; }
.arcana-overlay-sheet li { display: grid; gap: .12rem; padding: .35rem .1rem .45rem; border-bottom: 1px solid rgba(201,168,106,.14); }
.arcana-overlay-sheet time { color: #9f978d; font: 300 var(--texto-2)/1.3 Spectral, 'Aureo Serif', Georgia, serif; }
.arcana-overlay-sheet strong { color: #ead6a7; font-family: Fraunces, 'Aureo Serif', Georgia, serif; font-weight: 300; font-size: var(--texto-3); }
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

.umbral-threshold-notes { display: grid; gap: .35rem; width: min(100%, 44rem); margin: .1rem auto 0; padding-bottom: .35rem; }
/* Columnas iguales: los dos datos del día tienen el mismo peso. */
.umbral-day-cluster { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .4rem; }
.umbral-threshold-notes .umbral-day-cluster>button { position: relative; display: grid; min-width: 0; min-height: var(--toque); grid-template-columns: 1.65rem minmax(0,1fr); align-items: center; gap: .5rem; overflow: hidden; border: 0; background: radial-gradient(circle at 0 0, rgba(201,168,106,.09), transparent 48%); color: #f4efe5; padding: .4rem .65rem; text-align: left; cursor: pointer; }
.umbral-threshold-notes .umbral-day-cluster>button:hover,.umbral-threshold-notes .umbral-day-cluster>button:focus-visible { background-color: rgba(201,168,106,.05); }
.threshold-symbol { display: grid; width: 1.65rem; aspect-ratio: 1; place-items: center; border: 1px solid rgba(201,168,106,.35); border-radius: 50%; color: #c9a86a; }
.threshold-symbol svg { width: .85rem; }
.umbral-threshold-notes small { display: block; margin-bottom: .08rem; color: #b9b3aa; font: 300 var(--texto-1)/1.25 Spectral, 'Aureo Serif', Georgia, serif; letter-spacing: .02em; }
.umbral-threshold-notes strong { display: block; overflow-wrap: anywhere; color: #ead6a7; font-family: Fraunces, 'Aureo Serif', Georgia, serif; font-size: var(--texto-3); font-weight: 300; line-height: 1.15; text-wrap: balance; }

.worlds-stage-lab { position: relative; overflow: visible; }
.worlds-stage-lab::before {
  content: '';
  position: absolute;
  z-index: -1;
  width: min(82vw, 28rem);
  aspect-ratio: 1;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 48%, transparent 38%, color-mix(in srgb, var(--zodiac-color, var(--oro)) 10%, transparent) 52%, transparent 68%);
  box-shadow: inset 0 0 70px rgba(0, 0, 0, .28);
  -webkit-mask-image: radial-gradient(circle, #000 28%, transparent 72%);
  mask-image: radial-gradient(circle, #000 28%, transparent 72%);
}
.world-flower-lab {
  position: relative;
  z-index: 1;
  display: block;
  width: min(92vw, 26rem);
  overflow: visible;
  animation: flower-suspension 7s ease-in-out infinite;
}
.worlds-caption { position: relative; z-index: 1; }
.lab-flower-shadow { fill: rgba(9, 7, 15, .42); }
.lab-world-petal { cursor: pointer; }
.lab-petal-surface {
  stroke: none;
  transform-box: fill-box;
  transform-origin: center;
  fill-opacity: .38;
  animation: petal-breathe 6.4s ease-in-out infinite;
  animation-delay: calc(var(--petal-index) * -.72s);
}
.lab-world-petal.lit .lab-petal-surface { fill-opacity: 1; }
.lab-petal-filament {
  fill: none;
  stroke: #ead6a7;
  stroke-width: 1.15;
  stroke-linecap: round;
  opacity: 0;
  pointer-events: none;
}
.lab-world-petal.lit .lab-petal-filament { opacity: .72; }
.lab-petal-label {
  fill: #f4efe5;
  font: 300 var(--texto-3) / 1 Spectral, 'Aureo Serif', Georgia, serif;
  letter-spacing: .01em;
  paint-order: stroke;
  pointer-events: none;
  stroke: rgba(8, 11, 17, .7);
  stroke-width: 3.5px;
  stroke-linejoin: round;
}
.lab-world-petal:not(.lit) .lab-petal-label { fill: #c4bdb0; }
.lab-world-petal:is(:hover, :focus-visible) .lab-petal-label { fill: #fff9e8; }
.lab-world-petal.lit:is(:hover, :focus-visible) .lab-petal-filament { opacity: 1; }
.lab-world-petal:is(:hover, :focus-visible) .lab-petal-surface { fill-opacity: 1; }
.lab-flower-heart { fill: #080b11; }
.lab-flower-ring {
  fill: none;
  stroke: color-mix(in srgb, #c9a86a 70%, #ead6a7);
  stroke-width: 1.2;
}
.lab-flower-seed {
  fill: #ead6a7;
  animation: flower-seed-pulse 3.8s ease-in-out infinite;
}
.lab-world-petal:focus-visible { outline: none; }
.lab-world-petal:focus-visible .lab-petal-surface { stroke: #f4efe5; stroke-width: 2.4px; }
@keyframes flower-suspension {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-.32rem); }
}
@keyframes petal-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
@keyframes flower-seed-pulse {
  0%, 100% { opacity: .78; }
  50% { opacity: 1; }
}

.nucleus-cloth-lab {
  position: relative;
  isolation: isolate;
  width: min(100%, 28rem);
  aspect-ratio: 1;
  overflow: visible;
  border-radius: 50%;
  background:
    radial-gradient(circle closest-side at 50% 42%, rgba(129, 115, 183, .22), transparent 32%),
    radial-gradient(circle closest-side at 38% 32%, #1c2030 0%, #121624 86%, #080b11 96%, transparent 100%);
  background-size: 130% 130%, 100% 100%;
  box-shadow: inset 0 0 42px rgba(8, 11, 17, .35);
  animation: nucleus-cloth-current 8s ease-in-out infinite alternate;
}
.nucleus-light-lab {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  width: 11px;
  height: 11px;
  border: 1px solid color-mix(in srgb, #e4cfa8 72%, #ead6a7);
  border-radius: 50%;
  background: #e4cfa8;
  box-shadow: 0 0 12px color-mix(in srgb, #e4cfa8 55%, transparent), 0 8px 28px color-mix(in srgb, #8173b7 28%, transparent);
  transform: translate(-50%, -50%);
  animation: nucleus-light-breathe 3.8s cubic-bezier(.23, 1, .32, 1) infinite;
}
.nucleus-light-lab::after {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px solid rgba(228, 207, 168, .46);
  border-radius: 50%;
}
.nucleus-entry-core { width:min(68%,19rem); min-height:44px; color:#f4efe5; }
.nucleus-capture-lab { display:grid; width:min(100%,28rem); gap:.55rem; padding:0 .15rem; border:0; background:transparent; text-align:left; }
.nucleus-capture-lab textarea { width:100%; min-height:3.6rem; box-sizing:border-box; resize:none; border:0; border-bottom:1px solid rgba(129,115,183,.42); border-radius:0; outline:0; background:transparent; color:#f4efe5; caret-color:#c9a86a; padding:.65rem .1rem; font: 400 var(--texto-4)/1.5 Georgia,'Times New Roman',serif; transition:border-color var(--dur-2) ease,box-shadow var(--dur-2) ease; }
.nucleus-capture-lab textarea::placeholder { color:#938d85; opacity:1; }
.nucleus-capture-lab textarea:focus-visible { border-bottom-color:#ead6a7; background:linear-gradient(180deg,transparent,rgba(129,115,183,.05)); box-shadow:0 14px 24px -22px rgba(129,115,183,.75); }
.nucleus-capture-lab button { justify-self:end; min-height:44px; border:1px solid rgba(201,168,106,.44); border-radius: var(--radio-pill); background:rgba(201,168,106,.12); color:#ead6a7; padding:.65rem 1.1rem; font: 600 var(--texto-2)/1 system-ui,sans-serif; cursor:pointer; transition:background-color var(--dur-2) ease,border-color var(--dur-2) ease,transform var(--dur-1) ease; }
.nucleus-capture-lab button:hover,.nucleus-capture-lab button:focus-visible { border-color:#c9a86a; background:rgba(201,168,106,.2); }
.nucleus-capture-lab button:focus-visible { outline:2px solid #f4efe5; outline-offset:3px; }
.nucleus-capture-lab button:active { transform:scale(.98); }
.nucleus-capture-lab button:disabled { cursor:wait; opacity:.58; }
.nucleus-preview-plasma { position:absolute; z-index:1; inset:6%; overflow:hidden; border-radius:50%; pointer-events:none; }
.nucleus-home-gate{display:grid;width:min(100%,34rem);justify-items:center;gap:1.2rem;padding:clamp(1.5rem,5vw,3rem);border-block:1px solid rgba(201,168,106,.24);background:radial-gradient(circle at 50% 35%,rgba(129,115,183,.13),transparent 60%);text-align:center}.nucleus-home-gate>svg{width:3rem;color:#8173b7}.nucleus-home-gate h2{margin:0;color:#f4efe5;font-size:var(--texto-8);font-weight:250}.nucleus-home-gate p{margin:0;color:#b9b3aa;font-style:italic}.nucleus-home-progress{display:flex;gap:.65rem}.nucleus-home-progress span{width:.55rem;aspect-ratio:1;border:1px solid rgba(201,168,106,.48);border-radius:50%}.nucleus-home-progress span.filled{background:#c9a86a;box-shadow:0 0 12px rgba(201,168,106,.45)}.nucleus-home-notes{display:grid;width:100%;grid-template-columns:repeat(7,minmax(0,1fr));gap:.4rem}.nucleus-home-notes button{min-height:48px;border:1px solid rgba(201,168,106,.25);border-radius:10px;background:#0d121b;color:#ead6a7;cursor:pointer}.nucleus-home-notes button:active{background:#c9a86a;color:#080b11;transform:translateY(2px)}.nucleus-home-hint{min-height:44px;padding:.55rem 1rem;border:1px solid rgba(201,168,106,.38);border-radius: var(--radio-pill);background:transparent;color:#ead6a7;font: 600 var(--texto-2)/1 system-ui,sans-serif;cursor:pointer}.nucleus-home-hint:disabled{opacity:.62;cursor:wait}.nucleus-home-error{color:#c47a5a!important}
.nucleus-preview-pool { position:absolute; width:52%; aspect-ratio:1; border-radius:46% 54% 63% 37%/55% 43% 57% 45%; background:radial-gradient(circle at 42% 38%,color-mix(in srgb,var(--emotion-color) 72%,transparent),color-mix(in srgb,var(--emotion-color) 28%,transparent) 44%,transparent 74%); filter:blur(22px); opacity:.58; transform:translate(-50%,-50%); animation:nucleus-preview-plasma 8.6s ease-in-out infinite alternate; animation-delay:calc(var(--plasma-index) * -1.2s); }
.nucleus-preview-point { position:absolute; z-index:20; display:grid; width:46px; height:46px; place-items:center; border:0; border-radius:50%; background:transparent; transform:translate(-50%,-50%); cursor:pointer; }
.nucleus-preview-point>span { --spark: calc(8.5px + 5.5px * (1 - min(var(--thought-freshness, 8), 8) / 8)); position:relative; width: var(--spark); height: var(--spark); border:1px solid color-mix(in srgb,var(--thought-color) 70%,#ead6a7); border-radius:50%; background:var(--thought-color); box-shadow:0 0 12px color-mix(in srgb,var(--thought-color) 58%,transparent),0 8px 26px color-mix(in srgb,var(--thought-color) 42%,transparent); }
.nucleus-preview-point>span::after { content:''; position:absolute; inset:-8px; border:1px solid color-mix(in srgb,var(--thought-color) 38%,transparent); border-radius:50%; transform:scale(.72); transition:transform var(--dur-2) cubic-bezier(.16,1,.3,1),border-color var(--dur-2) ease; }
.nucleus-preview-point.is-newest>span { animation:nucleus-preview-point-pulse 3.8s ease-in-out infinite; }
.nucleus-preview-point.is-newest>span::after { border-color:color-mix(in srgb,var(--thought-color) 58%,#ead6a7); transform:scale(1); }
.nucleus-preview-point:hover>span::after,.nucleus-preview-point:focus-visible>span::after { border-color:var(--thought-color); transform:scale(1); }
.nucleus-preview-point:focus-visible { outline:2px solid #f4efe5; outline-offset:1px; }
.nucleus-preview-layer { position:fixed; z-index:90; inset:0; display:grid; place-items:center; padding:1.25rem; background:rgba(4,6,10,.72); backdrop-filter:blur(6px); }
.nucleus-preview-layer:focus { outline:none; }
.nucleus-preview-reading { position:relative; width:min(100%,28rem); box-sizing:border-box; padding:1.35rem 1.4rem 1.5rem; border:1px solid color-mix(in srgb,var(--thought-color) 38%,transparent); border-radius:14px; background:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--thought-color) 11%,transparent),transparent 44%),#0d121b; box-shadow:0 24px 62px rgba(0,0,0,.46); text-align:left; }
.nucleus-preview-reading::before { content:''; position:absolute; inset:0 auto 0 0; width:1px; background:linear-gradient(transparent,var(--thought-color),transparent); }
.nucleus-preview-reading header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.15rem; }
.nucleus-preview-reading header>div { display:grid; grid-template-columns:.65rem minmax(0,1fr); align-items:center; gap:.3rem .55rem; min-width:0; }
.nucleus-preview-reading header>div>span { width:.6rem; aspect-ratio:1; border-radius:50%; background:var(--thought-color); box-shadow:0 5px 14px color-mix(in srgb,var(--thought-color) 46%,transparent); }
.nucleus-preview-reading header strong { color:color-mix(in srgb,var(--thought-color) 76%,#f4efe5); font: 600 var(--texto-3)/1.25 system-ui,sans-serif; }
.nucleus-preview-reading header time { grid-column:2; color:#a9a2b1; font: 500 var(--texto-1)/1.3 system-ui,sans-serif; }
.nucleus-preview-reading header button { display:grid; width:44px; height:44px; flex:0 0 auto; place-items:center; margin:-.75rem -.75rem 0 0; border:0; background:transparent; color:#d6cedf; cursor:pointer; }
.nucleus-preview-reading header button svg { width:1rem; }
.nucleus-preview-reading>svg { width:1.45rem; color:var(--thought-color); filter:drop-shadow(0 7px 14px color-mix(in srgb,var(--thought-color) 26%,transparent)); }
.nucleus-preview-reading p { max-height:min(46svh,22rem); margin:1rem 0 0; overflow:auto; color:#f4efe5; line-height:1.65; white-space:pre-wrap; }
.nucleus-preview-card-enter-active,.nucleus-preview-card-leave-active { transition:opacity var(--dur-2) ease; }.nucleus-preview-card-enter-active .nucleus-preview-reading,.nucleus-preview-card-leave-active .nucleus-preview-reading { transition:transform var(--dur-3) cubic-bezier(.16,1,.3,1),filter var(--dur-2) ease; }.nucleus-preview-card-enter-from,.nucleus-preview-card-leave-to { opacity:0; }.nucleus-preview-card-enter-from .nucleus-preview-reading,.nucleus-preview-card-leave-to .nucleus-preview-reading { filter:blur(5px); transform:translateY(1rem) scale(.94); }
@keyframes nucleus-light-breathe { 0%,100% { opacity: .55; } 52% { opacity: 1; } }
@keyframes nucleus-cloth-current { from { background-position:42% 44%, 50% 50%; } to { background-position:58% 56%, 50% 50%; } }
@keyframes nucleus-preview-plasma { 0% { border-radius:46% 54% 63% 37%/55% 43% 57% 45%; filter:blur(19px) brightness(.86); transform:translate(-53%,-48%) scale(.86); } 50% { border-radius:61% 39% 42% 58%/43% 62% 38% 57%; filter:blur(14px) brightness(1.08); transform:translate(-46%,-54%) scale(1.12); } 100% { border-radius:39% 61% 54% 46%/64% 38% 62% 36%; filter:blur(17px) brightness(.96); transform:translate(-50%,-47%) scale(.96); } }
@keyframes nucleus-preview-point-pulse { 0%,100% { opacity:.64; transform:scale(.78); } 50% { opacity:1; transform:scale(1.18); } }

.golden-daruma-home { display:grid; width:min(100%,42rem); grid-template-columns:minmax(13rem,16rem) minmax(16rem,1fr); align-items:center; justify-content:center; gap:clamp(1rem,3vw,1.75rem); margin-inline:auto; }
.golden-daruma-entry { display:grid; width:100%; min-width:0; place-items:center; gap:.25rem; padding:0 1rem .5rem; border:0; background:transparent; color:#f4efe5; cursor:pointer; }
.golden-daruma-entry-art { position:relative; display:block; width:100%; aspect-ratio:360/450; }
.golden-daruma-entry-art svg { position:relative; z-index:1; display:block; width:100%; height:100%; overflow:visible; animation:golden-daruma-entry-breathe 6.5s ease-in-out infinite; }
.golden-daruma-entry-aura { position:absolute; inset:20% 3% 5%; border-radius:50%; background:radial-gradient(circle,color-mix(in srgb,var(--sign-color) 24%,transparent),transparent 68%); filter:blur(24px); opacity:.62; transition:opacity var(--dur-2) ease; }
.golden-daruma-entry-ground { fill:#020305; opacity:.68; filter:blur(5px); }
.golden-daruma-entry-form { filter:drop-shadow(0 20px 16px rgba(0,0,0,.48)); transition:filter var(--dur-2) ease; }
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
.golden-daruma-entry-copy strong { color:#ead6a7; font: 300 clamp(var(--texto-6),3vw,var(--texto-7))/1.05 Georgia,'Times New Roman',serif; }
.golden-daruma-entry-copy>span { color:#bdb6aa; font: var(--texto-4)/1.5 system-ui,sans-serif; }
.golden-daruma-entry:hover .golden-daruma-entry-form,.golden-daruma-entry:focus-visible .golden-daruma-entry-form { filter:drop-shadow(0 22px 20px rgba(0,0,0,.56)) brightness(1.12); }
.golden-daruma-entry:hover .golden-daruma-entry-aura,.golden-daruma-entry:focus-visible .golden-daruma-entry-aura { opacity:1; }
.golden-daruma-practice { display:grid; align-content:center; gap:1rem; min-width:0; }
.golden-daruma-capture { display:grid; gap:.8rem; }
.golden-daruma-capture label { color:#ead6a7; font: 300 clamp(var(--texto-5),2.4vw,var(--texto-6))/1.15 Georgia,'Times New Roman',serif; }
.golden-daruma-capture textarea { width:100%; min-height:4rem; box-sizing:border-box; resize:none; padding:.65rem .1rem; border:0; border-bottom:1px solid rgba(201,168,106,.4); border-radius:0; outline:0; background:transparent; color:#f4efe5; font: var(--texto-4)/1.5 Georgia,'Times New Roman',serif; }
.golden-daruma-capture textarea::placeholder { color:#938d85; opacity:1; }
.golden-daruma-capture textarea:focus { border-bottom-color:#ead6a7; background:linear-gradient(180deg,transparent,rgba(201,168,106,.04)); box-shadow:0 14px 24px -22px rgba(234,214,167,.75); }
.golden-daruma-capture>button { justify-self:end; min-width:11rem; min-height:44px; padding:.7rem 1.1rem; border:1px solid rgba(201,168,106,.68); border-radius:14px; background:rgba(201,168,106,.13); color:#ead6a7; font: 600 var(--texto-2)/1 system-ui,sans-serif; cursor:pointer; transition:background-color var(--dur-2) ease,border-color var(--dur-2) ease; }
.golden-daruma-capture>button:hover { border-color:#ead6a7; background:rgba(201,168,106,.21); }
.golden-daruma-capture>button:disabled { cursor:wait; opacity:.58; }
.golden-daruma-saved { display:flex; align-items:center; gap:.55rem; margin:0; color:#cfc5b0; font: var(--texto-3)/1.45 system-ui,sans-serif; }
.golden-daruma-saved svg { width:1rem; flex:0 0 auto; color:#ead6a7; }
.golden-daruma-hint { margin:0; color:#c9a86a; font: 300 var(--texto-2)/1.35 Fraunces,'Aureo Serif',Georgia,serif; }
@keyframes golden-daruma-entry-breathe { 0%,100% { filter:brightness(.94) saturate(.94); } 50% { filter:brightness(1.06) saturate(1.04); } }

@media (max-width: 639px) {
  .axis-heading-lab { justify-content: space-between !important; padding-inline: 0; text-align: left; }
  .axis-heading-lab.umbral-heading { justify-content: center !important; justify-items: center; text-align: center; }
  .axis-heading-lab.umbral-heading .umbral-heading-bar { justify-self: stretch; }
  .axis-heading-lab::after { left: 0; transform: none; }
  .axis-heading-lab.umbral-heading::after { left: 50%; transform: translateX(-50%); }
  .ritual-stage-lab { margin-top: .2rem; }
  .ritual-stage-lab { max-width: 100%; }
  .lab-orbit-one { width: min(19rem, 82vw); height: min(19rem, 82vw); }
  .lab-orbit-two { width: min(28rem, 112vw); height: min(28rem, 112vw); }
  .lab-orbit-three { width: min(31rem, 138vw); height: min(31rem, 138vw); }
  .balance-sky-ring-one { width: min(15rem, 76vw); height: min(15rem, 76vw); }
  .balance-sky-ring-two { width: min(21rem, 104vw); height: min(21rem, 104vw); }
  .balance-sky-ring-three { width: min(28rem, 132vw); height: min(28rem, 132vw); }
  .balance-field-lab { min-height:0; }
  .balance-tree-entry { width:min(92vw,20.5rem); max-width:20.5rem; margin-inline:auto; transform:none; left:auto; }
  .privacy-seal-lab { top:18%; font-size: var(--texto-1); }
  .balance-home-count { max-width:76%; }
  .balance-overlay-layer { align-items:end; padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom)); }
  .balance-overlay-sheet { width:100%; max-height:min(42rem,calc(100svh - 1rem)); padding:1rem 1.05rem calc(1.15rem + env(safe-area-inset-bottom)); }
  .arcana-overlay-sheet { max-height: min(38rem, calc(100svh - 1rem)); }
  .balance-overlay-row { grid-template-columns:minmax(5.25rem,auto) minmax(0,1fr); gap:.22rem .55rem; }
  .balance-overlay-row>span:first-child { max-width:9.5rem; }
  .balance-color-swatches { flex-wrap:wrap; }
  .golden-daruma-home { width:100%; grid-template-columns:minmax(0,1fr); gap:.75rem; }
  .golden-daruma-entry { width:100%; max-width:13.5rem; margin-inline:auto; }
  .golden-daruma-practice { width:min(100%,30rem); margin-inline:auto; }
  .golden-daruma-capture textarea { min-height:3.6rem; }
  .golden-daruma-capture>button { width:100%; }
  .umbral-datum { min-width: 4.5rem; padding: .45rem .5rem .5rem; }
  .umbral-datum dd { max-width: 7.5rem; font-size: var(--texto-5); }
  .umbral-datum-number { left: 0; right: auto; top: calc(0% + 1.15rem); bottom: auto; }
  .umbral-datum-arcana { left: auto; right: 0; top: 0; bottom: auto; width: 6.85rem; padding: .38rem .4rem .42rem; }
  .umbral-datum-arcana .tarot-deck { width: 3.7rem; height: 3.55rem; margin-top: .08rem; margin-bottom: 0; }
  .umbral-datum-arcana .tarot-card { width: 2.15rem; height: 3.25rem; }
  .umbral-datum-arcana .tarot-card-face svg { width: 1.85rem; }
  .umbral-datum-arcana .tarot-card-name { max-width: 6.4rem; font-size: var(--texto-3); }
  .umbral-datum-arcana .tarot-open small { margin-top: .1rem; font-size: var(--texto-1); }
  .tarot-deck { transform: scale(.9); transform-origin: center top; margin-bottom: -.45rem; }
  .tarot-card-name { max-width: 7rem; font-size: var(--texto-4); }
  .umbral-threshold-notes { grid-template-columns: minmax(0,1fr); gap: .35rem; }
  .umbral-day-cluster { grid-template-columns: 1fr; }
  .umbral-threshold-notes .umbral-day-cluster>button { min-height: 2.55rem; }
  .nucleus-preview-layer { align-items:end; padding:1rem 1rem calc(7.25rem + env(safe-area-inset-bottom)); }
  .nucleus-preview-reading { width:100%; }
  .nucleus-capture-lab { width:100%; padding-top:.15rem; }
  .nucleus-capture-lab textarea { min-height:3.4rem; }
}

@media (max-width: 360px) {
  .balance-home-actions { grid-template-columns: minmax(0, 1fr); }
  .world-flower-lab { width: min(94vw, 23rem); }
  .axis-heading-lab h1 { font-size: clamp(var(--texto-7), 11vw, var(--texto-8)) !important; }
}

@media (max-width: 420px) {
  .axis-date-full { display: none; }
  .axis-date-short { display: inline; }
}

@media (max-width: 760px) and (max-height: 520px) {
  .axis-heading-lab { padding-bottom: .5rem; }
  .ritual-stage-lab { min-height: 0 !important; }
  .golden-daruma-entry { width:min(15rem,52svh) !important; }
  .golden-daruma-entry-copy { margin-top:-1.5rem; }
  .golden-daruma-practice { grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:.5rem 1rem; }
  .golden-daruma-capture { grid-column:1/-1; grid-template-columns:minmax(0,1fr) auto; align-items:end; }
  .golden-daruma-capture label { grid-column:1/-1; font-size: var(--texto-6); }
  .golden-daruma-capture textarea { min-height:3.5rem; max-height:5rem; }
  .golden-daruma-capture>button { width:auto; }
  .golden-daruma-hint,.golden-daruma-saved { grid-column:1/-1; margin:0; }
  .nucleus-cloth-lab { width: min(22rem, 58svh); }
}

@media (min-width: 640px) {
  .balance-field-lab { min-height: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .lab-orbit, .balance-sky-ring, .balance-home-blossom, .world-flower-lab, .lab-flower-shadow, .lab-petal-surface, .lab-flower-seed, .nucleus-cloth-lab, .nucleus-light-lab, .nucleus-preview-pool, .nucleus-preview-point>span, .golden-daruma-entry-art svg, .umbral-datum, .moon-atmosphere, .tarot-card { animation: none; }
  .umbral-light-rays,.mundos-night-sky{display:none}
  .balance-home-blossom { opacity:1; filter:none; transform:translate(-50%,-50%); }
  .balance-overlay-enter-active,.balance-overlay-leave-active,.balance-overlay-enter-active .balance-overlay-sheet,.balance-overlay-leave-active .balance-overlay-sheet { transition-duration:1ms; }
  .axis-heading-lab { animation: none; }
  .umbral-maxim { transition-duration: 1ms; }
  .axis-ritual-enter-active, .axis-ritual-leave-active { transition-duration: 1ms; }
  .nucleus-preview-card-enter-active,.nucleus-preview-card-leave-active,.nucleus-preview-card-enter-active .nucleus-preview-reading,.nucleus-preview-card-leave-active .nucleus-preview-reading { transition-duration:1ms; }
  /* Tope general: ninguna transición queda por encima del primer escalón. */
  .tailwind-lab * { transition-duration: var(--dur-1) !important; }
}

/* v1.3 — capas espaciales de Vue Bits y superficies menos administrativas. */
.umbral-light-rays{position:fixed!important;z-index:1!important;inset:0!important;width:100vw!important;height:100svh!important;pointer-events:none;opacity:.42;transition:opacity .45s ease}
.tailwind-lab[data-lumen="dia"] .umbral-light-rays{opacity:.68}
.tailwind-lab[data-lumen="noche"] .umbral-light-rays{opacity:.28}
.tailwind-lab[data-lumen="dia"] .aureo-moon{filter:drop-shadow(0 12px 24px rgba(0,0,0,.38)) drop-shadow(0 0 16px rgba(234,214,167,.35))}
.tailwind-lab[data-lumen="noche"] .aureo-moon{filter:drop-shadow(0 12px 24px rgba(0,0,0,.38))}.aureo-app-frame{position:relative;z-index:2;width:100%;max-width:none}.aureo-content-shell{padding-inline:clamp(1.25rem,4vw,5rem)}.aureo-content-width{max-width:none}.tailwind-lab::after{content:'';position:fixed;z-index:0;inset:0;pointer-events:none;background:radial-gradient(ellipse 68% 42% at 50% 42%,transparent 38%,rgba(3,5,9,.32) 100%);mix-blend-mode:multiply}
.tailwind-lab>.aureo-app-frame>aside{position:relative;border-right-color:rgba(201,168,106,.13)!important;background:linear-gradient(128deg,rgba(12,17,27,.94),rgba(8,11,17,.76))!important;backdrop-filter:blur(18px)}.tailwind-lab>.aureo-app-frame>aside::after{content:'';position:absolute;right:-1px;top:7%;bottom:7%;width:1px;background:linear-gradient(transparent,var(--zodiac-color),transparent);opacity:.52}.desktop-axis-nav{gap:.55rem!important}.desktop-axis-nav button{min-height:3.25rem!important;border-radius: var(--radio-pill)!important;padding-inline:1rem!important;transition:background-color var(--dur-2) ease,color var(--dur-2) ease,transform var(--dur-2) cubic-bezier(.16,1,.3,1)!important}.desktop-axis-nav button:hover{background:color-mix(in srgb,var(--zodiac-color) 8%,transparent)!important;transform:translateX(.2rem)}.desktop-axis-active{background:linear-gradient(90deg,color-mix(in srgb,var(--zodiac-color) 15%,transparent),rgba(201,168,106,.06),transparent)!important}.desktop-axis-nav button::before{left:.35rem!important;height:1.55rem!important}.desktop-axis-active .desktop-axis-icon{box-shadow:0 0 0 4px color-mix(in srgb,var(--zodiac-color) 8%,transparent),0 10px 24px rgba(0,0,0,.2)}
.axis-home-lab{display:grid;gap:.35rem;min-height:0;padding:.1rem 0 .25rem;border-radius:0}.axis-home-lab:not(:has(.umbral-threshold-notes)){min-height:calc(100svh - 9.25rem);align-content:center}.axis-heading-lab{padding:.05rem 0 .35rem}.axis-heading-lab::after{width:min(42vw,8.5rem);background:linear-gradient(90deg,transparent,#c9a86a 26%,var(--zodiac-color) 60%,transparent)}.ritual-stage-lab>.umbral-carta{min-height:15.5rem}.ritual-stage-lab>.worlds-stage-lab{min-height:22rem}
.umbral-datum{border-radius:47% 53% 46% 54%/52% 44% 56% 48%;background:linear-gradient(135deg,rgba(17,24,36,.84),rgba(8,11,17,.72));backdrop-filter:blur(14px)}.umbral-datum-number{padding-inline:1rem}.umbral-datum-arcana{border-radius:45% 55% 52% 48%/58% 46% 54% 42%}.tarot-card{border-radius:8px 8px 14px 8px}.umbral-day-cluster>button,.umbral-pulse-card{border-radius: var(--radio-organico-1)!important;background:linear-gradient(125deg,rgba(22,28,40,.56),rgba(8,11,17,.2))!important;backdrop-filter:blur(11px)}
.worlds-stage-lab::before{width:min(91vw,35rem);border:0;box-shadow:inset 0 0 70px rgba(0,0,0,.28),0 0 70px color-mix(in srgb,var(--zodiac-color) 8%,transparent);-webkit-mask-image:radial-gradient(circle,#000 28%,transparent 72%);mask-image:radial-gradient(circle,#000 28%,transparent 72%)}.world-flower-lab{filter:none;position:relative;z-index:1}.lab-world-petal{cursor:pointer}
.balance-home-actions{margin:.2rem auto 0;width:min(100%,32rem);padding:.25rem;border:1px solid rgba(201,168,106,.16);border-radius: var(--radio-organico-2);background:rgba(11,16,24,.42);backdrop-filter:blur(14px)}.balance-home-reading{margin:0 auto .1rem;padding:0;border-radius:0;background:transparent;backdrop-filter:none}.balance-home-caption{margin-top:.45rem}.balance-home-value strong{text-shadow:0 12px 30px rgba(0,0,0,.42)}
.nucleus-home-gate{border:1px solid rgba(129,115,183,.26);border-radius:46% 54% 48% 52%/42% 56% 44% 58%;box-shadow:0 28px 70px rgba(0,0,0,.24);background:radial-gradient(circle at 46% 20%,rgba(129,115,183,.18),transparent 47%),rgba(9,13,21,.52);backdrop-filter:blur(15px)}.nucleus-home-notes button{border-radius:50%!important;background:rgba(13,18,29,.72)!important}.nucleus-home-notes button.hint{background:#c9a86a!important;color:#080b11!important;box-shadow:0 0 18px rgba(201,168,106,.45)}.nucleus-home-hint{border-radius: var(--radio-pill)}.nucleus-capture-lab button{border-radius: var(--radio-pill)}
.golden-daruma-practice{padding:clamp(.7rem,1.6vw,1.05rem);border:1px solid color-mix(in srgb,var(--sign-color) 22%,rgba(201,168,106,.18));border-radius: var(--radio-organico-2);background:linear-gradient(135deg,color-mix(in srgb,var(--sign-color) 7%,rgba(8,11,17,.5)),rgba(8,11,17,.22));backdrop-filter:blur(15px)}.golden-daruma-capture>button{border-radius: var(--radio-pill)}
.lab-mobile-nav{border-radius: var(--radio-pill)!important;background:linear-gradient(135deg,rgba(14,20,31,.95),rgba(8,11,17,.88))!important;box-shadow:0 16px 40px rgba(0,0,0,.36),inset 0 1px rgba(234,214,167,.08)}.lab-mobile-nav button{border-radius: var(--radio-pill)!important}.mobile-axis-active{background:color-mix(in srgb,var(--zodiac-color) 11%,transparent)!important}
@media(max-width:760px){.umbral-light-rays{opacity:.36}.tailwind-lab[data-lumen="dia"] .umbral-light-rays{opacity:.55}.tailwind-lab[data-lumen="noche"] .umbral-light-rays{opacity:.22}.ritual-stage-lab{min-height:0}.ritual-stage-lab>.umbral-carta,.umbral-carta{min-height:13.5rem}.axis-home-lab{padding:.05rem 0 .2rem;border-radius:0}.axis-home-lab:not(:has(.umbral-threshold-notes)){min-height:calc(100svh - 10rem)}.nucleus-home-gate{border-radius: var(--radio-organico-3)}.golden-daruma-practice{border-radius: var(--radio-organico-2)}.umbral-datum{transform:scale(.86)}.golden-daruma-capture textarea{min-height:3.6rem}}
@media(min-width:1024px){.aureo-content-width{max-width:72rem}.axis-home-lab{padding:.15rem 0 .3rem}.axis-home-lab:not(:has(.umbral-threshold-notes)){min-height:calc(100svh - 4.5rem)}
/* Umbral también ocupa el alto: encabezado arriba, composición al centro, notas abajo.
   Sin esto el contenido queda apilado en el 60% superior y el resto se lee como inacabado. */
.axis-home-lab:has(.umbral-threshold-notes){min-height:calc(100svh - 4.5rem);grid-template-rows:auto minmax(0,1fr) auto}
.axis-home-lab:has(.umbral-threshold-notes)>.ritual-stage-lab{display:grid;align-content:center}
.aureo-moon{width:7rem;height:7rem}
.ritual-stage-lab>.umbral-carta{min-height:20rem}.axis-heading-lab{padding:.05rem 0 .4rem}.axis-welcome-title{font-size:clamp(var(--texto-8),2.8vw,var(--texto-9))}.umbral-heading .axis-welcome-title{font-size:clamp(var(--texto-5),1.8vw,var(--texto-6))}.ritual-stage-lab{min-height:0}.umbral-threshold-notes{padding-bottom:.5rem}.world-flower-lab{width:min(62vw,34rem)}.worlds-stage-lab::before{width:min(72vw,33rem)}.balance-field-lab{min-height:0}.balance-tree-entry{width:min(100%,23rem)}.nucleus-cloth-lab{width:min(100%,26rem)}.golden-daruma-home{width:min(100%,38rem);grid-template-columns:minmax(12rem,14.5rem) minmax(16rem,1fr);gap:1.15rem}}
@media(prefers-reduced-motion:reduce){.desktop-axis-nav button:hover{transform:none}.aureo-moon,.umbral-light-rays{transition-duration:1ms}}

.world-fab{
  --world-petal:#c9a86a;
  position:fixed;
  z-index:45;
  right:max(1rem,env(safe-area-inset-right));
  bottom:calc(6rem + env(safe-area-inset-bottom));
  display:grid;
  width:48px;
  height:48px;
  padding:0;
  overflow:hidden;
  place-items:center;
  border:1px solid color-mix(in srgb,var(--world-petal) 72%,transparent);
  border-radius:50%;
  background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--world-petal) 36%,transparent),#080b11 72%);
  color:color-mix(in srgb,var(--world-petal) 42%,#f4efe5);
  box-shadow:0 16px 36px rgba(0,0,0,.38);
  cursor:pointer;
}
.world-fab.is-care{--world-petal:#9b7d9b}
.world-fab.is-vinculos{--world-petal:#c9a86a}
.world-fab.is-travesias{--world-petal:#7da797}
.world-fab.is-hobbies{--world-petal:#c9a86a}
.world-fab.is-decretos{--world-petal:#8173b7}
.world-fab svg{width:1.05rem;pointer-events:none}
.world-fab input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.world-fab:focus-visible,.world-fab:focus-within{outline:2px solid color-mix(in srgb,var(--world-petal) 70%,#f4efe5);outline-offset:3px}
.world-fab.loading{opacity:.68;pointer-events:none}
.world-fab:active{transform:scale(.97)}
.fab-slot-enter-active,.fab-slot-leave-active{transition:opacity var(--dur-4) var(--ease-in-out),transform var(--dur-4) var(--ease-in-out)}
.fab-slot-leave-active{pointer-events:none}
.fab-slot-enter-from,.fab-slot-leave-to{opacity:0;transform:scale(.88)}
@media(min-width:1024px){.world-fab{bottom:2rem}}
@media(prefers-reduced-motion:reduce){.fab-slot-enter-active,.fab-slot-leave-active{transition-duration:1ms}}
</style>
<style>
body:has(.care-composer-layer) .world-fab {
  opacity: 0;
  pointer-events: none;
}
</style>
