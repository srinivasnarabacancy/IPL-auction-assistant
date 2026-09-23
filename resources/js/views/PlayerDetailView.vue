<script setup>
import { computed, watch } from 'vue'
import { usePlayersStore } from '@/stores/players.js'
import { useSquadStore } from '@/stores/squad.js'
import { useCompareStore } from '@/stores/compare.js'
import { useAsync } from '@/composables/useAsync.js'
import { squadApi } from '@/api/resources.js'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import PlayerStatBlock from '@/components/player/PlayerStatBlock.vue'
import PlayerGrid from '@/components/player/PlayerGrid.vue'
import MoneyValue from '@/components/base/MoneyValue.vue'

const props = defineProps({ id: { type: String, required: true } })

const playersStore = usePlayersStore()
const squad = useSquadStore()
const compare = useCompareStore()

const { data, loading, error, run } = useAsync((id) => playersStore.loadDetail(id))
const projection = useAsync((payload) => squadApi.project(payload))

const player = computed(() => data.value?.player ?? null)
const inSquad = computed(() => (player.value ? squad.has(player.value.id) : false))

watch(
  () => props.id,
  (id) => run(id),
  { immediate: true },
)

// Recompute affordability whenever the player or the purse changes.
watch(
  [player, () => squad.entries.length, () => squad.budget],
  () => {
    if (player.value) projection.run({ ...squad.payload(), playerId: player.value.id })
  },
  { immediate: true },
)
</script>

