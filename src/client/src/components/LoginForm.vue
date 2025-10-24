<script lang="ts" setup>
import { computed } from 'vue'
import { useField, useForm } from 'vee-validate'
import * as yup from 'yup'

interface LoginFormValues {
  email: string
  password: string
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
  submit: [payload: LoginFormValues]
}>()

const validationSchema = yup.object({
  email: yup.string().email('Niepoprawny format emaila').required('Email jest wymagany'),
  password: yup.string().required('Hasło jest wymagane'),
})

const { handleSubmit, meta } = useForm<LoginFormValues>({
  validationSchema,
})

const { value: email, errorMessage: emailError } = useField<string>('email')
const { value: password, errorMessage: passwordError } = useField<string>('password')

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
      autocomplete="current-password"
    />
    <v-btn
      :disabled="isDisabled"
      :loading="loading"
      type="submit"
      color="primary"
      block
    >
      Zaloguj
    </v-btn>
  </v-form>
</template>
