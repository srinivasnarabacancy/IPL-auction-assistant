<script setup>
defineProps({ label: { type: String, default: 'Loading…' } })
</script>

<template>
  <div class="loader" role="status">
    <span class="loader__dot" />
    <span class="loader__dot" />
    <span class="loader__dot" />
    <span class="loader__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.loader { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 32px; }
.loader__dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
  animation: bounce 1.1s infinite ease-in-out;
}
.loader__dot:nth-child(2) { animation-delay: 0.15s; }
.loader__dot:nth-child(3) { animation-delay: 0.3s; }
.loader__label { margin-left: 8px; font-size: 13px; color: var(--text-muted); }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
