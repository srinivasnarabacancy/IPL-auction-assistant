<script setup>
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayersStore } from '@/stores/players.js'
import { useCompareStore } from '@/stores/compare.js'
import { usePlayerFilters } from '@/composables/usePlayerFilters.js'
import { useAsync } from '@/composables/useAsync.js'
import PlayerFilters from '@/components/player/PlayerFilters.vue'
import PlayerGrid from '@/components/player/PlayerGrid.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const players = usePlayersStore()
const compare = useCompareStore()
const { facets } = storeToRefs(players)

const { filters, page, queryParams, activeCount, reset, toggleTag } = usePlayerFilters()
const { data, loading, run } = useAsync((params) => players.list(params))

onMounted(() => players.loadFacets())
watch(queryParams, (params) => run(params), { immediate: true, deep: true })

const pagination = () => data.value?.pagination ?? { page: 1, totalPages: 1, total: 0 }
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Player Explorer</h1>
        <p class="subtitle">
          Filter the auction pool by role, origin, batting position, speciality and base price.
        </p>
      </div>
      <RouterLink v-if="compare.count" to="/compare">
        <BaseButton variant="secondary">Compare {{ compare.count }} selected →</BaseButton>
      </RouterLink>
    </header>

    <PlayerFilters
      :filters="filters"
      :facets="facets"
      :active-count="activeCount"
      :result-count="pagination().total"
      @reset="reset"
      @toggle-tag="toggleTag"
    />

    <PlayerGrid :players="data?.items || []" :loading="loading">
      <template #empty-action>
        <BaseButton variant="secondary" @click="reset">Clear all filters</BaseButton>
      </template>
    </PlayerGrid>

    <nav v-if="pagination().totalPages > 1" class="pager">
      <BaseButton variant="ghost" :disabled="page <= 1" @click="page -= 1">← Previous</BaseButton>
      <span class="pager__label num">Page {{ pagination().page }} of {{ pagination().totalPages }}</span>
      <BaseButton variant="ghost" :disabled="page >= pagination().totalPages" @click="page += 1">
        Next →
      </BaseButton>
    </nav>
  </div>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 8px; }
.pager__label { font-size: 13px; color: var(--text-muted); }
</style>
