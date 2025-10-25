<template>
  <v-row
    class="w-100"
    justify="center"
  >
    <v-col
      cols="12"
      md="6"
      lg="5"
    >
      <v-card class="elevation-10">
        <v-card-title class="text-h5 text-center">
          {{ t('auth.title') }}
        </v-card-title>
        <v-card-subtitle class="text-center">
          {{ t('auth.subtitle') }}
        </v-card-subtitle>
        <v-tabs
          v-model="activeTab"
          bg-color="transparent"
          grow
        >
          <v-tab value="login">
            {{ t('auth.login') }}
          </v-tab>
          <v-tab value="register">
            {{ t('auth.register') }}
          </v-tab>
        </v-tabs>
        <v-window v-model="activeTab">
          <v-window-item value="login">
            <v-card-text>
              <LoginForm
                :loading="loginState.loading"
                :error="loginState.error"
                @submit="handleLogin"
              />
            </v-card-text>
          </v-window-item>
          <v-window-item value="register">
            <v-card-text>
              <RegisterForm
                :loading="registerState.loading"
                :error="registerState.error"
                @submit="handleRegister"
              />
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'
import RegisterForm from '@/components/RegisterForm.vue'
import { useAuthStore } from '@/stores/auth'

type ActiveTab = 'login' | 'register'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<ActiveTab>('login')
const loginState = reactive({ loading: false, error: null as string | null })
const registerState = reactive({ loading: false, error: null as string | null })

const redirectTarget = computed(() => {
  const redirectParam = route.query.redirect
  return typeof redirectParam === 'string' ? redirectParam : null
})

const extractErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? error.response?.statusText ?? t('auth.operationFailed')
  }
  if (error instanceof Error) {
    return error.message
  }
  return t('auth.operationFailed')
}

const redirectAfterSuccess = async () => {
  if (redirectTarget.value) {
    await router.push(redirectTarget.value)
    return
  }

  await router.push({ name: 'Calendar', params: { rangeSlug: authStore.defaultRangeSlug } })
}

const handleLogin = async (payload: { email: string; password: string }) => {
  loginState.loading = true
  loginState.error = null
  try {
    await authStore.login(payload)
    await redirectAfterSuccess()
  } catch (error) {
    loginState.error = extractErrorMessage(error)
  } finally {
    loginState.loading = false
  }
}

const handleRegister = async (payload: { email: string; password: string; passwordConfirmation: string }) => {
  registerState.loading = true
  registerState.error = null
  try {
    await authStore.register({
      email: payload.email,
      password: payload.password,
    })
    await redirectAfterSuccess()
  } catch (error) {
    registerState.error = extractErrorMessage(error)
  } finally {
    registerState.loading = false
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    redirectAfterSuccess()
  }
})
</script>
