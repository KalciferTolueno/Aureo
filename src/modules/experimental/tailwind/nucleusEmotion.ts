import type { NucleusThought } from '@/domain/types'

export const nucleusEmotions = {
  cosmos: { label: 'Reflexión y duda', color: '#8173B7', x: 28, y: 28 },
  oro: { label: 'Alegría y gratitud', color: '#C9A86A', x: 72, y: 26 },
  salvia: { label: 'Calma y alivio', color: '#7DA797', x: 72, y: 70 },
  ocaso: { label: 'Intensidad y dolor', color: '#B86D5D', x: 28, y: 72 },
  ciruela: { label: 'Sensibilidad y nostalgia', color: '#9B7D9B', x: 50, y: 48 },
  marfil: { label: 'Emoción abierta', color: '#F4EFE5', x: 50, y: 82 },
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

export function groupNucleusThoughts(items: NucleusThought[]) {
  const indexes = Object.fromEntries(nucleusEmotionTones.map((tone) => [tone, 0])) as Record<NucleusTone, number>
  return items.map((thought) => {
    const tone = normalizeNucleusTone(thought.tono)
    const emotion = nucleusEmotions[tone]
    const index = indexes[tone]++
    const seed = thoughtHash(`${thought.id}:${thought.texto}`)
    const angle = ((index * 137.508) + (seed % 47)) * Math.PI / 180
    const radius = index === 0 ? 0 : Math.min(12, 4.5 + Math.sqrt(index) * 3.1)
    return { thought, tone, emotion, index, x: emotion.x + Math.cos(angle) * radius, y: emotion.y + Math.sin(angle) * radius }
  })
}

export function activeNucleusEmotionClusters(grouped: ReturnType<typeof groupNucleusThoughts>) {
  return nucleusEmotionTones.map((tone, index) => {
    const emotion = nucleusEmotions[tone]
    return { tone, index, ...emotion, count: grouped.filter((entry) => entry.tone === tone).length }
  }).filter((emotion) => emotion.count > 0)
}
