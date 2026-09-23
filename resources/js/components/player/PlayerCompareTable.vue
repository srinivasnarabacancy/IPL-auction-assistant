<script setup>
import { computed } from 'vue'
import BaseBadge from '../base/BaseBadge.vue'
import MoneyValue from '../base/MoneyValue.vue'

const props = defineProps({
  players: { type: Array, required: true },
  bests: { type: Object, default: () => ({}) },
})
defineEmits(['remove'])


const read = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj)

/** Rows are grouped so batting numbers never sit next to bowling numbers. */
const GROUPS = [
  {
    label: 'Profile',
    rows: [
      { key: 'role', label: 'Role' },
      { key: 'nationality', label: 'Origin' },
      { key: 'country', label: 'Country' },
      { key: 'age', label: 'Age' },
      { key: 'team2025', label: 'Last team' },
      { key: 'battingOrder', label: 'Batting position' },
      { key: 'bowlingStyle', label: 'Bowling style' },
    ],
  },
  {
    label: 'Value',
    rows: [
      { key: 'basePrice', label: 'Base price', format: 'crore' },
      { key: 'rating', label: 'Assistant rating' },
      { key: 'stats.matches', label: 'Matches' },
    ],
  },
  {
    label: 'Batting',
    rows: [
      { key: 'stats.batting.runs', label: 'Runs' },
      { key: 'stats.batting.average', label: 'Average' },
      { key: 'stats.batting.strikeRate', label: 'Strike rate' },
      { key: 'stats.batting.highestScore', label: 'Highest' },
    ],
  },
  {
    label: 'Bowling',
    rows: [
      { key: 'stats.bowling.wickets', label: 'Wickets' },
      { key: 'stats.bowling.economy', label: 'Economy' },
      { key: 'stats.bowling.average', label: 'Average' },
      { key: 'stats.bowling.bestFigures', label: 'Best figures' },
    ],
  },
]

/** Hide a whole group when no selected player has any value in it. */
const groups = computed(() =>
  GROUPS.map((group) => ({
    ...group,
    rows: group.rows.filter((row) =>
      props.players.some((player) => {
        const value = read(player, row.key)
        return value !== undefined && value !== null && value !== '' && value !== 0 && value !== '-'
      }),
    ),
  })).filter((group) => group.rows.length),
)

const isBlank = (value) =>
  value === undefined || value === null || value === '' || value === '-' || value === 0

const display = (player, row) => {
  const value = read(player, row.key)
  return isBlank(value) ? '—' : value
}

/** Money cells render through MoneyValue instead of a formatted string. */
const moneyValue = (player, row) => {
  if (row.format !== 'crore') return null
  const value = read(player, row.key)
  return isBlank(value) ? null : value
}

const isBest = (player, row) => props.bests[row.key] === player.id && props.players.length > 1
</script>

<template>
  <div class="cmp">
    <table class="cmp__table">
      <thead>
        <tr>
          <th class="cmp__corner">Metric</th>
          <th v-for="player in players" :key="player.id" class="cmp__player">
            <RouterLink :to="`/players/${player.id}`" class="cmp__name">{{ player.name }}</RouterLink>
            <div class="cmp__tags">
              <BaseBadge tone="neutral" size="sm">{{ player.role }}</BaseBadge>
              <BaseBadge :tone="player.nationality === 'Overseas' ? 'warning' : 'neutral'" size="sm">
                {{ player.nationality }}
              </BaseBadge>
            </div>
            <button class="cmp__remove" type="button" @click="$emit('remove', player.id)">Remove</button>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="group in groups" :key="group.label">
          <tr class="cmp__grouprow">
            <td :colspan="players.length + 1">{{ group.label }}</td>
          </tr>
          <tr v-for="row in group.rows" :key="row.key">
            <th scope="row" class="cmp__metric">{{ row.label }}</th>
            <td
              v-for="player in players"
              :key="player.id"
              class="cmp__cell num"
              :class="{ 'cmp__cell--best': isBest(player, row) }"
            >
              <MoneyValue v-if="moneyValue(player, row) !== null" :value="moneyValue(player, row)" />
              <template v-else>{{ display(player, row) }}</template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.cmp { overflow-x: auto; }
.cmp__table { width: 100%; border-collapse: collapse; min-width: 520px; }

.cmp__corner, .cmp__player {
  padding: 14px 16px; text-align: left; vertical-align: top;
  border-bottom: 1px solid var(--border-strong);
}
.cmp__corner { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); width: 190px; }
.cmp__name { font-size: 15px; font-weight: 700; display: block; }
.cmp__name:hover { color: var(--accent); }
.cmp__tags { display: flex; gap: 5px; margin-top: 7px; flex-wrap: wrap; }
.cmp__remove {
  margin-top: 9px; background: none; border: none; cursor: pointer;
  color: var(--text-dim); font-size: 11px; padding: 0; text-decoration: underline;
}
.cmp__remove:hover { color: var(--danger); }

.cmp__grouprow td {
  padding: 14px 16px 6px;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); font-weight: 700;
}
.cmp__metric {
  padding: 10px 16px; text-align: left; font-weight: 500;
  font-size: 13px; color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.cmp__cell {
  padding: 10px 16px; font-size: 13.5px; font-weight: 600;
  border-bottom: 1px solid var(--border);
}
.cmp__cell--best {
  color: var(--success);
  background: var(--success-soft);
  box-shadow: inset 2px 0 0 var(--success);
}
</style>
