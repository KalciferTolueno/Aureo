const encoder = new TextEncoder()
const decoder = new TextDecoder()
const secretKey = 'aureo_device_secret'
const salt = encoder.encode('aureo.melitalove.identidad')
let derivedKey: CryptoKey | null = null

function encodeBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function deviceSecret() {
  let value = localStorage.getItem(secretKey)
  if (!value) {
    value = encodeBase64(crypto.getRandomValues(new Uint8Array(32)))
    localStorage.setItem(secretKey, value)
  }
  return value
}

async function key() {
  if (derivedKey) return derivedKey
  const source = await crypto.subtle.importKey('raw', encoder.encode(deviceSecret()), 'PBKDF2', false, ['deriveKey'])
  derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    source,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return derivedKey
}

export async function encryptPrivate(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), encoder.encode(value))
  const payload = new Uint8Array(iv.length + encrypted.byteLength)
  payload.set(iv)
  payload.set(new Uint8Array(encrypted), iv.length)
  return encodeBase64(payload)
}

export async function decryptPrivate(value: string) {
  const payload = decodeBase64(value)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(0, 12) }, await key(), payload.slice(12))
  return decoder.decode(decrypted)
}
