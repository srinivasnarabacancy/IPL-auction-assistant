<script setup>
import { computed, watch } from 'vue'
import { usePlayersStore } from '@/stores/players.js'
import { useCompareStore } from '@/stores/compare.js'
import { useSquadStore } from '@/stores/squad.js'
import { useAsync } from '@/composables/useAsync.js'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import PlayerCompareTable from '@/components/player/PlayerCompareTable.vue'
import MoneyValue from '@/components/base/MoneyValue.vue'

const players = usePlayersStore()
const compare = useCompareStore()
const squad = useSquadStore()

const { data, loading, run } = useAsync((ids) => players.compare(ids))

watch(
  () => compare.ids,
  (ids) => {
    if (ids.length) run(ids)
  },
  { immediate: true, deep: true },
)

const selected = computed(() => (compare.ids.length ? data.value?.players ?? [] : []))
const combinedBase = computed(() => selected.value.reduce((sum, player) => sum + player.basePrice, 0))
const overseasSelected = computed(() => selected.value.filter((p) => p.nationality === 'Overseas').length)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Compare Players</h1>
        <p class="subtitle">
          Put up to {{ compare.maxSlots }} players side by side. The best value in each row is highlighted.
        </p>
      </div>
      <div class="row-wrap">
        <BaseButton v-if="compare.count" variant="ghost" @click="compare.clear()">Clear selection</BaseButton>
        <RouterLink to="/players"><BaseButton variant="secondary">Add players →</BaseButton></RouterLink>
      </div>
    </header>

    <BaseEmptyState
      v-if="!compare.count"
      icon="⇄"
      title="Nothing selected yet"
      message="Pick players from the Player Explorer using the ⇄ button on any card, then come back here."
    >
      <RouterLink to="/players"><BaseButton variant="primary">Browse players</BaseButton></RouterLink>
    </BaseEmptyState>

    <template v-else>
      <div class="grid grid-3">
        <div class="mini">
          <span class="mini__label">Players compared</span>
          <strong class="mini__value num">{{ selected.length }}</strong>
        </div>
        <div class="mini">
          <span class="mini__label">Combined base price</span>
          <strong class="mini__value num"><MoneyValue :value="combinedBase" /></strong>
        </div>
        <div class="mini" :class="{ 'mini--warn': overseasSelected > 0 }">
          <span class="mini__label">Overseas among them</span>
          <strong class="mini__value num">{{ overseasSelected }}</strong>
        </div>
      </div>

      <BaseCard title="Head to head" :padded="false">
        <BaseSpinner v-if="loading && !selected.length" label="Loading comparison…" />
        <PlayerCompareTable
          v-else-if="selected.length"
          :players="selected"
          :bests="data?.bests || {}"
          @remove="compare.remove($event)"
        />
      </BaseCard>

      <BaseCard v-if="selected.length" title="Add to squad" subtitle="Sign any of these at base price">
        <div class="row-wrap">
          <BaseButton
            v-for="player in selected"
            :key="player.id"
            :variant="squad.has(player.id) ? 'success' : 'secondary'"
            size="sm"
            @click="squad.toggle(player)"
          >
            {{ squad.has(player.id) ? '✓' : '+' }} {{ player.name }} · <MoneyValue :value="player.basePrice" />
          </BaseButton>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<style scoped>
.mini {
  display: flex; flex-direction: column; gap: 4px;
  padding: 15px 18px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
}
.mini--warn { border-color: rgba(255, 181, 71, 0.35); }
.mini__label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600; }
.mini__value { font-size: 22px; font-weight: 700; }
.mini--warn .mini__value { color: var(--warning); }
</style>
