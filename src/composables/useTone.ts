import { NOTE_FREQUENCIES } from '@/domain/melody'

let context: AudioContext | null = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  return context
}

export function unlockTone() {
  const current = audio()
  void current?.resume()
}

export function playTone(note: string, duration = 0.7, delay = 0) {
  const current = audio()
  const frequency = NOTE_FREQUENCIES[note]
  if (!current || !frequency) return
  void current.resume()
  const start = current.currentTime + delay
  const oscillator = current.createOscillator()
  const gain = current.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(1e-4, start)
  gain.gain.linearRampToValueAtTime(0.17, start + 0.04)
  gain.gain.exponentialRampToValueAtTime(1e-4, start + duration)
  oscillator.connect(gain).connect(current.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

export function playChord(notes: readonly string[]) {
  notes.forEach((note, index) => playTone(note, 0.95, index * 0.08))
}
