import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n'
import vuetify from './plugins/vuetify'
import { setupValidation } from './plugins/vee-validate'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

setupValidation()

app
  .use(pinia)
  .use(router)
  .use(i18n)
  .use(vuetify)
  .mount('#app')
