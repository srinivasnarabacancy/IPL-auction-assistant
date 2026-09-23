<script setup>
import { computed } from 'vue'

const props = defineProps({
  player: { type: Object, required: true },
})

const battingRows = computed(() => {
  const b = props.player.stats.batting
  if (!b.runs) return []
  return [
    { label: 'Runs', value: b.runs },
    { label: 'Average', value: b.average },
    { label: 'Strike rate', value: b.strikeRate, emphasis: true },
    { label: 'Fifties', value: b.fifties },
    { label: 'Hundreds', value: b.hundreds },
    { label: 'Highest', value: b.highestScore },
  ]
})

const bowlingRows = computed(() => {
  const w = props.player.stats.bowling
  if (!w.wickets) return []
  return [
    { label: 'Wickets', value: w.wickets },
    { label: 'Economy', value: w.economy, emphasis: true },
    { label: 'Average', value: w.average },
    { label: 'Best', value: w.bestFigures },
  ]
})
</script>

<template>
  <div class="statblocks">
    <div v-if="battingRows.length" class="statblock">
      <span class="section-title">Batting</span>
      <dl class="statblock__grid">
        <div v-for="row in battingRows" :key="row.label" class="statblock__item" :class="{ 'statblock__item--key': row.emphasis }">
          <dt>{{ row.label }}</dt>
          <dd class="num">{{ row.value }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="bowlingRows.length" class="statblock">
      <span class="section-title">Bowling</span>
      <dl class="statblock__grid">
        <div v-for="row in bowlingRows" :key="row.label" class="statblock__item" :class="{ 'statblock__item--key': row.emphasis }">
          <dt>{{ row.label }}</dt>
          <dd class="num">{{ row.value }}</dd>
        </div>
      </dl>
    </div>

    <p v-if="!battingRows.length && !bowlingRows.length" class="muted">
      No career statistics recorded for this player yet.
    </p>
  </div>
</template>

<style scoped>
.statblocks { display: flex; flex-direction: column; gap: 20px; }
.statblock { display: flex; flex-direction: column; gap: 10px; }
.statblock__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 10px; margin: 0; }
.statblock__item {
  display: flex; flex-direction: column; gap: 3px;
  padding: 11px 13px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.statblock__item--key { border-color: rgba(240, 165, 0, 0.3); background: var(--accent-soft); }
.statblock__item--key dd { color: var(--accent); }
.statblock__item dt { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
.statblock__item dd { margin: 0; font-size: 17px; font-weight: 700; }
</style>
