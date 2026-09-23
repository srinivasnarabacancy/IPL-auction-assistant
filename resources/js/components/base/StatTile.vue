<script setup>
import MoneyValue from './MoneyValue.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // neutral | gold | brand | success | warning | danger
  /** Render `value` as an INR crore amount rather than plain text. */
  money: { type: Boolean, default: false },
})
</script>

<template>
  <div class="tile" :class="`tile--${tone}`">
    <span class="tile__label">{{ label }}</span>
    <strong class="tile__value num">
      <MoneyValue v-if="money" :value="Number(value)" />
      <template v-else>{{ value }}</template>
    </strong>
    <span v-if="hint" class="tile__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 16px 18px;
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-left: 3px solid var(--border-strong);
  border-radius: var(--radius);
}
.tile__label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-dim);
}
.tile__value { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
.tile__hint { font-size: 12px; color: var(--text-muted); }

.tile--gold { border-left-color: var(--accent); }
.tile--gold .tile__value { color: var(--accent); }
.tile--brand { border-left-color: var(--brand); }
.tile--brand .tile__value { color: #8fa2ff; }
.tile--success { border-left-color: var(--success); }
.tile--success .tile__value { color: var(--success); }
.tile--warning { border-left-color: var(--warning); }
.tile--warning .tile__value { color: var(--warning); }
.tile--danger { border-left-color: var(--danger); }
.tile--danger .tile__value { color: var(--danger); }
</style>
