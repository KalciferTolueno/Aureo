import { describe, expect, it } from 'vitest'
import { digitSum, nameNumber, personalNumber } from './zodiac'
import { hashMelody, noteFromNumber, powerWordFrom, recoverMelodyNotes } from './melody'

describe('llave musical', () => {
  it('mapea maestros a notas del rango audible de Áureo', () => {
    expect(noteFromNumber(11)).toBe('Re')
    expect(noteFromNumber(22)).toBe('Fa')
    expect(noteFromNumber(33)).toBe('La')
    expect(noteFromNumber(5)).toBe('Sol')
  })

  it('compone Tu sello desde nacimiento, nombre y primer día', () => {
    expect(powerWordFrom(2, 3, 5)).toBe('Re · Mi · Sol')
  })

  it('reduce el nombre como en la llave histórica', () => {
    expect(nameNumber('Melita')).toBeGreaterThan(0)
    expect(nameNumber('Melita')).toBeLessThanOrEqual(9)
  })

  it('hashea la melodía en el mismo formato que Núcleo', async () => {
    const hash = await hashMelody(['Do', 'Re', 'Mi'])
    expect(hash).toHaveLength(64)
    expect(hash).toBe(await hashMelody(['Do', 'Re', 'Mi']))
    expect(hash).not.toBe(await hashMelody(['Do', 'Mi', 'Re']))
  })

  it('recupera el orden de la melodía desde el hash local', async () => {
    const hash = await hashMelody(['Fa', 'La', 'Do'])
    await expect(recoverMelodyNotes(hash)).resolves.toEqual(['Fa', 'La', 'Do'])
    await expect(recoverMelodyNotes('')).resolves.toBeNull()
  })

  it('suma el día de ingreso sin números maestros', () => {
    expect(digitSum('2026-08-31', false)).toBeLessThanOrEqual(9)
  })

  it('conserva maestros en el número personal', () => {
    expect(personalNumber('1999-11-29')).toBeGreaterThan(0)
  })
})
