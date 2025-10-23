<script lang="ts" setup>
import { ref } from 'vue';
import LoginForm from '../components/LoginForm.vue';
import RegisterForm from '../components/RegisterForm.vue';

const tab = ref('login');
</script>

<template>
  <v-container
    class="fill-height"
    fluid
  >
    <v-row
      align="center"
      justify="center"
    >
      <v-col
        cols="12"
        md="6"
        sm="8"
      >
        <v-card class="elevation-12">
          <v-tabs
            v-model="tab"
            align-tabs="center"
            grow
          >
            <v-tab value="login">
              Logowanie
            </v-tab>
            <v-tab value="register">
              Rejestracja
            </v-tab>
          </v-tabs>
          <v-card-text>
            <v-window v-model="tab">
              <v-window-item value="login">
                <LoginForm />
              </v-window-item>
              <v-window-item value="register">
                <RegisterForm />
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>