<script setup>
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'

const navOpen = ref(false)
</script>

<template>
  <div class="shell">
    <AppSidebar :open="navOpen" @navigate="navOpen = false" />
    <div v-if="navOpen" class="shell__scrim" @click="navOpen = false" />

    <div class="shell__main">
      <AppTopbar @toggle-nav="navOpen = !navOpen" />
      <main class="shell__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell { display: flex; min-height: 100vh; }
.shell__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.shell__content { flex: 1; padding: 24px 28px 48px; max-width: 1560px; width: 100%; }

.shell__scrim {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(4, 7, 20, 0.6);
}

@media (min-width: 981px) {
  .shell__scrim { display: none; }
}
@media (max-width: 980px) {
  .shell__content { padding: 18px 16px 40px; }
}
</style>
