<template>
  <v-card>
    <v-tabs
      v-model="activeTab"
      color="primary"
      grow
    >
      <v-tab value="login">
        {{ t('auth.loginTab') }}
      </v-tab>
      <v-tab value="register">
        {{ t('auth.registerTab') }}
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="login">
        <Form
          :validation-schema="loginSchema"
          @submit="handleLogin"
        >
          <template #default="{ meta, isSubmitting }">
            <v-card-text>
              <Field
                name="email"
                v-slot="{ field, errorMessage }"
              >
                <v-text-field
                  v-bind="field"
                  :error-messages="errorMessage"
                  :label="t('auth.email')"
                  autocomplete="email"
                  type="email"
                  variant="outlined"
                />
              </Field>
              <Field
                name="password"
                v-slot="{ field, errorMessage }"
              >
                <v-text-field
                  v-bind="field"
                  :error-messages="errorMessage"
                  :label="t('auth.password')"
                  autocomplete="current-password"
                  type="password"
                  variant="outlined"
                />
              </Field>
              <v-alert
                v-if="authStore.lastError"
                class="mt-4"
                color="error"
                density="compact"
                variant="tonal"
              >
                {{ authStore.lastError }}
              </v-alert>
            </v-card-text>
            <v-card-actions>
              <v-btn
                :disabled="!meta.valid"
                :loading="isSubmitting"
                block
                color="primary"
                type="submit"
              >
                {{ t('auth.login') }}
              </v-btn>
            </v-card-actions>
          </template>
        </Form>
      </v-window-item>

      <v-window-item value="register">
        <Form
          :validation-schema="registerSchema"
          @submit="handleRegister"
        >
          <template #default="{ meta, isSubmitting }">
            <v-card-text>
              <Field
                name="email"
                v-slot="{ field, errorMessage }"
              >
                <v-text-field
                  v-bind="field"
                  :error-messages="errorMessage"
                  :label="t('auth.email')"
                  autocomplete="email"
                  type="email"
                  variant="outlined"
                />
              </Field>
              <Field
                name="password"
                v-slot="{ field, errorMessage }"
              >
                <v-text-field
                  v-bind="field"
                  :error-messages="errorMessage"
                  :label="t('auth.password')"
                  autocomplete="new-password"
                  type="password"
                  variant="outlined"
                />
              </Field>
              <v-alert
                v-if="authStore.lastError"
                class="mt-4"
                color="error"
                density="compact"
                variant="tonal"
              >
                {{ authStore.lastError }}
              </v-alert>
            </v-card-text>
            <v-card-actions>
              <v-btn
                :disabled="!meta.valid"
                :loading="isSubmitting"
                block
                color="primary"
                type="submit"
              >
                {{ t('auth.register') }}
              </v-btn>
            </v-card-actions>
          </template>
        </Form>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Form, Field } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>('login')

const baseSchema = {
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
}

const loginSchema = yup.object(baseSchema)
const registerSchema = yup.object(baseSchema)

interface AuthFormValues {
  email: string
  password: string
}

const redirectAfterLogin = () => {
  const redirect = route.query.redirect

  if (typeof redirect === 'string') {
    router.push(redirect)
    return
  }

  router.push({ name: 'calendar', params: { rangeSlug: authStore.defaultRangeSlug ?? 'dobczyce' } })
}

const handleLogin: SubmissionHandler = async (values, _ctx) => {
  const formValues = values as AuthFormValues
  await authStore.login(formValues)
  redirectAfterLogin()
}

const handleRegister: SubmissionHandler = async (values, _ctx) => {
  const formValues = values as AuthFormValues
  await authStore.register(formValues)
  redirectAfterLogin()
}
</script>
