import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { runMigrations } from './data/migrations'
import './shared/styles/tokens.css'
import './shared/styles/global.css'
import './shared/styles/tailwind.css'

await runMigrations()
createApp(App).use(createPinia()).use(router).mount('#app')
