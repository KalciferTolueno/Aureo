export const MELODY_NOTES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] as const
export type MelodyNote = (typeof MELODY_NOTES)[number]

export const NOTE_FREQUENCIES: Record<string, number> = {
  Do: 261.63,
  Re: 293.66,
  Mi: 329.63,
  Fa: 349.23,
  Sol: 392,
  La: 440,
  Si: 493.88,
  'Do+': 523.25,
  'Re+': 587.33,
}

const MASTER_TO_NOTE: Record<number, number> = { 11: 2, 22: 4, 33: 6 }
const NOTE_BY_NUMBER: Record<number, string> = {
  1: 'Do', 2: 'Re', 3: 'Mi', 4: 'Fa', 5: 'Sol', 6: 'La', 7: 'Si', 8: 'Do+', 9: 'Re+',
}

export function noteFromNumber(value: number) {
  const mapped = MASTER_TO_NOTE[value] ?? value
  return NOTE_BY_NUMBER[mapped] ?? 'Do'
}

export function powerWordFrom(personal: number, name: number, entry: number) {
  return [personal, name, entry].map(noteFromNumber).join(' · ')
}

export async function hashMelody(notes: readonly string[]) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(notes.join('|')))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function recoverMelodyNotes(hash: string | undefined | null) {
  if (!hash) return null
  for (const first of MELODY_NOTES) {
    for (const second of MELODY_NOTES) {
      for (const third of MELODY_NOTES) {
        const candidate = [first, second, third] as const
        if (await hashMelody(candidate) === hash) return [...candidate]
      }
    }
  }
  return null
}
