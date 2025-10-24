<script lang="ts" setup>
import { computed } from 'vue'
import { useField, useForm } from 'vee-validate'
import * as yup from 'yup'

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

const validationSchema = yup.object({
  email: yup.string().email('Niepoprawny format emaila').required('Email jest wymagany'),
  password: yup.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').required('Hasło jest wymagane'),
  passwordConfirmation: yup
    .string()
    .oneOf([yup.ref('password')], 'Hasła muszą się zgadzać')
    .required('Potwierdzenie hasła jest wymagane'),
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
      label="Email"
      name="email"
      type="email"
      autocomplete="email"
    />
    <v-text-field
      v-model="password"
      :error-messages="passwordError"
      label="Hasło"
      name="password"
      type="password"
      autocomplete="new-password"
    />
    <v-text-field
      v-model="passwordConfirmation"
      :error-messages="passwordConfirmationError"
      label="Potwierdź hasło"
      name="passwordConfirmation"
      type="password"
      autocomplete="new-password"
    />
    <v-btn
      :disabled="isDisabled"
      :loading="loading"
      type="submit"
      color="primary"
      block
    >
      Zarejestruj
    </v-btn>
  </v-form>
</template>
