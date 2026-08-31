import { describe, expect, it } from 'vitest'
import { arcanaPhrase, dailyPulsePrompt, greetingForHour, LUNAR_PHASES, lunarPhaseIndex, lumenFromHour, MAXIMS, nextMaximIndex, PULSE_PROMPTS } from './umbral'

describe('ritmo diario de Umbral', () => {
  it('elige una pregunta estable para cada fecha', () => {
    expect(dailyPulsePrompt('2026-08-31')).toBe(PULSE_PROMPTS[Number('20260831') % PULSE_PROMPTS.length])
    expect(dailyPulsePrompt('2026-08-31')).toBe(dailyPulsePrompt('2026-08-31'))
    expect(dailyPulsePrompt('2026-09-01')).not.toBe(dailyPulsePrompt('2026-08-31'))
  })

  it('mantiene la fase lunar dentro de las ocho formas', () => {
    const index = lunarPhaseIndex(Date.UTC(2026, 7, 31, 12))
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(LUNAR_PHASES.length)
  })

  it('saluda según la hora sin asumir género de la persona', () => {
    expect(greetingForHour(8)).toBe('El día es tuyo')
    expect(greetingForHour(15)).toBe('La tarde es tuya')
    expect(greetingForHour(22)).toBe('La noche es tuya')
    expect(greetingForHour(3)).toBe('La noche es tuya')
  })

  it('rota la máxima a otra distinta, no en secuencia fija', () => {
    const next = nextMaximIndex(4, MAXIMS.length)
    expect(next).not.toBe(4)
    expect(next).toBeGreaterThanOrEqual(0)
    expect(next).toBeLessThan(MAXIMS.length)
  })

  it('ofrece una frase editorial para cada arcano del mazo', () => {
    expect(arcanaPhrase('La Estrella')).toMatch(/claridad/)
    expect(arcanaPhrase('Carta inexistente')).toBeTruthy()
  })

  it('resuelve día o noche según la hora, con umbral a las 06 y 20', () => {
    expect(lumenFromHour(6)).toBe('dia')
    expect(lumenFromHour(19)).toBe('dia')
    expect(lumenFromHour(20)).toBe('noche')
    expect(lumenFromHour(5)).toBe('noche')
  })
})
