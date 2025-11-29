<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="640"
    scroll-strategy="block"
    data-testid="auth-dialog"
  >
    <v-card class="auth-dialog">
      <div
        class="d-flex justify-end align-center pt-3 pr-3"
        style="gap: 8px;"
      >
        <LanguageSwitcher />
        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          :aria-label="t('common.actions.close')"
          data-testid="auth-dialog-close-button"
          @click="dialogOpen = false"
        />
      </div>
      <v-card-title class="text-h5 text-center pt-0">
        {{ t('auth.title') }}
      </v-card-title>
      <v-card-subtitle class="text-center">
        {{ t('auth.subtitle') }}
      </v-card-subtitle>

      <v-tabs
        v-model="activeTab"
        bg-color="transparent"
        grow
        data-testid="auth-tabs"
      >
        <v-tab
          value="login"
          data-testid="auth-login-tab"
        >
          {{ t('auth.login') }}
        </v-tab>
        <v-tab
          value="register"
          data-testid="auth-register-tab"
        >
          {{ t('auth.register') }}
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="login">
          <v-card-text>
            <LoginForm
              :loading="loginState.loading"
              :error="loginError"
              @submit="handleLogin"
            />
          </v-card-text>
        </v-window-item>
        <v-window-item value="register">
          <v-card-text>
            <RegisterForm
              :loading="registerState.loading"
              :error="registerError"
              @submit="handleRegister"
            />
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import axios from 'axios'
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'
import RegisterForm from '@/components/RegisterForm.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { useAuthStore } from '@/stores/auth'
import { useAuthDialogStore, type AuthDialogTab } from '@/stores/authDialog'
import { getLastRangeId } from '@/utils/lastRange'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const authDialogStore = useAuthDialogStore()

const dialogOpen = computed({
  get: () => authDialogStore.isOpen,
  set: (value: boolean) => {
    if (value) {
      authDialogStore.open()
      return
    }
    authDialogStore.close()
  },
})

const activeTab = computed<AuthDialogTab>({
  get: () => authDialogStore.activeTab,
  set: (tab) => authDialogStore.open({ tab }),
})

const loginState = reactive({ loading: false, errorKey: null as string | null })
const registerState = reactive({ loading: false, errorKey: null as string | null })

const loginError = computed(() => (loginState.errorKey ? t(loginState.errorKey) : null))
const registerError = computed(() => (registerState.errorKey ? t(registerState.errorKey) : null))
const fallbackRangeSlug = computed(() => getLastRangeId() ?? authStore.defaultRangeSlug)

const extractErrorKey = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) {
      return 'auth.invalidCredentials'
    }
    if (status === 400) {
      return 'auth.invalidBody'
    }
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? error.response?.statusText ?? 'auth.operationFailed'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'auth.operationFailed'
}

const resetErrors = () => {
  loginState.errorKey = null
  registerState.errorKey = null
}

const redirectAfterSuccess = async () => {
  const target = authDialogStore.popRedirectPath()
  authDialogStore.close()

  if (target) {
    await router.push(target)
    return
  }

  await router.push({ name: 'RangeLanding', params: { rangeSlug: fallbackRangeSlug.value } })
}

const handleLogin = async (payload: { email: string; password: string }) => {
  loginState.loading = true
  loginState.errorKey = null
  try {
    await authStore.login(payload)
    await redirectAfterSuccess()
  } catch (error) {
    loginState.errorKey = extractErrorKey(error)
  } finally {
    loginState.loading = false
  }
}

const handleRegister = async (payload: { email: string; password: string; passwordConfirmation: string }) => {
  registerState.loading = true
  registerState.errorKey = null
  try {
    await authStore.register({
      email: payload.email,
      password: payload.password,
    })
    await redirectAfterSuccess()
  } catch (error) {
    registerState.errorKey = extractErrorKey(error)
  } finally {
    registerState.loading = false
  }
}

watch(activeTab, resetErrors)

watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    resetErrors()
    loginState.loading = false
    registerState.loading = false
  }
})

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated && dialogOpen.value) {
      authDialogStore.close()
    }
  },
)
</script>

<style scoped>
.auth-dialog {
  border-radius: 16px;
}
</style>
