<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ModuleHeader from '@/shared/components/ModuleHeader.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { clearAureoData, exportBackup, importBackup } from '@/data/repositories'
import { useUiStore } from '@/stores/ui'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { syncService } from '@/data/sync/service'
import type { OptionalSection, ThemePreference } from '@/domain/types'

const router = useRouter()
const ui = useUiStore()
const profile = useProfileStore()
const auth = useAuthStore()
const deleting = ref(false)
const message = ref('')
const accountMessage = ref('')
const email = ref(profile.profile?.email ?? '')
const token = ref('')
const codeRequested = ref(false)
const themes: { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: 'Automático' }, { value: 'dark', label: 'Oscuro' }, { value: 'light', label: 'Claro' },
]
const sections: { value: OptionalSection; label: string }[] = [
  { value: 'companeros', label: 'Compañeros' }, { value: 'plantas', label: 'Mis Plantas' },
]
async function download() {
  const blob = new Blob([await exportBackup()], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `aureo-copia-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
  message.value = 'Copia exportada.'
}
async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await importBackup(await file.text())
    await profile.load()
    message.value = 'Copia restaurada correctamente.'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'No fue posible restaurar la copia.'
  }
}
async function erase() {
  await clearAureoData()
  deleting.value = false
  await profile.load()
  await router.replace('/onboarding')
}
async function requestCode(){accountMessage.value='';try{await auth.requestOtp(email.value.trim());codeRequested.value=true;accountMessage.value=auth.message}catch(error){accountMessage.value=error instanceof Error?error.message:'No fue posible enviar el código.'}}
async function verifyCode(){accountMessage.value='';try{await auth.verifyOtp(email.value.trim(),token.value.trim());await profile.update({email:email.value.trim()});await profile.syncToRemote();const result=await syncService.syncAll();accountMessage.value=`Cuenta conectada. ${result.pushed+result.pulled} registros sincronizados.`;codeRequested.value=false;token.value=''}catch(error){accountMessage.value=error instanceof Error?error.message:'No fue posible conectar la cuenta.'}}
async function syncNow(){accountMessage.value='Sincronizando…';try{await profile.syncToRemote();const result=await syncService.syncAll();accountMessage.value=`Sincronización lista: ${result.pushed} enviados y ${result.pulled} recibidos.`}catch(error){accountMessage.value=error instanceof Error?error.message:'No fue posible sincronizar ahora.'}}
async function disconnect(){await auth.signOut();accountMessage.value='La cuenta se desconectó de este dispositivo.'}
</script>

<template>
  <main class="app-shell">
    <ModuleHeader title="Ajustes" back="/" />
    <div class="settings-stack">
      <section v-if="auth.configured" class="settings-card account-card">
        <h2>Mi cuenta</h2>
        <template v-if="auth.authenticated"><p>{{ auth.user?.email }} · Tus espacios pueden continuar en otros dispositivos.</p><div class="settings-actions"><button class="secondary-action" type="button" @click="syncNow">Sincronizar ahora</button><button class="text-action" type="button" @click="disconnect">Desconectar</button></div></template>
        <template v-else><p>Conecta tu correo para respaldar y sincronizar tus espacios.</p><label class="field">Correo electrónico<input v-model="email" type="email" autocomplete="email" placeholder="tu@correo.cl" /></label><div v-if="codeRequested" class="otp-row"><label class="field">Código<input v-model="token" inputmode="numeric" autocomplete="one-time-code" maxlength="8" /></label><button class="primary-action" type="button" :disabled="!token.trim()" @click="verifyCode">Conectar</button></div><button v-else class="secondary-action" type="button" :disabled="!email.trim()" @click="requestCode">Enviar código</button></template>
        <p v-if="accountMessage" class="form-message" role="status">{{ accountMessage }}</p>
      </section>
      <section class="settings-card">
        <h2>Apariencia</h2>
        <p>Elige cómo quieres ver Áureo.</p>
        <div class="segmented" role="group" aria-label="Tema de la aplicación">
          <button v-for="theme in themes" :key="theme.value" type="button" :class="{ active: ui.preference === theme.value }" :aria-pressed="ui.preference === theme.value" @click="ui.setTheme(theme.value)">{{ theme.label }}</button>
        </div>
      </section>
      <section class="settings-card">
        <h2>Espacios visibles</h2>
        <p>Activa o desactiva módulos opcionales sin eliminar sus datos.</p>
        <label v-for="section in sections" :key="section.value" class="toggle-row">
          <span>{{ section.label }}</span>
          <input name="secciones_activas" :value="section.value" type="checkbox" :checked="profile.activeSections.has(section.value)" @change="profile.setSection(section.value, ($event.target as HTMLInputElement).checked)" />
        </label>
      </section>
      <section class="settings-card">
        <h2>Tus datos</h2>
        <p>Guarda una copia antes de cambiar de dispositivo o navegador.</p>
        <div class="settings-actions">
          <button class="secondary-action" type="button" @click="download">Exportar copia</button>
          <label class="file-action">Restaurar copia<input name="copia_aureo" type="file" accept="application/json" @change="upload" /></label>
        </div>
        <p v-if="message" class="form-message" role="status">{{ message }}</p>
      </section>
      <section class="settings-card danger-zone">
        <h2>Borrar información</h2>
        <p>Elimina los datos de Áureo guardados en este dispositivo.</p>
        <button class="danger-action" type="button" @click="deleting = true">Borrar mis datos</button>
      </section>
    </div>
    <ConfirmDialog :open="deleting" title="Borrar tus datos" message="Esta acción no se puede deshacer. Exporta una copia si deseas conservarlos." confirm-label="Borrar definitivamente" @cancel="deleting = false" @confirm="erase" />
  </main>
</template>
