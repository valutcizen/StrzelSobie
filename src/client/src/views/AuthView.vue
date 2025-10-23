<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Auth</v-toolbar-title>
          </v-toolbar>
          <v-tabs v-model="tab" centered>
            <v-tab value="login">Login</v-tab>
            <v-tab value="register">Register</v-tab>
          </v-tabs>
          <v-card-text>
            <v-window v-model="tab">
              <v-window-item value="login">
                <v-form @submit.prevent="login">
                  <v-text-field
                    v-model="loginForm.email"
                    label="Email"
                    name="login-email"
                    prepend-icon="mdi-email"
                    type="email"
                    :rules="[rules.required, rules.email]"
                  ></v-text-field>
                  <v-text-field
                    v-model="loginForm.password"
                    label="Password"
                    name="login-password"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[rules.required]"
                  ></v-text-field>
                  <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" type="submit">Login</v-btn>
                  </v-card-actions>
                </v-form>
              </v-window-item>
              <v-window-item value="register">
                <v-form @submit.prevent="register">
                  <v-text-field
                    v-model="registerForm.email"
                    label="Email"
                    name="register-email"
                    prepend-icon="mdi-email"
                    type="email"
                    :rules="[rules.required, rules.email]"
                  ></v-text-field>
                  <v-text-field
                    v-model="registerForm.password"
                    label="Password"
                    name="register-password"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[rules.required, rules.min(8)]"
                  ></v-text-field>
                  <v-text-field
                    v-model="registerForm.confirmPassword"
                    label="Confirm Password"
                    name="register-confirm-password"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[rules.required, rules.confirmed(registerForm.password)]"
                  ></v-text-field>
                  <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" type="submit">Register</v-btn>
                  </v-card-actions>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';

const tab = ref('login');

const loginSchema = yup.object({
  email: yup.string().required().email(),
  password: yup.string().required(),
});

const { handleSubmit: login } = useForm({
  validationSchema: loginSchema,
  initialValues: {
    email: '',
    password: '',
  },
});

const registerSchema = yup.object({
  email: yup.string().required().email(),
  password: yup.string().required().min(8),
  confirmPassword: yup.string().required().oneOf([yup.ref('password')]),
});

const { handleSubmit: register, values: registerForm } = useForm({
  validationSchema: registerSchema,
  initialValues: {
    email: '',
    password: '',
    confirmPassword: '',
  },
});

const { value: loginEmail } = useField('email', loginSchema);
const { value: loginPassword } = useField('password', loginSchema);

const rules = {
  required: (value: string) => !!value || 'Required.',
  email: (value: string) => /.+@.+\..+/.test(value) || 'E-mail must be valid.',
  min: (length: number) => (value: string) => value.length >= length || `Min ${length} characters`,
  confirmed: (valueToConfirm: string) => (value: string) => value === valueToConfirm || 'Passwords must match',
};

const loginForm = ref({
  email: loginEmail,
  password: loginPassword
});
</script>
