<script lang="ts" setup>
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';

const validationSchema = yup.object({
  email: yup.string().email('Niepoprawny format emaila').required('Email jest wymagany'),
  password: yup.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').required('Hasło jest wymagane'),
  passwordConfirmation: yup.string().oneOf([yup.ref('password')], 'Hasła muszą się zgadzać').required('Potwierdzenie hasła jest wymagane'),
});

const { handleSubmit } = useForm({
  validationSchema,
});

const { value: email, errorMessage: emailError } = useField<string>('email');
const { value: password, errorMessage: passwordError } = useField<string>('password');
const { value: passwordConfirmation, errorMessage: passwordConfirmationError } = useField<string>('passwordConfirmation');

const submit = handleSubmit(async (values) => {
  console.log('Register submitted', values);
  // TODO: Call register API
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
      type="submit"
      color="primary"
      block
    >
      Zarejestruj
    </v-btn>
  </v-form>
</template>
