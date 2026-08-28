export type RemoteAxis = 'umbral' | 'mundos' | 'balance' | 'edad_dorada'

export interface RemoteRecordChange {
  id: string
  axis: RemoteAxis
  collection: string
  payload: Record<string, unknown>
  device_id: string
  mutation_id: string
  client_updated_at: string
  created_at?: string
  deleted_at?: string | null
}

export interface RemoteRecord extends RemoteRecordChange {
  user_id: string
  updated_at: string
  revision: number
}

export interface RemoteProfile {
  user_id: string
  display_name: string
  birth_date: string | null
  birth_time: string | null
  birth_place: string | null
  zodiac_sign: string
  personal_number: number
  power_word: string
  app_key_hash: string
  active_sections: string[]
  premium_active: boolean
  onboarding_complete: boolean
}