<template>
  <BaseSpinner v-if="loading" label="Loading player…" />
  <BaseEmptyState
    v-else-if="error || !player"
    icon="🤷"
    title="Player not found"
    :message="error?.message || 'This player is not in the auction pool.'"
  >
    <RouterLink to="/players"><BaseButton variant="secondary">Back to Player Explorer</BaseButton></RouterLink>
  </BaseEmptyState>

  <div v-else class="page">
    <header class="hero">
      <div class="hero__main">
        <div class="hero__badges">
          <BaseBadge tone="gold">{{ player.role }}</BaseBadge>
          <BaseBadge :tone="player.nationality === 'Overseas' ? 'warning' : 'neutral'">
            {{ player.nationality }}
          </BaseBadge>
          <BaseBadge v-if="!player.capped" tone="neutral">Uncapped</BaseBadge>
          <BaseBadge v-if="player.team2025" tone="brand">{{ player.team2025 }}</BaseBadge>
        </div>

        <h1 class="hero__name">{{ player.name }}</h1>
        <p class="hero__meta">
          {{ player.country }} · {{ player.age }} years
          <template v-if="player.battingStyle"> · {{ player.battingStyle }}</template>
          <template v-if="player.bowlingStyle"> · {{ player.bowlingStyle }}</template>
        </p>

        <div v-if="player.tags?.length" class="hero__tags">
          <BaseBadge v-for="tag in player.tags" :key="tag" tone="gold" size="sm">{{ tag }}</BaseBadge>
        </div>
      </div>

      <div class="hero__side">
        <div class="hero__rating">
          <span class="hero__ratinglabel">Rating</span>
          <strong class="num">{{ player.rating }}</strong>
        </div>
        <div class="hero__price">
          <span class="hero__pricelabel">Base price</span>
          <strong class="num"><MoneyValue :value="player.basePrice" /></strong>
        </div>
      </div>
    </header>

    <div class="split">
      <div class="stack">
        <BaseCard title="Career statistics" subtitle="Illustrative mock data shaped like IPL career numbers">
          <PlayerStatBlock :player="player" />
        </BaseCard>

        <BaseCard title="Profile">
          <dl class="profile">
            <div><dt>Role</dt><dd>{{ player.role }}</dd></div>
            <div><dt>Batting position</dt><dd>{{ player.battingOrder || '—' }}</dd></div>
            <div><dt>Batting style</dt><dd>{{ player.battingStyle || '—' }}</dd></div>
            <div><dt>Bowling style</dt><dd>{{ player.bowlingStyle || '—' }}</dd></div>
            <div><dt>Bowling type</dt><dd>{{ player.bowlingType || '—' }}</dd></div>
            <div><dt>Matches</dt><dd class="num">{{ player.stats.matches }}</dd></div>
          </dl>
        </BaseCard>
      </div>

      <div class="stack">
        <BaseCard title="Auction impact" accent="gold">
          <div v-if="projection.data.value" class="impact">
            <div class="impact__row">
              <span class="muted">Purse now</span>
              <strong class="num"><MoneyValue :value="projection.data.value.projection.remainingBefore" /></strong>
            </div>
            <div class="impact__row impact__row--key">
              <span class="muted">Purse after buying at base</span>
              <strong class="num" :class="{ bad: !projection.data.value.projection.affordable }">
                <MoneyValue :value="projection.data.value.projection.remainingAfter" />
              </strong>
            </div>
            <div class="impact__row">
              <span class="muted">Squad size after</span>
              <strong class="num">{{ projection.data.value.projection.squadSizeAfter }}</strong>
            </div>
            <div v-if="projection.data.value.projection.costPerRemainingSlot != null" class="impact__row">
              <span class="muted">Left per remaining slot</span>
              <strong class="num"><MoneyValue :value="projection.data.value.projection.costPerRemainingSlot" /></strong>
            </div>

            <ul v-if="projection.data.value.projection.blockers.length" class="impact__blockers">
              <li v-for="blocker in projection.data.value.projection.blockers" :key="blocker">{{ blocker }}</li>
            </ul>
            <p v-else class="impact__ok">Affordable within your current purse and squad limits.</p>
          </div>
          <BaseSpinner v-else label="Calculating…" />

          <div class="impact__actions">
            <BaseButton
              :variant="inSquad ? 'success' : 'primary'"
              block
              @click="squad.toggle(player)"
            >
              {{ inSquad ? '✓ In your squad — remove' : 'Add to squad at base price' }}
            </BaseButton>
            <BaseButton
              variant="ghost"
              block
              :disabled="compare.isFull && !compare.has(player.id)"
              @click="compare.toggle(player.id)"
            >
              {{ compare.has(player.id) ? 'Remove from comparison' : 'Add to comparison' }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>

    <BaseCard v-if="data.similar?.length" :title="`Similar ${player.role.toLowerCase()}s`" padded>
      <PlayerGrid :players="data.similar" />
    </BaseCard>
  </div>
</template>

<style scoped>
.hero {
  display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: flex-start;
  padding: 26px;
  background:
    linear-gradient(120deg, rgba(240, 165, 0, 0.1), transparent 55%),
    linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.hero__badges { display: flex; flex-wrap: wrap; gap: 6px; }
.hero__name { font-family: var(--font-display); font-size: 52px; letter-spacing: 1.5px; margin-top: 12px; line-height: 1; }
.hero__meta { font-size: 13.5px; color: var(--text-muted); margin-top: 8px; }
.hero__tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 14px; }

.hero__side { display: flex; gap: 12px; }
.hero__rating, .hero__price {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px 20px; border-radius: var(--radius);
  background: var(--bg-elevated); border: 1px solid var(--border); min-width: 118px;
}
.hero__ratinglabel, .hero__pricelabel {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600;
}
.hero__rating strong { font-size: 30px; font-weight: 800; color: var(--brand); }
.hero__price strong { font-size: 24px; font-weight: 800; color: var(--accent); }

.profile { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin: 0; }
.profile dt { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
.profile dd { margin: 4px 0 0; font-size: 13.5px; font-weight: 600; }

.impact { display: flex; flex-direction: column; gap: 10px; }
.impact__row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13px; }
.impact__row strong { font-size: 15px; font-weight: 700; }
.impact__row--key strong { font-size: 20px; color: var(--accent); }
.impact__row strong.bad { color: var(--danger); }
.impact__blockers { margin: 4px 0 0; padding-left: 18px; font-size: 12.5px; color: var(--danger); }
.impact__ok { font-size: 12.5px; color: var(--success); }
.impact__actions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }

@media (max-width: 680px) {
  .hero__name { font-size: 38px; }
  .hero__side { width: 100%; }
  .hero__rating, .hero__price { flex: 1; min-width: 0; }
}
</style>
