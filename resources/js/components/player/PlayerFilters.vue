<script setup>
import BaseSelect from '../base/BaseSelect.vue'
import BaseInput from '../base/BaseInput.vue'
import BaseButton from '../base/BaseButton.vue'
import BaseBadge from '../base/BaseBadge.vue'

defineProps({
  filters: { type: Object, required: true },
  facets: { type: Object, default: null },
  activeCount: { type: Number, default: 0 },
  resultCount: { type: Number, default: 0 },
})
const emit = defineEmits(['reset', 'toggle-tag'])

const sortOptions = [
  { value: 'rating', label: 'Rating (high → low)' },
  { value: 'basePrice', label: 'Base price (high → low)' },
  { value: 'basePriceAsc', label: 'Base price (low → high)' },
  { value: 'runs', label: 'Career runs' },
  { value: 'strikeRate', label: 'Strike rate' },
  { value: 'wickets', label: 'Wickets' },
  { value: 'economy', label: 'Economy (best first)' },
  { value: 'age', label: 'Age (youngest first)' },
  { value: 'name', label: 'Name (A → Z)' },
]

// A curated shortlist keeps the tag row scannable; the full set is searchable.
const QUICK_TAGS = [
  'Death bowling', 'Powerplay', 'Finisher', 'Anchor',
  'Middle-overs', 'Wicket-taker', 'Economy', 'Leadership', 'Uncapped',
]
</script>

<template>
  <div class="filters">
    <div class="filters__row">
      <BaseInput
        :model-value="filters.search"
        label="Search"
        placeholder="Name, team, country, style…"
        @update:model-value="filters.search = $event"
      >
        <template #prefix><span class="filters__icon">⌕</span></template>
      </BaseInput>

      <BaseSelect
        :model-value="filters.role"
        label="Role"
        placeholder="All roles"
        :options="facets?.roles || []"
        @update:model-value="filters.role = $event"
      />
      <BaseSelect
        :model-value="filters.nationality"
        label="Origin"
        placeholder="Indian + Overseas"
        :options="facets?.nationalities || []"
        @update:model-value="filters.nationality = $event"
      />
      <BaseSelect
        :model-value="filters.battingOrder"
        label="Batting position"
        placeholder="Any position"
        :options="facets?.battingOrders || []"
        @update:model-value="filters.battingOrder = $event"
      />
      <BaseSelect
        :model-value="filters.bowlingType"
        label="Bowling type"
        placeholder="Pace + Spin"
        :options="facets?.bowlingTypes || []"
        @update:model-value="filters.bowlingType = $event"
      />
    </div>

    <div class="filters__row filters__row--tight">
      <BaseInput
        :model-value="filters.minPrice"
        label="Min base (₹ Cr)"
        type="number"
        step="0.05"
        min="0"
        placeholder="0"
        @update:model-value="filters.minPrice = $event"
      />
      <BaseInput
        :model-value="filters.maxPrice"
        label="Max base (₹ Cr)"
        type="number"
        step="0.05"
        min="0"
        placeholder="Any"
        @update:model-value="filters.maxPrice = $event"
      />
      <BaseSelect
        :model-value="filters.sortBy"
        label="Sort by"
        placeholder="Rating"
        :options="sortOptions"
        @update:model-value="filters.sortBy = $event || 'rating'"
      />
      <div class="filters__summary">
        <span class="filters__count num">{{ resultCount }}</span>
        <span class="filters__countlabel">player{{ resultCount === 1 ? '' : 's' }} matched</span>
        <BaseButton v-if="activeCount" variant="ghost" size="sm" @click="emit('reset')">
          Clear {{ activeCount }} filter{{ activeCount === 1 ? '' : 's' }}
        </BaseButton>
      </div>
    </div>

    <div class="filters__tags">
      <span class="section-title">Specialities</span>
      <div class="filters__tagrow">
        <button
          v-for="tag in QUICK_TAGS"
          :key="tag"
          type="button"
          class="tagbtn"
          :class="{ 'tagbtn--on': filters.tags.includes(tag) }"
          @click="emit('toggle-tag', tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div v-if="filters.tags.length" class="filters__active">
      <BaseBadge v-for="tag in filters.tags" :key="tag" tone="neutral" size="sm">
        {{ tag }}
        <button class="chipx" type="button" @click="emit('toggle-tag', tag)">✕</button>
      </BaseBadge>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex; flex-direction: column; gap: 16px;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.filters__row { display: grid; grid-template-columns: 1.6fr repeat(4, 1fr); gap: 12px; }
.filters__row--tight { grid-template-columns: repeat(3, 160px) 1fr; }
.filters__icon { color: var(--text-dim); font-size: 14px; }

.filters__summary { display: flex; align-items: flex-end; gap: 8px; padding-bottom: 8px; }
.filters__count { font-size: 20px; font-weight: 700; color: var(--text); }
.filters__countlabel { font-size: 12px; color: var(--text-muted); margin-right: auto; }

.filters__tags { display: flex; flex-direction: column; gap: 8px; }
.filters__tagrow { display: flex; flex-wrap: wrap; gap: 6px; }
.tagbtn {
  padding: 6px 11px; border-radius: 99px; font-size: 11.5px; font-weight: 600;
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  transition: all 0.15s ease;
}
.tagbtn:hover { border-color: var(--border-strong); color: var(--text); }
.tagbtn--on { background: var(--surface-hover); border-color: var(--accent-line); color: var(--text); }

.filters__active { display: flex; flex-wrap: wrap; gap: 6px; }
.chipx { background: none; border: none; color: inherit; cursor: pointer; padding: 0 0 0 2px; font-size: 9px; }

@media (max-width: 1240px) {
  .filters__row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filters__row--tight { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filters__summary { grid-column: 1 / -1; padding-bottom: 0; }
}
@media (max-width: 600px) {
  .filters__row, .filters__row--tight { grid-template-columns: minmax(0, 1fr); }
}
</style>
