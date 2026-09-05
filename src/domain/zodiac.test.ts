import { describe, expect, it } from 'vitest'
import { personalNumber, SIGN_ORDER, signColors, signLabels, zodiacFor } from './zodiac'

describe('identidad calculada', () => {
  it('resuelve signos alrededor de un cambio de ciclo', () => {
    expect(zodiacFor('1990-03-20')).toBe('piscis')
    expect(zodiacFor('1990-03-21')).toBe('aries')
  })

  it('reduce la fecha a una clave personal', () => {
    expect(personalNumber('1990-01-01')).toBe(3)
  })

  it('tiene un matiz propio para cada signo', () => {
    expect(SIGN_ORDER).toHaveLength(12)
    for (const key of SIGN_ORDER) {
      expect(signColors[key]).toMatch(/^#/)
      expect(signLabels[key]).toBeTruthy()
    }
  })
})
