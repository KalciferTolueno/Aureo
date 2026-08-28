import { describe, expect, it } from 'vitest'
import { personalNumber, zodiacFor } from './zodiac'

describe('identidad calculada', () => {
  it('resuelve signos alrededor de un cambio de ciclo', () => {
    expect(zodiacFor('1990-03-20')).toBe('piscis')
    expect(zodiacFor('1990-03-21')).toBe('aries')
  })

  it('reduce la fecha a una clave personal', () => {
    expect(personalNumber('1990-01-01')).toBe(3)
  })
})
