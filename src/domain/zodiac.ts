const signs = [
  ['capricornio', 20], ['acuario', 19], ['piscis', 21], ['aries', 20], ['tauro', 21], ['geminis', 21],
  ['cancer', 23], ['leo', 23], ['virgo', 23], ['libra', 23], ['escorpio', 22], ['sagitario', 22], ['capricornio', 31],
] as const

export function zodiacFor(date: string) {
  const [, monthText, dayText] = date.split('-')
  const month = Number(monthText)
  const day = Number(dayText)
  if (!month || !day) return 'aries'
  const current = signs[month - 1]!
  const next = signs[month]!
  return day < current[1] ? current[0] : next[0]
}

export function personalNumber(date: string) {
  let value = date.replace(/\D/g, '').split('').reduce((sum, digit) => sum + Number(digit), 0)
  while (value > 9 && ![11, 22, 33].includes(value)) value = String(value).split('').reduce((sum, digit) => sum + Number(digit), 0)
  return value
}

export const signSymbols: Record<string, string> = {
  aries: '♈', tauro: '♉', geminis: '♊', cancer: '♋', leo: '♌', virgo: '♍', libra: '♎',
  escorpio: '♏', sagitario: '♐', capricornio: '♑', acuario: '♒', piscis: '♓',
}

export const signLabels: Record<string, string> = {
  aries: 'Aries', tauro: 'Tauro', geminis: 'Géminis', cancer: 'Cáncer', leo: 'Leo', virgo: 'Virgo',
  libra: 'Libra', escorpio: 'Escorpio', sagitario: 'Sagitario', capricornio: 'Capricornio', acuario: 'Acuario', piscis: 'Piscis',
}

export const signRevealPhrases: Record<string, string> = {
  aries: 'El primer fuego no pide permiso.',
  tauro: 'Lo que permanece también es movimiento.',
  geminis: 'Dos luces pueden ser una sola mirada.',
  cancer: 'El refugio que buscas ya te reconoce.',
  leo: 'Hay una claridad que nace de ti.',
  virgo: 'Afinar es otra forma de amar.',
  libra: 'El equilibrio no es quietud: es presencia.',
  escorpio: 'Lo profundo no se explica. Se habita.',
  sagitario: 'El horizonte se abre cuando das un paso.',
  capricornio: 'La forma que eliges te sostiene.',
  acuario: 'Lo distinto también pertenece.',
  piscis: 'Lo invisible trabaja a tu favor.',
}

export const openingPhrases: Record<string, string> = {
  aries: 'Hoy el día acepta tu fuego.',
  tauro: 'Hoy basta con estar aquí, entero.',
  geminis: 'Hoy tus dos voces pueden hablarse en paz.',
  cancer: 'Hoy el mundo puede esperar un instante.',
  leo: 'Hoy tu luz no necesita escenario.',
  virgo: 'Hoy lo pequeño también es sagrado.',
  libra: 'Hoy el centro te encuentra sin esfuerzo.',
  escorpio: 'Hoy puedes mirar sin convertirlo en herida.',
  sagitario: 'Hoy el camino cabe en este minuto.',
  capricornio: 'Hoy construyes sin apurarte.',
  acuario: 'Hoy lo inesperado también te pertenece.',
  piscis: 'Hoy el umbral es agua quieta.',
}

export function nameNumber(name: string) {
  const normalized = name.normalize('NFD').toUpperCase()
  let value = 0
  for (const character of normalized) {
    const code = character.charCodeAt(0)
    if (code >= 65 && code <= 90) value += ((code - 65) % 9) + 1
  }
  while (value > 9) value = String(value).split('').reduce((sum, digit) => sum + Number(digit), 0)
  return value || 1
}

export function digitSum(value: string, keepMasters = false) {
  let total = value.replace(/\D/g, '').split('').reduce((sum, digit) => sum + Number(digit), 0)
  while (total > 9 && !(keepMasters && [11, 22, 33].includes(total))) {
    total = String(total).split('').reduce((sum, digit) => sum + Number(digit), 0)
  }
  return total || 1
}
