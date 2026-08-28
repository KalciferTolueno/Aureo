import { storage } from '@/data/storage'

const DEVICE_ID_KEY = 'device_id'

export async function getDeviceId() {
  const existing = await storage.get<string>(DEVICE_ID_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  await storage.set(DEVICE_ID_KEY, created)
  return created
}
