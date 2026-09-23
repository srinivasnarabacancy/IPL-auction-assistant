<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  padded: { type: Boolean, default: true },
  accent: { type: String, default: '' }, // '', 'gold', 'brand', 'magenta'
})
</script>

<template>
  <section class="card" :class="[accent && `card--${accent}`]">
    <header v-if="title || $slots.actions" class="card__head">
      <div class="card__titles">
        <h3 class="card__title">{{ title }}</h3>
        <p v-if="subtitle" class="card__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="card__actions"><slot name="actions" /></div>
    </header>
    <div class="card__body" :class="{ 'card__body--padded': padded }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.card {
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
.card--gold::before,
.card--brand::before,
.card--magenta::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
}
.card--gold::before { background: linear-gradient(90deg, var(--accent), transparent); }
.card--brand::before { background: linear-gradient(90deg, var(--brand), transparent); }
.card--magenta::before { background: linear-gradient(90deg, var(--magenta), transparent); }

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}
.card__title { font-size: 15px; font-weight: 600; }
.card__subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.card__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.card__body--padded { padding: 18px; }
</style>
