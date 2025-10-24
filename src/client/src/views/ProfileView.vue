<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { onMounted } from 'vue';

const authStore = useAuthStore();

onMounted(() => {
  if (!authStore.user) {
    authStore.fetchUser();
  }
});
</script>

<template>
  <v-container>
    <v-row justify="center">
      <v-col
        cols="12"
        md="8"
        lg="6"
      >
        <v-card
          v-if="authStore.user"
          title="Mój profil"
        >
          <v-card-text>
            <div>
              <strong>Email:</strong> {{ authStore.user.email }}
            </div>
            <div class="mt-4">
              <strong>Role:</strong>
              <v-chip-group>
                <v-chip
                  v-for="role in authStore.user.roles"
                  :key="role"
                >
                  {{ role }}
                </v-chip>
              </v-chip-group>
            </div>
          </v-card-text>
        </v-card>
        <v-skeleton-loader
          v-else
          type="card"
        />
      </v-col>
    </v-row>
  </v-container>
</template>