import type { NucleusThought } from '@/domain/types'

export const nucleusEmotions = {
  cosmos: { label: 'Reflexión y duda', color: '#8173B7', x: 30, y: 30 },
  oro: { label: 'Alegría y gratitud', color: '#C9A86A', x: 70, y: 30 },
  salvia: { label: 'Calma y alivio', color: '#7DA797', x: 70, y: 66 },
  ocaso: { label: 'Intensidad y dolor', color: '#B86D5D', x: 30, y: 66 },
  ciruela: { label: 'Sensibilidad y nostalgia', color: '#9B7D9B', x: 50, y: 46 },
  marfil: { label: 'Emoción abierta', color: '#E4CFA8', x: 50, y: 64 },
} as const

export type NucleusTone = keyof typeof nucleusEmotions
export const nucleusEmotionTones = Object.keys(nucleusEmotions) as NucleusTone[]

export function normalizeNucleusTone(value: string): NucleusTone {
  return nucleusEmotionTones.includes(value as NucleusTone) ? value as NucleusTone : 'marfil'
}

export function recognizeNucleusTone(value: string): NucleusTone {
  if (/gracias|gratitud|alegr|feliz|logr|amor|esperanza|ternura|orgullo/i.test(value)) return 'oro'
  if (/calma|paz|alivio|seren|respir|descans/i.test(value)) return 'salvia'
  if (/rabia|miedo|dolor|ansiedad|triste|pena|agob|estr[eé]s|frustr/i.test(value)) return 'ocaso'
  if (/siento|extrañ|nostalgia|emoci|vulner|sensib|duelo/i.test(value)) return 'ciruela'
  if (/pienso|quiz[aá]|pregunta|entender|duda|confusi|reflex|curios/i.test(value)) return 'cosmos'
  return 'marfil'
}

function thoughtHash(value: string) {
  return [...value].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 17)
}

const STAR_MARGIN = 14
const STAR_SEPARATION = 20

function clampStar(value: number) {
  return Math.min(100 - STAR_MARGIN, Math.max(STAR_MARGIN, value))
}

function separateNucleusStars(entries: { x: number; y: number }[]) {
  for (let pass = 0; pass < 16; pass++) {
    let moved = false
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]!
        const b = entries[j]!
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 0.01
        if (dist >= STAR_SEPARATION) continue
        const push = (STAR_SEPARATION - dist) / 2
        const ux = dx / dist
        const uy = dy / dist
        a.x = clampStar(a.x - ux * push)
        a.y = clampStar(a.y - uy * push)
        b.x = clampStar(b.x + ux * push)
        b.y = clampStar(b.y + uy * push)
        moved = true
      }
    }
    if (!moved) break
  }
}

export function groupNucleusThoughts(items: NucleusThought[]) {
  const indexes = Object.fromEntries(nucleusEmotionTones.map((tone) => [tone, 0])) as Record<NucleusTone, number>
  const recencyById = new Map(
    [...items]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || b.id.localeCompare(a.id))
      .map((thought, rank) => [thought.id, rank] as const),
  )
  const grouped = items.map((thought) => {
    const tone = normalizeNucleusTone(thought.tono)
    const emotion = nucleusEmotions[tone]
    const index = indexes[tone]++
    const freshness = recencyById.get(thought.id) ?? items.length
    const seed = thoughtHash(`${thought.id}:${thought.texto}`)
    const angle = ((index * 137.508) + (seed % 47)) * Math.PI / 180
    const radius = 6 + Math.sqrt(index) * 7.4
    return {
      thought,
      tone,
      emotion,
      index,
      freshness,
      newest: freshness === 0,
      x: clampStar(emotion.x + Math.cos(angle) * radius),
      y: clampStar(emotion.y + Math.sin(angle) * radius),
    }
  })
  separateNucleusStars(grouped)
  return grouped
}

export function activeNucleusEmotionClusters(grouped: ReturnType<typeof groupNucleusThoughts>) {
  return nucleusEmotionTones.map((tone, index) => {
    const emotion = nucleusEmotions[tone]
    return { tone, index, ...emotion, count: grouped.filter((entry) => entry.tone === tone).length }
  }).filter((emotion) => emotion.count > 0)
}
