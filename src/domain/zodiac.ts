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
