<script setup>
import { computed, onMounted } from 'vue'
import { useSquadStore } from '@/stores/squad.js'
import { usePlayersStore } from '@/stores/players.js'
import { useCompareStore } from '@/stores/compare.js'
import { useAsync } from '@/composables/useAsync.js'
import { useCurrency } from '@/composables/useCurrency.js'
import StatTile from '@/components/base/StatTile.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'
import CarouselRow from '@/components/base/CarouselRow.vue'
import NavIcon from '@/components/base/NavIcon.vue'
import BaseSpinner from '@/components/base/BaseSpinner.vue'
import BudgetMeter from '@/components/squad/BudgetMeter.vue'
import RoleDistribution from '@/components/squad/RoleDistribution.vue'
import SquadList from '@/components/squad/SquadList.vue'

const squad = useSquadStore()
const players = usePlayersStore()
const compare = useCompareStore()
const { crore } = useCurrency()

const marquee = useAsync((params) => players.list(params))
const bargains = useAsync((params) => players.list(params))

onMounted(() => {
  marquee.run({ sortBy: 'rating', pageSize: 12 })
  // Best rating available near the bottom of the price ladder.
  bargains.run({ sortBy: 'rating', maxPrice: 1, pageSize: 12 })
})

const summary = computed(() => squad.summary)
const remaining = computed(() => summary.value?.remainingBudget ?? squad.localRemaining)

const entries = computed(() =>
  squad.entries.filter((e) => e.player).map((e) => ({ player: e.player, price: e.price })).slice(0, 6),
)

const errorCount = computed(() => summary.value?.violations.filter((v) => v.severity === 'error').length ?? 0)
const warningCount = computed(() => summary.value?.violations.filter((v) => v.severity !== 'error').length ?? 0)

