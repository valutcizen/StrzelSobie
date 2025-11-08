<script lang="ts" setup>
import { computed } from 'vue'
import { useField, useForm } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'

interface RegisterFormValues {
  email: string
  password: string
  passwordConfirmation: string
}

const props = withDefaults(
  defineProps<{
    loading?: boolean
    error?: string | null
  }>(),
  {
    loading: false,
    error: null,
  },
)

const emit = defineEmits<{
  submit: [payload: RegisterFormValues]
}>()

const { t } = useI18n()

const validationSchema = yup.object({
  email: yup
    .string()
    .email(t('auth.validation.emailInvalid'))
    .required(t('auth.validation.emailRequired')),
  password: yup
    .string()
    .min(8, t('auth.validation.passwordMinLength'))
    .required(t('auth.validation.passwordRequired')),
  passwordConfirmation: yup
    .string()
    .oneOf([yup.ref('password')], t('auth.validation.passwordsMustMatch'))
    .required(t('auth.validation.passwordConfirmationRequired')),
})

const { handleSubmit, meta } = useForm<RegisterFormValues>({
  validationSchema,
})

const { value: email, errorMessage: emailError } = useField<string>('email')
const { value: password, errorMessage: passwordError } = useField<string>('password')
const { value: passwordConfirmation, errorMessage: passwordConfirmationError } =
  useField<string>('passwordConfirmation')

const submit = handleSubmit((values) => {
  emit('submit', values)
})

const isDisabled = computed(() => props.loading || !meta.value.valid)
</script>

<template>
  <v-form @submit.prevent="submit">
    <v-alert
      v-if="error"
      border="start"
      color="error"
      density="comfortable"
      variant="tonal"
      class="mb-4"
      icon="mdi-alert-circle"
    >
      {{ error }}
    </v-alert>

    <v-text-field
      v-model="email"
      :error-messages="emailError"
      :label="t('auth.form.emailLabel')"
      name="email"
      type="email"
      autocomplete="email"
      data-testid="register-email-input"
    />
    <v-text-field
      v-model="password"
      :error-messages="passwordError"
      :label="t('auth.form.passwordLabel')"
      name="password"
      type="password"
      autocomplete="new-password"
      data-testid="register-password-input"
    />
    <v-text-field
      v-model="passwordConfirmation"
      :error-messages="passwordConfirmationError"
      :label="t('auth.form.passwordConfirmationLabel')"
      name="passwordConfirmation"
      type="password"
      autocomplete="new-password"
      data-testid="register-password-confirmation-input"
    />
    <v-btn
      :disabled="isDisabled"
      :loading="loading"
      type="submit"
      color="primary"
      block
      data-testid="register-submit-button"
    >
      {{ t('auth.actions.register') }}
    </v-btn>
  </v-form>
</template>
