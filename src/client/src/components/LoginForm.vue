<script lang="ts" setup>
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';

const validationSchema = yup.object({
  email: yup.string().email('Niepoprawny format emaila').required('Email jest wymagany'),
  password: yup.string().required('Hasło jest wymagane'),
});

const { handleSubmit } = useForm({
  validationSchema,
});

const { value: email, errorMessage: emailError } = useField<string>('email');
const { value: password, errorMessage: passwordError } = useField<string>('password');

const submit = handleSubmit(async (values) => {
  console.log('Login submitted', values);
  // TODO: Call login API
});
</script>

<template>
  <v-form @submit.prevent="submit">
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
      type="submit"
      color="primary"
      block
    >
      Zaloguj
    </v-btn>
  </v-form>
</template>
