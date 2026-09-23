<script setup>
import { computed } from 'vue'
import MoneyValue from '../base/MoneyValue.vue'

const props = defineProps({
  budget: { type: Number, required: true },
  spent: { type: Number, required: true },
  remaining: { type: Number, required: true },
})


const pct = computed(() => Math.max(0, Math.min(100, (props.spent / (props.budget || 1)) * 100)))
const tone = computed(() => {
  if (props.remaining < 0) return 'danger'
  if (pct.value > 85) return 'warning'
  return 'ok'
})
</script>

<template>
  <div class="meter" :class="`meter--${tone}`">
    <div class="meter__top">
      <div>
        <span class="meter__label">Remaining purse</span>
        <strong class="meter__value num"><MoneyValue :value="remaining" /></strong>
      </div>
      <div class="meter__right">
        <span class="meter__label">Spent</span>
        <strong class="meter__spent num"><MoneyValue :value="spent" /></strong>
      </div>
    </div>

    <div class="meter__track">
      <div class="meter__fill" :style="{ width: `${pct}%` }" />
    </div>

    <div class="meter__foot">
      <span class="dim num">{{ Math.round(pct) }}% of <MoneyValue :value="budget" /> committed</span>
      <span v-if="remaining < 0" class="meter__over num">Over by <MoneyValue :value="Math.abs(remaining)" /></span>
    </div>
  </div>
</template>

<style scoped>
.meter { display: flex; flex-direction: column; gap: 11px; }
.meter__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.meter__right { text-align: right; }
.meter__label {
  display: block; font-size: 10.5px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600; margin-bottom: 3px;
}
.meter__value { font-size: 27px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
.meter__spent { font-size: 16px; font-weight: 700; color: var(--text-muted); }

.meter__track { height: 9px; background: var(--bg); border-radius: 99px; overflow: hidden; border: 1px solid var(--border); }
.meter__fill { height: 100%; border-radius: 99px; background: var(--text-dim); transition: width 0.35s ease; }

.meter__foot { display: flex; justify-content: space-between; gap: 10px; font-size: 11.5px; }
.meter__over { color: var(--danger); font-weight: 700; }

.meter--warning .meter__value { color: var(--warning); }
.meter--warning .meter__fill { background: var(--warning); }
.meter--danger .meter__value { color: var(--danger); }
.meter--danger .meter__fill { background: var(--danger); }
</style>
