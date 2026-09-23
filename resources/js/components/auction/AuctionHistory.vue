<script setup>
import BaseBadge from '../base/BaseBadge.vue'
import BaseEmptyState from '../base/BaseEmptyState.vue'
import MoneyValue from '../base/MoneyValue.vue'

defineProps({ history: { type: Array, default: () => [] } })


const LABELS = {
  SOLD_TO_YOU: { text: 'Won', tone: 'success' },
  SOLD_TO_RIVAL: { text: 'Lost', tone: 'danger' },
  UNSOLD: { text: 'Unsold', tone: 'neutral' },
}

const time = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <BaseEmptyState
    v-if="!history.length"
    icon="🔨"
    title="No lots completed"
    message="Every sale, loss and unsold player will appear here."
  />
  <ul v-else class="hist">
    <li v-for="(item, index) in history" :key="`${item.playerId}-${index}`" class="hist__row">
      <BaseBadge :tone="LABELS[item.type].tone" size="sm">{{ LABELS[item.type].text }}</BaseBadge>
      <span class="hist__name truncate">{{ item.playerName }}</span>
      <span class="hist__price num"><MoneyValue :value="item.price" /></span>
      <span class="hist__to truncate dim">
        {{ item.type === 'SOLD_TO_RIVAL' ? item.leader : time(item.at) }}
      </span>
    </li>
  </ul>
</template>

<style scoped>
.hist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.hist__row {
  display: grid; grid-template-columns: 62px minmax(0, 1fr) auto 56px;
  align-items: center; gap: 10px;
  padding: 9px 2px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.hist__row:last-child { border-bottom: none; }
.hist__name { font-weight: 600; }
.hist__price { font-weight: 700; color: var(--accent); }
.hist__to { font-size: 11px; text-align: right; }
</style>
