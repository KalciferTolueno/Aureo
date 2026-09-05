export type ThemePreference = 'auto' | 'light' | 'dark'
export type OptionalSection = 'companeros' | 'plantas'

export interface Profile {
  email: string
  nombre: string
  fecha_nacimiento: string
  hora_nacimiento: string | null
  lugar_nacimiento: string | null
  signo: string
  numero_personal: number
  palabraPoder: string
  clave_app_hash: string
  secciones_activas: OptionalSection[]
  capaPremiumActiva: boolean
  onboarding_completo: boolean
  notificaciones?: boolean
}

export interface EntityBase {
  id: string
  fecha_creacion?: string
  sync_id?: string
  device_id?: string
  mutation_id?: string
  synced_mutation_id?: string
  updated_at?: string
  deleted_at?: string
}

export interface Intention extends EntityBase { texto?: string; completada?: boolean; txt?: string; done?: boolean; fecha?: string }
export interface Pulse extends EntityBase { pregunta: string; respuesta: string; fecha: string }
export interface Idea extends EntityBase { texto?: string; txt?: string; palabraPoder?: string; ts?: number }
export interface Cultivation extends EntityBase { texto?: string; nombre?: string; simbolo?: string; dias?: Record<string, boolean>; celebrada?: boolean }
export interface DailyArcana extends EntityBase { fecha: string; nombre: string }
export interface LinkRecord extends EntityBase { nombre: string; categoria: string; signo?: string; nota?: string }
export type CompanionSpecies = 'perro' | 'gato' | 'ave' | 'hamster' | 'otra'
export interface Companion extends EntityBase {
  nombre: string
  especie?: string
  fecha_importante?: string
  fecha_nacimiento?: string
  proximo_control?: string
  nota?: string
  imagen?: string
}
export interface Decree extends EntityBase { texto: string; categoria: 'ser' | 'vivir' | 'tener'; activaciones?: number; cumplido?: boolean; fecha_cumplimiento?: string | null }
export interface Plant extends EntityBase { nombre: string; tipo?: string; lugar?: 'interior' | 'exterior'; ultimo_riego?: string; frecuencia_dias?: number; nota?: string; imagen?: string }
export interface HobbyMoment { id: string; texto: string; fecha: string }
export interface Hobby extends EntityBase { nombre: string; emoji?: string; sensacion: string; estado?: 'activo' | 'pausa'; sesiones?: number; ultima_vez?: string; flow_ultimo?: number; momentos?: HobbyMoment[] }
export interface Journey extends EntityBase { nombre: string; estado: 'visitado' | 'decretado'; lat: number; lng: number; nota?: string; momento?: string; fecha?: string }
export interface CareMemory extends EntityBase { nombre: string; frase?: string; imagen?: string }
export interface BalanceMovement extends EntityBase { tipo: 'ingreso' | 'gasto'; monto: number; categoria: string; nota?: string; fecha: string; recurrente?: boolean }
export interface Daruma extends EntityBase { nombre: string; objetivo: number; acumulado: number; color: string; daruma_transferido: boolean }
export interface GoldenDeclaration extends EntityBase { texto: string; timestamp: string; origen?: string; daruma_color?: string }
export interface NucleusThought extends EntityBase { texto: string; tono: string; x: number; y: number; simbolo: string; timestamp: string }

export interface BackupFile {
  version: number
  exportadoEn: string
  configuracion: Profile | null
  raw: Record<string, unknown>
}
