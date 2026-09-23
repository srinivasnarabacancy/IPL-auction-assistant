<script setup>
import PlayerCard from './PlayerCard.vue'
import BaseSpinner from '../base/BaseSpinner.vue'
import BaseEmptyState from '../base/BaseEmptyState.vue'
import { useSquadStore } from '@/stores/squad.js'
import { useCompareStore } from '@/stores/compare.js'

defineProps({
  players: { type: Array, default: () => [] },
  loading: Boolean,
  emptyTitle: { type: String, default: 'No players matched' },
  emptyMessage: { type: String, default: 'Try widening the price range or clearing a filter.' },
})

const squad = useSquadStore()
const compare = useCompareStore()
</script>

<template>
  <BaseSpinner v-if="loading" label="Loading players…" />
  <BaseEmptyState v-else-if="!players.length" icon="🔍" :title="emptyTitle" :message="emptyMessage">
    <slot name="empty-action" />
  </BaseEmptyState>
  <div v-else class="grid grid-auto">
    <PlayerCard
      v-for="player in players"
      :key="player.id"
      :player="player"
      :in-squad="squad.has(player.id)"
      :in-compare="compare.has(player.id)"
      :compare-disabled="compare.isFull"
      @toggle-squad="squad.toggle($event)"
      @toggle-compare="compare.toggle($event.id)"
    />
  </div>
</template>
