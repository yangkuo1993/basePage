<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import FormFormat from './components/FormFormat.vue'
import ParseFormat from './components/ParseFormat.vue'
import MqttService from './components/MqttService.vue'
</script>

<template>
  <header>
    <el-card>
      <!-- <FormFormat></FormFormat> -->
      <!-- <ParseFormat></ParseFormat> -->
      <MqttService></MqttService>
    </el-card>
  </header>

  <RouterView />
</template>

<style scoped></style>
