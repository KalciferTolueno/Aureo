import type { Companion, CompanionSpecies, Decree, Hobby, Journey } from './types'

/** 137,5° es el ángulo de oro de Vogel. Los destellos recorren el brazo φ; no se empacan en girasol. */
export const GOLDEN_ANGLE = 137.5077640844293
export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2
const SPIRAL_TURNS = 2.15
const SPIRAL_MAX_R = 36
const SPARK_INNER_T = 0.48
export const DECREE_PLACEHOLDERS: Record<Decree['categoria'], string> = {
  ser: 'Soy…',
  vivir: 'Disfruto de...',
  tener: 'Tengo...',
}
export const DECREE_EXAMPLES: Record<Decree['categoria'], string> = {
  ser: 'Soy exactamente lo que necesito ser en este momento.',
  vivir: 'Vivo el presente que elijo, no el que me tocó.',
  tener: 'Tengo un entorno de amor.',
}
export const DECREE_BADGES: Record<Decree['categoria'], { label: string; color: string }> = {
  ser: { label: 'Ser', color: '#7A6AAA' },
  vivir: { label: 'Vivir', color: '#5DB389' },
  tener: { label: 'Tener', color: '#C9A86A' },
}
export const HOBBY_MOMENT_HINTS = [
  'Se me fue el tiempo bailando, ni lo noté...',
  'Hoy quise tener una hora libre para venir y no la tuve.',
] as const
export const COMPANION_SPECIES: Array<{ id: CompanionSpecies; label: string; icon: string }> = [
  { id: 'perro', label: 'Perro', icon: 'dog' },
  { id: 'gato', label: 'Gato', icon: 'cat' },
  { id: 'ave', label: 'Ave', icon: 'bird' },
  { id: 'hamster', label: 'Hámster', icon: 'hamster' },
  { id: 'otra', label: 'Otra mascota', icon: 'paw' },
]
export const PLANT_PLACES = [
  { id: 'interior' as const, label: 'Interior', icon: 'interior' },
  { id: 'exterior' as const, label: 'Exterior', icon: 'exterior' },
]

export interface SpiralSpark {
  x: number
  y: number
  size: number
  opacity: number
  newest: boolean
  seed: boolean
}

export function hobbyMoments(hobby: Hobby) {
  return hobby.momentos ?? []
}

export function hobbyLastMomentAt(hobby: Hobby) {
  const stamps = hobbyMoments(hobby).map((moment) => new Date(moment.fecha).getTime())
  if (hobby.ultima_vez) stamps.push(new Date(hobby.ultima_vez).getTime())
  return stamps.reduce((latest, stamp) => Number.isFinite(stamp) ? Math.max(latest, stamp) : latest, 0)
}

export function sortHobbiesByLastMoment(hobbies: Hobby[]) {
  return [...hobbies].sort((left, right) => hobbyLastMomentAt(right) - hobbyLastMomentAt(left))
}

export function hobbySpiralPoint(t: number) {
  const theta = Math.max(0, Math.min(1, t)) * SPIRAL_TURNS * 2 * Math.PI
  const maxTheta = SPIRAL_TURNS * 2 * Math.PI
  const growth = Math.pow(GOLDEN_RATIO, 2 * theta / Math.PI) - 1
  const full = Math.pow(GOLDEN_RATIO, 2 * maxTheta / Math.PI) - 1
  const radius = SPIRAL_MAX_R * (full > 0 ? growth / full : 0)
  const angle = theta - Math.PI / 2
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  }
}

export function hobbySpiralPath(samples = 72) {
  return Array.from({ length: samples }, (_, index) => {
    const point = hobbySpiralPoint(index / (samples - 1))
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }).join(' ')
}

export function hobbySpiralSparks(count: number): SpiralSpark[] {
  if (count <= 0) return [{ x: 50, y: 50, size: 1.85, opacity: 0.3, newest: false, seed: true }]
  return Array.from({ length: count }, (_, index) => {
    const recency = count === 1 ? 1 : index / (count - 1)
    const t = SPARK_INNER_T + recency * (1 - SPARK_INNER_T)
    const point = hobbySpiralPoint(t)
    return {
      x: point.x,
      y: point.y,
      size: 2.05 + recency * 3.35,
      opacity: 0.5 + recency * 0.5,
      newest: index === count - 1,
      seed: false,
    }
  })
}

export function decreeIntensity(activations = 0) {
  if (activations <= 0) return { opacity: 0.5, glow: false }
  if (activations <= 3) return { opacity: 0.7, glow: false }
  if (activations <= 6) return { opacity: 0.85, glow: false }
  return { opacity: 1, glow: true }
}

export function journeyLived(journey: Journey) {
  return journey.estado === 'visitado'
}

export function journeyPhrase(count: number) {
  if (count <= 0) return 'Cada lugar que conoces lleva algo tuyo para siempre.'
  if (count <= 3) return 'Estos lugares ya son parte de lo que eres.'
  if (count <= 9) return 'Mira todo lo que ya has vivido. Y todo lo que aún se abre — qué delicia.'
  return 'Qué vida tan tuya.'
}

export function normalizeCompanionSpecies(value?: string): CompanionSpecies | null {
  const key = (value ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (key === 'perro' || key === 'dog') return 'perro'
  if (key === 'gato' || key === 'cat') return 'gato'
  if (key === 'ave' || key === 'pajaro' || key === 'bird') return 'ave'
  if (key === 'hamster' || key === 'hamsters') return 'hamster'
  if (key === 'otra' || key === 'otra mascota') return 'otra'
  return null
}

export function companionSpeciesLabel(value?: string) {
  const species = normalizeCompanionSpecies(value)
  return COMPANION_SPECIES.find((entry) => entry.id === species)?.label ?? (value?.trim() || 'Compañero')
}

export function yearsSince(iso?: string) {
  if (!iso) return null
  const born = new Date(iso).getTime()
  if (!Number.isFinite(born)) return null
  const years = (Date.now() - born) / (365.25 * 86_400_000)
  return years >= 0 && Number.isFinite(years) ? years : null
}

export function companionHumanYears(species: string | undefined, birthIso?: string) {
  const kind = normalizeCompanionSpecies(species)
  if (kind !== 'perro' && kind !== 'gato') return null
  const years = yearsSince(birthIso)
  if (years == null) return null
  if (years <= 1) return Math.max(0, Math.round(years * 15))
  if (years <= 2) return Math.round(15 + (years - 1) * 9)
  return Math.round(24 + (years - 2) * 4.5)
}

export function intimateInitials(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0]!.slice(0, 1).toLocaleUpperCase('es')
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toLocaleUpperCase('es')
}

export function truncateNote(value: string, limit = 72) {
  const text = value.trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trimEnd()}…`
}

export function formatCareDate(iso?: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}
