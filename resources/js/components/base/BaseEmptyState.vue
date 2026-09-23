<script setup>
defineProps({
  icon: { type: String, default: '🏏' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="empty">
    <span class="empty__icon">{{ icon }}</span>
    <h4 class="empty__title">{{ title }}</h4>
    <p v-if="message" class="empty__message">{{ message }}</p>
    <div v-if="$slots.default" class="empty__action"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 48px 24px; text-align: center;
}
.empty__icon { font-size: 34px; opacity: 0.8; }
.empty__title { font-size: 15px; font-weight: 600; }
.empty__message { font-size: 13px; color: var(--text-muted); max-width: 420px; line-height: 1.55; }
.empty__action { margin-top: 8px; }
</style>
