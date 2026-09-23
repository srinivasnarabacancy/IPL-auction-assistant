<script setup>
import { computed } from 'vue'

const props = defineProps({
  distribution: { type: Object, required: true },
  total: { type: Number, default: 0 },
})

const TONES = {
  Batter: 'var(--brand)',
  Bowler: 'var(--magenta)',
  'All-rounder': 'var(--accent)',
  Wicketkeeper: 'var(--success)',
}

const rows = computed(() =>
  Object.entries(props.distribution).map(([role, count]) => ({
    role,
    count,
    color: TONES[role] || 'var(--text-dim)',
    pct: props.total ? (count / props.total) * 100 : 0,
  })),
)
</script>

<template>
  <div class="dist">
    <div v-if="total" class="dist__bar">
      <div
        v-for="row in rows.filter((r) => r.count)"
        :key="row.role"
        class="dist__seg"
        :style="{ width: `${row.pct}%`, background: row.color }"
        :title="`${row.role}: ${row.count}`"
      />
    </div>
    <div v-else class="dist__bar dist__bar--empty" />

    <ul class="dist__legend">
      <li v-for="row in rows" :key="row.role" class="dist__item">
        <span class="dist__swatch" :style="{ background: row.color }" />
        <span class="dist__role truncate">{{ row.role }}</span>
        <strong class="dist__count num">{{ row.count }}</strong>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dist { display: flex; flex-direction: column; gap: 14px; }
.dist__bar {
  display: flex; height: 10px; border-radius: 99px; overflow: hidden;
  background: var(--bg); border: 1px solid var(--border);
}
.dist__bar--empty { opacity: 0.5; }
.dist__seg { transition: width 0.3s ease; }

.dist__legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dist__item { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dist__swatch { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.dist__role { font-size: 12.5px; color: var(--text-muted); flex: 1; }
.dist__count { font-size: 13px; font-weight: 700; }
</style>
