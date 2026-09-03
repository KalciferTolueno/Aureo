export const LUNAR_PHASES = [
  'Luna nueva',
  'Creciente',
  'Cuarto creciente',
  'Gibosa creciente',
  'Luna llena',
  'Gibosa menguante',
  'Cuarto menguante',
  'Menguante',
] as const

export const PULSE_PROMPTS = [
  '¿Qué quiero construir hoy?',
  '¿Cómo es mi vibración hoy?',
  '¿Cómo alimentaré mi ser hoy?',
  '¿Cuál será el factor que mejore en un 1% mi ser?',
] as const

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isSameLocalDay(iso: string | undefined, key: string) {
  if (!iso) return false
  return localDateKey(new Date(iso)) === key
}

export function lunarPhaseIndex(at = Date.now()) {
  const cycle = 29.53058867
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14)
  const days = (at - knownNewMoon) / 86_400_000
  return Math.floor(((((days % cycle) + cycle) % cycle) / cycle) * LUNAR_PHASES.length) % LUNAR_PHASES.length
}

export const MAXIMS = [
  'No estropees lo que tienes deseando lo que no tienes.',
  'No son las cosas las que perturban, sino los juicios sobre ellas.',
  'El placer más alto: ausencia de dolor en el cuerpo y de turbación en el alma.',
  'Confina tu vida a lo que depende de ti. Ahí está tu libertad.',
  'Rico no es quien más tiene, sino quien menos necesita.',
  'Cada día es una vida en pequeño. Vívelo como si bastara.',
  'Lo que está en tu poder: tu juicio, tu deseo, tu rechazo.',
  'Saborea este instante. No volverá, y por eso vale.',
  'La templanza no apaga el placer: lo afina.',
  'No malgastes lo que queda de vida en suponer cosas sobre los demás.',
  'Hoy escapé a toda circunstancia. Mejor dicho, la expulsé de mí.',
  'La amistad recorre el mundo anunciándonos que despertemos a la dicha.',
  'El cuerpo pide poco. El alma, aún menos cuando aprende a vaciarse.',
  'Nunca habrá un momento mejor que este para ser exactamente lo que eres.',
  'Lo imprevisto también tiene su forma de ser perfecto.',
] as const

export const ARCANA_PHRASES: Record<string, string> = {
  'El Loco': 'Lo desconocido también abre camino.',
  'El Mago': 'Lo que tocas toma forma.',
  'La Sacerdotisa': 'El silencio ya sabe.',
  'La Emperatriz': 'Lo vivo se ofrece sin prisa.',
  'El Emperador': 'El límite también sostiene.',
  'El Hierofante': 'La forma que eliges te nombra.',
  'Los Enamorados': 'Elegir es un acto de presencia.',
  'El Carro': 'El rumbo se afirma al avanzar.',
  'La Fuerza': 'La suavidad también es poder.',
  'El Ermitaño': 'La luz que buscas va contigo.',
  'La Rueda': 'Nada permanece; todo vuelve distinto.',
  'La Justicia': 'Lo verdadero se equilibra solo.',
  'El Colgado': 'Ver de otro modo también es avanzar.',
  'La Muerte': 'Lo que termina deja espacio.',
  'La Templanza': 'Lo opuesto puede convivir.',
  'El Diablo': 'Nombrar el lazo ya lo afloja.',
  'La Torre': 'Lo que se cae deja ver el cielo.',
  'La Estrella': 'Hay una claridad que no se apaga.',
  'La Luna': 'Lo que no se ve aún trabaja.',
  'El Sol': 'La evidencia también puede ser cálida.',
  'El Juicio': 'Escuchar el llamado basta para empezar.',
  'El Mundo': 'Estás completo en este instante.',
}

export function dailyPulsePrompt(fecha = localDateKey()) {
  const seed = Number(fecha.replaceAll('-', ''))
  return PULSE_PROMPTS[seed % PULSE_PROMPTS.length]!
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 12) return 'El día es tuyo'
  if (hour >= 12 && hour < 20) return 'La tarde es tuya'
  return 'La noche es tuya'
}

export function umbralDateLabel(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(date)
  return `${weekday} ${date.getDate()}`
}

export type LumenMode = 'auto' | 'dia' | 'noche'
export type LumenResolved = 'dia' | 'noche'

export function lumenFromHour(hour = new Date().getHours()): LumenResolved {
  return hour >= 6 && hour < 20 ? 'dia' : 'noche'
}

export function resolveLumen(pref: LumenMode | null | undefined, hour = new Date().getHours()): LumenResolved {
  if (pref === 'dia' || pref === 'noche') return pref
  return lumenFromHour(hour)
}

export const DAILY_ARCANA_VISIBLE_DAYS = 7

export function recentDailyArcana<T extends { fecha: string }>(
  items: T[],
  limit = DAILY_ARCANA_VISIBLE_DAYS,
) {
  return [...items].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, limit)
}

export function nextMaximIndex(current: number, count = MAXIMS.length) {
  if (count < 2) return 0
  let next = current
  while (next === current) next = Math.floor(Math.random() * count)
  return next
}

export function arcanaPhrase(name: string) {
  return ARCANA_PHRASES[name] ?? 'Esta carta también tiene algo que mostrarte.'
}
