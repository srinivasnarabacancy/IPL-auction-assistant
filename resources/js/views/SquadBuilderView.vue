<script setup>
import { computed, ref, watch } from 'vue'
import { useSquadStore } from '@/stores/squad.js'
import { useAsync } from '@/composables/useAsync.js'
import { squadApi } from '@/api/resources.js'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import SquadList from '@/components/squad/SquadList.vue'
import SquadSummaryPanel from '@/components/squad/SquadSummaryPanel.vue'
import MoneyValue from '@/components/base/MoneyValue.vue'

const squad = useSquadStore()

const budgetDraft = ref(squad.budget)
watch(() => squad.budget, (value) => { budgetDraft.value = value })

const suggestions = useAsync((payload) => squadApi.suggestions(payload))

// Refresh the gap analysis whenever the squad or purse changes.
watch(
  [() => squad.entries.length, () => squad.budget, () => squad.localSpent],
  () => suggestions.run(squad.payload()),
  { immediate: true },
)

const entries = computed(() =>
  squad.entries
    .filter((entry) => entry.player)
    .map((entry) => ({ player: entry.player, price: entry.price })),
)

const applyBudget = () => squad.setBudget(budgetDraft.value)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Squad Builder</h1>
        <p class="subtitle">
          Pick players, set the price you expect to pay, and watch the purse and composition update live.
        </p>
      </div>
      <div class="row-wrap">
        <RouterLink to="/players"><BaseButton variant="primary">+ Add players</BaseButton></RouterLink>
        <BaseButton v-if="squad.size" variant="ghost" @click="squad.clear()">Clear squad</BaseButton>
      </div>
    </header>

    <div class="split">
      <div class="stack">
        <BaseCard title="Team budget" accent="gold">
          <form class="budget" @submit.prevent="applyBudget">
            <BaseInput
              v-model="budgetDraft"
              label="Total purse (₹ Cr)"
              type="number"
              step="0.5"
              min="1"
            />
            <BaseButton variant="secondary" @click="applyBudget">Update purse</BaseButton>
            <div class="budget__presets">
              <button
                v-for="preset in [90, 100, 120]"
                :key="preset"
                class="preset"
                type="button"
                @click="budgetDraft = preset; applyBudget()"
              >
                <MoneyValue :value="preset" />
              </button>
            </div>
          </form>
        </BaseCard>

        <BaseCard
          :title="`Selected squad (${squad.size})`"
          subtitle="Edit any price to model a different winning bid"
          :padded="squad.size === 0"
        >
          <template #actions>
            <BaseBadge v-if="squad.analysing" tone="neutral" size="sm">Updating…</BaseBadge>
          </template>
          <div :class="{ squadlist: squad.size > 0 }">
            <SquadList
              :entries="entries"
              @remove="squad.remove($event)"
              @update-price="squad.updatePrice"
            />
          </div>
        </BaseCard>

        <BaseCard
          v-if="suggestions.data.value?.suggestions?.length"
          title="Fill the gaps"
          subtitle="Highest-rated available players for what this squad is missing, within your purse"
        >
          <div class="gaps">
            <section v-for="group in suggestions.data.value.suggestions" :key="group.need" class="gap">
              <h4 class="gap__title">{{ group.need }}</h4>
              <ul class="gap__list">
                <li v-for="player in group.players" :key="player.id" class="gap__item">
                  <RouterLink :to="`/players/${player.id}`" class="gap__name truncate">{{ player.name }}</RouterLink>
                  <span class="gap__meta dim">{{ player.nationality }} · {{ player.rating }}</span>
                  <span class="gap__price num"><MoneyValue :value="player.basePrice" /></span>
                  <BaseButton size="sm" variant="ghost" @click="squad.add(player)">Add</BaseButton>
                </li>
              </ul>
            </section>
          </div>
        </BaseCard>
      </div>

      <SquadSummaryPanel :summary="squad.summary" />
    </div>
  </div>
</template>

<style scoped>
.budget { display: flex; flex-direction: column; gap: 12px; }
.budget__presets { display: flex; gap: 7px; }
.preset {
  flex: 1; padding: 8px; border-radius: 8px; cursor: pointer;
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 12px; font-weight: 600;
}
.preset:hover { border-color: var(--accent); color: var(--accent); }

.squadlist { padding: 4px 18px 10px; }

.gaps { display: flex; flex-direction: column; gap: 20px; }
.gap__title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 8px; }
.gap__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.gap__item {
  display: grid; grid-template-columns: minmax(0, 1fr) auto 78px 58px;
  align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;
}
.gap__item:last-child { border-bottom: none; }
.gap__name { font-weight: 600; }
.gap__name:hover { color: var(--accent); }
.gap__meta { font-size: 11px; }
.gap__price { font-weight: 700; color: var(--accent); text-align: right; }

@media (max-width: 560px) {
  .gap__item { grid-template-columns: minmax(0, 1fr) 70px 54px; }
  .gap__meta { display: none; }
}
</style>
