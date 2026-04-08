import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupRouterGuards } from './router/guards'
import i18n from './plugins/i18n'
import vuetify from './plugins/vuetify'
import { setupValidation } from './plugins/vee-validate'
import { setupHttpInterceptors } from './services/http'
import { useAuthStore } from './stores/auth'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'
import './assets/flag-icons.css'

const app = createApp(App)
const pinia = createPinia()
const authStore = useAuthStore(pinia)

setupValidation()
setupRouterGuards(router, pinia)
setupHttpInterceptors(router, pinia, authStore)

app
  .use(pinia)
  .use(router)
  .use(i18n)
  .use(vuetify)
  .mount('#app')
