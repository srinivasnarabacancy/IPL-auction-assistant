<script setup>
import { computed, onMounted, ref } from 'vue'
import { useSquadStore } from '@/stores/squad.js'
import { useCompareStore } from '@/stores/compare.js'
import { systemApi } from '@/api/resources.js'
import BaseBadge from '../base/BaseBadge.vue'
import MoneyValue from '../base/MoneyValue.vue'

defineEmits(['toggle-nav'])

const squad = useSquadStore()
const compare = useCompareStore()
const health = ref(null)

onMounted(async () => {
  try {
    health.value = await systemApi.health()
  } catch {
    health.value = null
  }
})

const remaining = computed(() => squad.summary?.remainingBudget ?? squad.localRemaining)
const overBudget = computed(() => remaining.value < 0)
</script>

<template>
  <header class="topbar">
    <button class="topbar__burger" type="button" aria-label="Toggle navigation" @click="$emit('toggle-nav')">☰</button>

    <!--
      Nothing is shown while the API is healthy. A permanently green "online"
      badge and a model name are build details, not something an auction
      planner acts on; the only state worth interrupting for is the API being
      unreachable, because then every number on screen is stale.
    -->
    <div v-if="health === null" class="topbar__status">
      <BaseBadge tone="danger" size="sm">API offline</BaseBadge>
    </div>

    <div class="spacer" />

    <div class="topbar__metrics">
      <RouterLink v-if="compare.count" to="/compare" class="metric metric--link">
        <span class="metric__label">Compare</span>
        <strong class="metric__value num">{{ compare.count }}</strong>
      </RouterLink>
      <RouterLink to="/squad" class="metric metric--link">
        <span class="metric__label">Squad</span>
        <strong class="metric__value num">{{ squad.size }}</strong>
      </RouterLink>
      <div class="metric" :class="{ 'metric--danger': overBudget }">
        <span class="metric__label">Squad purse</span>
        <strong class="metric__value num"><MoneyValue :value="remaining" /></strong>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  display: flex; align-items: center; gap: 14px;
  padding: 0 28px;
  border-bottom: 1px solid var(--border);
  background: rgba(10, 14, 31, 0.72);
  backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 30;
}
.topbar__burger {
  display: none; background: transparent; border: 1px solid var(--border);
  border-radius: 8px; padding: 6px 10px; cursor: pointer; color: var(--text-muted);
}
.topbar__status { display: flex; gap: 7px; }
.topbar__metrics { display: flex; align-items: center; gap: 8px; }

.metric {
  display: flex; flex-direction: column; gap: 2px;
  padding: 7px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-width: 78px;
}
.metric--link { transition: border-color 0.15s ease; }
.metric--link:hover { border-color: var(--border-strong); }
.metric--danger { border-color: rgba(255, 92, 114, 0.4); }
.metric--danger .metric__value { color: var(--danger); }
.metric__label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }
.metric__value { font-size: 14px; font-weight: 700; }

@media (max-width: 980px) {
  .topbar { padding: 0 16px; }
  .topbar__burger { display: block; }
  .topbar__status { display: none; }
}
@media (max-width: 560px) {
  .metric { min-width: 0; padding: 6px 10px; }
  .metric__value { font-size: 12.5px; }
}
</style>