const quickLinks = [
  { to: '/players', title: 'Player Explorer', text: 'Filter the pool by role, origin, position and price.', icon: 'explore' },
  { to: '/compare', title: 'Compare Players', text: 'Put up to four players side by side.', icon: 'compare' },
  { to: '/squad', title: 'Squad Builder', text: 'Model your XI and track the purse.', icon: 'squad' },
  { to: '/auction', title: 'Auction Room', text: 'Simulate live bidding against rivals.', icon: 'auction' },
  { to: '/assistant', title: 'AI Assistant', text: 'Ask questions grounded in your squad.', icon: 'assistant' },
]
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <BaseBadge tone="neutral" size="sm">Auction planning</BaseBadge>
        <h1 class="hero__title">Build a squad that wins the auction</h1>
        <p class="hero__text">
          Explore the pool, compare options, simulate the bidding and let the assistant check every
          decision against your purse and the squad rules.
        </p>
        <div class="hero__actions">
          <RouterLink to="/players"><BaseButton variant="primary" size="lg">Explore players</BaseButton></RouterLink>
          <RouterLink to="/assistant"><BaseButton variant="secondary" size="lg">Ask the assistant</BaseButton></RouterLink>
        </div>
      </div>
    </header>

    <section class="grid grid-4">
      <StatTile
        label="Remaining purse"
        :value="remaining"
        money
        :tone="remaining < 0 ? 'danger' : 'gold'"
        :hint="`of ${crore(squad.budget)} total`"
      />
      <StatTile
        label="Squad size"
        :value="summary?.squadSize ?? squad.size"
        tone="brand"
        :hint="summary ? `${summary.slotsToMinimum} to minimum of ${summary.limits.minSquadSize}` : 'No players yet'"
      />
      <StatTile
        label="Overseas used"
        :value="summary ? `${summary.overseasCount} / ${summary.limits.maxOverseas}` : '0 / 8'"
        :tone="summary && summary.overseasCount >= summary.limits.maxOverseas ? 'warning' : 'gold'"
        hint="Only 4 may play in the XI"
      />
      <StatTile
        label="Squad checks"
        :value="errorCount ? `${errorCount} blocking` : warningCount ? `${warningCount} to review` : 'All clear'"
        :tone="errorCount ? 'danger' : warningCount ? 'warning' : 'success'"
        :hint="summary ? `${summary.violations.length} total notes` : 'Add players to start'"
      />
    </section>

    <div class="split">
      <div class="stack">
        <BaseCard title="Marquee players" subtitle="Highest rated in the pool" :padded="false">
          <template #actions>
            <RouterLink to="/players"><BaseButton variant="ghost" size="sm">View all →</BaseButton></RouterLink>
          </template>
          <div class="cardpad">
            <BaseSpinner v-if="marquee.loading.value" label="Loading players…" />
            <CarouselRow v-else label="Marquee players">
              <PlayerCard
                v-for="player in marquee.data.value?.items || []"
                :key="player.id"
                :player="player"
                :in-squad="squad.has(player.id)"
                :in-compare="compare.has(player.id)"
                :compare-disabled="compare.isFull"
                @toggle-squad="squad.toggle($event)"
                @toggle-compare="compare.toggle($event.id)"
              />
            </CarouselRow>
          </div>
        </BaseCard>

        <BaseCard title="Value picks" subtitle="Best ratings at ₹1 Cr base or below" :padded="false">
          <div class="cardpad">
            <BaseSpinner v-if="bargains.loading.value" label="Loading players…" />
            <CarouselRow v-else label="Value picks">
              <PlayerCard
                v-for="player in bargains.data.value?.items || []"
                :key="player.id"
                :player="player"
                :in-squad="squad.has(player.id)"
                :in-compare="compare.has(player.id)"
                :compare-disabled="compare.isFull"
                @toggle-squad="squad.toggle($event)"
                @toggle-compare="compare.toggle($event.id)"
              />
            </CarouselRow>
          </div>
        </BaseCard>

        <BaseCard title="Jump to" :padded="false">
          <div class="links">
            <RouterLink v-for="link in quickLinks" :key="link.to" :to="link.to" class="link">
              <span class="link__icon"><NavIcon :name="link.icon" :size="17" /></span>
              <span class="link__body">
                <strong>{{ link.title }}</strong>
                <small>{{ link.text }}</small>
              </span>
              <span class="link__arrow">→</span>
            </RouterLink>
          </div>
        </BaseCard>
      </div>

      <div class="stack">
        <BaseCard title="Budget tracker">
          <BudgetMeter
            :budget="summary?.budget ?? squad.budget"
            :spent="summary?.totalSpent ?? squad.localSpent"
            :remaining="remaining"
          />
        </BaseCard>

        <BaseCard title="Role distribution">
          <RoleDistribution
            :distribution="summary?.roleDistribution ?? { Batter: 0, Bowler: 0, 'All-rounder': 0, Wicketkeeper: 0 }"
            :total="summary?.squadSize ?? 0"
          />
        </BaseCard>

        <BaseCard :title="`Your squad (${squad.size})`" :padded="false">
          <template #actions>
            <RouterLink to="/squad"><BaseButton variant="ghost" size="sm">Manage →</BaseButton></RouterLink>
          </template>
          <div class="cardpad cardpad--tight">
            <SquadList :entries="entries" :editable="false">
              <template #empty-action>
                <RouterLink to="/players"><BaseButton variant="primary" size="sm">Add players</BaseButton></RouterLink>
              </template>
            </SquadList>
            <p v-if="squad.size > entries.length" class="more dim">
              +{{ squad.size - entries.length }} more in the Squad Builder
            </p>
          </div>
        </BaseCard>

        <BaseCard v-if="compare.count" title="Comparison shortlist">
          <p class="muted">{{ compare.count }} player{{ compare.count === 1 ? '' : 's' }} selected.</p>
          <RouterLink to="/compare" class="block">
            <BaseButton variant="secondary" block>Open comparison</BaseButton>
          </RouterLink>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  padding: 36px 32px;
  background:
    linear-gradient(135deg, rgba(221, 169, 79, 0.06), transparent 55%),
    var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.hero__title { font-family: var(--font-display); font-size: 54px; letter-spacing: 1.5px; margin-top: 14px; line-height: 1; }
.hero__text { font-size: 14.5px; color: var(--text-muted); max-width: 620px; margin-top: 12px; line-height: 1.6; }
.hero__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }

.cardpad { padding: 18px; }
.cardpad--tight { padding: 4px 18px 14px; }
.more { font-size: 12px; margin-top: 10px; }
.block { display: block; margin-top: 12px; }

.links { display: flex; flex-direction: column; }
.link {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;
}
.link:last-child { border-bottom: none; }
.link:hover { background: var(--surface-hover); }
.link__icon {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px;
  display: grid; place-items: center; font-size: 14px;
  background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border);
}
.link__body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.link__body strong { font-size: 13.5px; }
.link__body small { font-size: 11.5px; color: var(--text-dim); }
.link__arrow { color: var(--text-dim); font-size: 13px; }
.link:hover .link__arrow { color: var(--accent); }

@media (max-width: 680px) {
  .hero { padding: 26px 20px; }
  .hero__title { font-size: 36px; }
}
</style>
