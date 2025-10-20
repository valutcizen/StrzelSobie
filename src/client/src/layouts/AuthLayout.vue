<template>
  <v-container class="auth-layout" fluid>
    <v-row class="fill-height" align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <slot />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
}
</style>
