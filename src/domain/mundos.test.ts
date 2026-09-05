import { describe, expect, it } from 'vitest'
import {
  companionHumanYears,
  decreeIntensity,
  hobbySpiralSparks,
  intimateInitials,
  journeyPhrase,
  normalizeCompanionSpecies,
  sortHobbiesByLastMoment,
  truncateNote,
} from './mundos'
import type { Hobby } from './types'

describe('Mundos — helpers de la revisión de entrega', () => {
  it('coloca cada momento como destello aparte, el más nuevo más grande', () => {
    const sparks = hobbySpiralSparks(3)
    expect(sparks).toHaveLength(3)
    expect(sparks[2]?.newest).toBe(true)
    expect(sparks[2]!.size).toBeGreaterThan(sparks[0]!.size)
    expect(sparks[2]!.opacity).toBeGreaterThan(sparks[0]!.opacity)
    expect(new Set(sparks.map((spark) => `${spark.x.toFixed(2)},${spark.y.toFixed(2)}`)).size).toBe(3)
    const distance = (spark: { x: number; y: number }) => Math.hypot(spark.x - 50, spark.y - 50)
    expect(distance(sparks[0]!)).toBeGreaterThan(3)
    expect(distance(sparks[0]!)).toBeLessThan(12)
    expect(distance(sparks[2]!)).toBeGreaterThan(distance(sparks[1]!))
    expect(distance(sparks[1]!)).toBeGreaterThan(distance(sparks[0]!))
  })

  it('deja un punto tenue cuando el hobby todavía no tiene momentos', () => {
    const [seed] = hobbySpiralSparks(0)
    expect(seed?.seed).toBe(true)
    expect(seed?.opacity).toBeLessThan(0.4)
  })

  it('ordena hobbies por el último momento, no por creación', () => {
    const hobbies = [
      { id: 'a', nombre: 'Gym', sensacion: 'Fuerza', momentos: [{ id: '1', texto: 'ayer', fecha: '2026-01-01T00:00:00.000Z' }] },
      { id: 'b', nombre: 'Pole', sensacion: 'Vuelo', momentos: [{ id: '2', texto: 'hoy', fecha: '2026-09-01T00:00:00.000Z' }] },
    ] as Hobby[]
    expect(sortHobbiesByLastMoment(hobbies).map((item) => item.nombre)).toEqual(['Pole', 'Gym'])
  })

  it('traduce activaciones a opacidad y nunca a un número', () => {
    expect(decreeIntensity(0)).toEqual({ opacity: 0.5, glow: false })
    expect(decreeIntensity(2)).toEqual({ opacity: 0.7, glow: false })
    expect(decreeIntensity(5)).toEqual({ opacity: 0.85, glow: false })
    expect(decreeIntensity(7)).toEqual({ opacity: 1, glow: true })
  })

  it('cambia la frase de Travesías según cuántas postales hay', () => {
    expect(journeyPhrase(0)).toContain('Cada lugar')
    expect(journeyPhrase(2)).toContain('ya son parte')
    expect(journeyPhrase(8)).toContain('delicia')
    expect(journeyPhrase(12)).toBe('Qué vida tan tuya.')
  })

  it('convierte edad de perro y gato con tabla no lineal, y omite el resto', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365.25 * 86_400_000).toISOString()
    expect(companionHumanYears('Perro', twoYearsAgo)).toBe(24)
    expect(companionHumanYears('Ave', twoYearsAgo)).toBeNull()
    expect(normalizeCompanionSpecies('Hámster')).toBe('hamster')
  })

  it('forma iniciales desde el nombre íntimo', () => {
    expect(intimateInitials('Melita')).toBe('M')
    expect(intimateInitials('María Elena')).toBe('ME')
    expect(truncateNote('Una nota breve')).toBe('Una nota breve')
    expect(truncateNote('x'.repeat(80)).endsWith('…')).toBe(true)
  })
})
