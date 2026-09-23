<script setup>
import { computed } from 'vue'
import BaseBadge from '../base/BaseBadge.vue'
import MoneyValue from '../base/MoneyValue.vue'

const props = defineProps({
  player: { type: Object, required: true },
  inSquad: Boolean,
  inCompare: Boolean,
  compareDisabled: Boolean,
  price: { type: Number, default: null },
})
defineEmits(['toggle-squad', 'toggle-compare'])


const roleTone = { Batter: 'brand', Bowler: 'magenta', 'All-rounder': 'gold', Wicketkeeper: 'success' }

/** The two numbers that matter most for this player's role. */
const headline = computed(() => {
  const { batting, bowling } = props.player.stats
  if (props.player.role === 'Bowler') {
    return [
      { label: 'Wickets', value: bowling.wickets || '—' },
      { label: 'Economy', value: bowling.economy || '—' },
    ]
  }
  if (props.player.role === 'All-rounder') {
    return [
      { label: 'Runs', value: batting.runs || '—' },
      { label: 'Wickets', value: bowling.wickets || '—' },
    ]
  }
  return [
    { label: 'Runs', value: batting.runs || '—' },
    { label: 'Strike rate', value: batting.strikeRate || '—' },
  ]
})
</script>

<template>
  <article class="pcard" :class="{ 'pcard--owned': inSquad }">
    <RouterLink :to="`/players/${player.id}`" class="pcard__link">
      <header class="pcard__head">
        <div class="pcard__identity">
          <h4 class="pcard__name truncate">{{ player.name }}</h4>
          <p class="pcard__meta truncate">
            {{ player.country }} · {{ player.age }}y
            <template v-if="player.team2025"> · {{ player.team2025 }}</template>
          </p>
        </div>
        <div class="pcard__rating num" :title="`Assistant rating ${player.rating}/100`">{{ player.rating }}</div>
      </header>

      <div class="pcard__badges">
        <BaseBadge :tone="roleTone[player.role] || 'neutral'" size="sm">{{ player.role }}</BaseBadge>
        <BaseBadge :tone="player.nationality === 'Overseas' ? 'warning' : 'neutral'" size="sm">
          {{ player.nationality }}
        </BaseBadge>
        <BaseBadge v-if="!player.capped" tone="neutral" size="sm">Uncapped</BaseBadge>
      </div>

      <dl class="pcard__stats">
        <div v-for="stat in headline" :key="stat.label" class="pcard__stat">
          <dt>{{ stat.label }}</dt>
          <dd class="num">{{ stat.value }}</dd>
        </div>
        <div class="pcard__stat pcard__stat--price">
          <dt>{{ price != null ? 'Paid' : 'Base' }}</dt>
          <dd class="num"><MoneyValue :value="price ?? player.basePrice" /></dd>
        </div>
      </dl>
    </RouterLink>

    <footer class="pcard__actions">
      <button
        class="act"
        :class="{ 'act--on': inSquad }"
        type="button"
        @click="$emit('toggle-squad', player)"
      >
        {{ inSquad ? '✓ In squad' : '+ Add to squad' }}
      </button>
      <button
        class="act act--icon"
        :class="{ 'act--on': inCompare }"
        type="button"
        :disabled="compareDisabled && !inCompare"
        :title="inCompare ? 'Remove from comparison' : 'Add to comparison'"
        @click="$emit('toggle-compare', player)"
      >
        ⇄
      </button>
    </footer>
  </article>
</template>

<style scoped>
.pcard {
  display: flex; flex-direction: column;
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.pcard:hover { border-color: var(--border-strong); transform: translateY(-2px); }
.pcard--owned { border-color: rgba(47, 209, 140, 0.4); }

.pcard__link { display: block; padding: 16px 16px 12px; }

.pcard__head { display: flex; align-items: flex-start; gap: 10px; justify-content: space-between; }
.pcard__identity { min-width: 0; }
.pcard__name { font-size: 15px; font-weight: 700; }
.pcard__meta { font-size: 11.5px; color: var(--text-dim); margin-top: 3px; }
.pcard__rating {
  flex-shrink: 0;
  font-size: 15px; font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid rgba(240, 165, 0, 0.3);
  border-radius: 9px;
  padding: 5px 9px;
}

.pcard__badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 12px; }

.pcard__stats {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px; margin: 14px 0 0; padding-top: 12px;
  border-top: 1px solid var(--border);
}
.pcard__stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pcard__stat dt { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
.pcard__stat dd { margin: 0; font-size: 13.5px; font-weight: 700; }
.pcard__stat--price dd { color: var(--accent); }

.pcard__actions { display: flex; gap: 1px; border-top: 1px solid var(--border); margin-top: auto; }
.act {
  flex: 1; padding: 10px; background: transparent; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--text-muted);
  transition: background 0.15s ease, color 0.15s ease;
}
.act:hover:not(:disabled) { background: var(--surface-hover); color: var(--text); }
.act:disabled { opacity: 0.35; cursor: not-allowed; }
.act--on { color: var(--success); background: var(--success-soft); }
.act--icon { flex: 0 0 52px; border-left: 1px solid var(--border); font-size: 14px; }
.act--icon.act--on { color: var(--brand); background: var(--brand-soft); }
</style>
