<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: null },
  /** Show a leading + for positive amounts (deltas). */
  signed: { type: Boolean, default: false },
})

const isEmpty = computed(
  () => props.value === null || props.value === undefined || Number.isNaN(props.value),
)

const amount = computed(() => {
  const rounded = Math.round(props.value * 100) / 100
  const sign = props.signed && rounded > 0 ? '+' : ''
  return `${sign}${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
})
</script>

<template>
  <span v-if="isEmpty" class="money money--empty">—</span>
  <!--
    The rupee sign and the unit are set apart from the digits rather than baked
    into one string: Inter's U+20B9 is narrow and light, so at heavy weights it
    reads as a broken glyph beside tabular figures. Dropping it a size and a
    weight makes it read as the unit prefix it actually is. The text content is
    still "₹120 Cr", so screen readers and copy-paste are unaffected.
  -->
  <span v-else class="money"><span class="money__symbol">₹</span><span class="money__amount num">{{ amount }}</span><span class="money__unit"> Cr</span></span>
</template>

<style scoped>
.money { white-space: nowrap; }
.money--empty { color: var(--text-dim); }

.money__symbol {
  font-size: 0.72em;
  font-weight: 600;
  opacity: 0.62;
  margin-right: 0.08em;
  vertical-align: 0.045em;
}

.money__amount { font: inherit; }

.money__unit {
  font-size: 0.8em;
  font-weight: 600;
  opacity: 0.7;
}
</style>
