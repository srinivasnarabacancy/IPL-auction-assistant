<script setup>
import AppShell from '@/components/layout/AppShell.vue'
</script>

<template>
  <AppShell>
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </AppShell>
</template>

<style>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.14s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
