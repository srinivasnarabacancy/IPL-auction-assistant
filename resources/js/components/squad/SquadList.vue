<script setup>
import BaseBadge from '../base/BaseBadge.vue'
import BaseEmptyState from '../base/BaseEmptyState.vue'
import MoneyValue from '../base/MoneyValue.vue'

defineProps({
  entries: { type: Array, default: () => [] },
  editable: { type: Boolean, default: true },
})
defineEmits(['remove', 'update-price'])

const roleTone = { Batter: 'brand', Bowler: 'magenta', 'All-rounder': 'gold', Wicketkeeper: 'success' }
</script>

<template>
  <BaseEmptyState
    v-if="!entries.length"
    icon="📋"
    title="No players selected yet"
    message="Add players from the Player Explorer or win them in the Auction Room to start building a squad."
  >
    <slot name="empty-action" />
  </BaseEmptyState>

  <ul v-else class="slist">
    <li v-for="entry in entries" :key="entry.player.id" class="slist__row">
      <RouterLink :to="`/players/${entry.player.id}`" class="slist__main">
        <div class="slist__identity">
          <strong class="slist__name truncate">{{ entry.player.name }}</strong>
          <span class="slist__meta truncate">{{ entry.player.country }} · rating {{ entry.player.rating }}</span>
        </div>
      </RouterLink>

      <div class="slist__badges">
        <BaseBadge :tone="roleTone[entry.player.role] || 'neutral'" size="sm">{{ entry.player.role }}</BaseBadge>
        <BaseBadge v-if="entry.player.nationality === 'Overseas'" tone="warning" size="sm">Overseas</BaseBadge>
      </div>

      <div class="slist__price">
        <input
          v-if="editable"
          class="slist__input num"
          type="number"
          step="0.05"
          min="0"
          :value="entry.price"
          aria-label="Price paid in crore"
          @change="$emit('update-price', entry.player.id, $event.target.value)"
        />
        <span v-else class="slist__paid num"><MoneyValue :value="entry.price" /></span>
      </div>

      <button v-if="editable" class="slist__remove" type="button" title="Remove" @click="$emit('remove', entry.player.id)">
        ✕
      </button>
    </li>
  </ul>
</template>

<style scoped>
.slist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.slist__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 108px 32px;
  align-items: center; gap: 12px;
  padding: 11px 4px;
  border-bottom: 1px solid var(--border);
}
.slist__row:last-child { border-bottom: none; }

.slist__main { min-width: 0; }
.slist__identity { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.slist__name { font-size: 13.5px; font-weight: 600; }
.slist__main:hover .slist__name { color: var(--accent); }
.slist__meta { font-size: 11px; color: var(--text-dim); }

.slist__badges { display: flex; gap: 5px; }

.slist__input {
  width: 100%; text-align: right;
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 7px; padding: 6px 9px; font-size: 13px; font-weight: 600; outline: none;
}
.slist__input:focus { border-color: var(--brand); }
.slist__paid { font-size: 13.5px; font-weight: 700; color: var(--accent); text-align: right; display: block; }

.slist__remove {
  background: transparent; border: none; cursor: pointer;
  color: var(--text-dim); font-size: 12px; padding: 5px; border-radius: 6px;
}
.slist__remove:hover { color: var(--danger); background: var(--danger-soft); }

@media (max-width: 620px) {
  .slist__row { grid-template-columns: minmax(0, 1fr) 96px 30px; row-gap: 6px; }
  .slist__badges { grid-column: 1 / -1; order: 3; }
}
</style>
