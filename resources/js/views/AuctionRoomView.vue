<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuctionStore } from '@/stores/auction.js'
import { usePlayersStore } from '@/stores/players.js'
import { useSquadStore } from '@/stores/squad.js'
import { useAsync } from '@/composables/useAsync.js'
import { usePlayerFilters } from '@/composables/usePlayerFilters.js'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import AuctionLot from '@/components/auction/AuctionLot.vue'
import AuctionHistory from '@/components/auction/AuctionHistory.vue'
import SquadList from '@/components/squad/SquadList.vue'
import BudgetMeter from '@/components/squad/BudgetMeter.vue'
import RoleDistribution from '@/components/squad/RoleDistribution.vue'
import MoneyValue from '@/components/base/MoneyValue.vue'

const auction = useAuctionStore()
const players = usePlayersStore()
const squad = useSquadStore()

const { filters, queryParams } = usePlayerFilters({ sortBy: 'rating' })
const pool = useAsync((params) => players.list(params))

const budgetDraft = ref(120)
const teamDraft = ref('My Team')

onMounted(async () => {
  players.loadFacets()
  await auction.init(budgetDraft.value, teamDraft.value)
  budgetDraft.value = auction.session?.budget ?? 120
  teamDraft.value = auction.session?.teamName ?? 'My Team'
})

watch(queryParams, (params) => pool.run({ ...params, pageSize: 12 }), { immediate: true, deep: true })

const ownedIds = computed(() => auction.squad.map((entry) => entry.player.id))
const available = computed(() =>
  (pool.data.value?.items ?? []).filter((player) => !ownedIds.value.includes(player.id)),
)
const remaining = computed(() => auction.summary?.remainingBudget ?? 0)

async function restart() {
  await auction.reset({ budget: Number(budgetDraft.value) || 120, teamName: teamDraft.value })
}

/** Copies the auction result into the Squad Builder for further planning. */
function exportToSquad() {
  squad.replaceFrom(auction.squad, auction.session.budget)
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Auction Room</h1>
        <p class="subtitle">
          Nominate a player, bid against rival franchises and watch your purse update in real time.
        </p>
      </div>
      <div class="row-wrap">
        <BaseBadge v-if="auction.session" tone="brand">{{ auction.session.teamName }}</BaseBadge>
        <BaseButton v-if="auction.squad.length" variant="secondary" @click="exportToSquad">
          Send squad to builder →
        </BaseButton>
      </div>
    </header>

    <p class="note">
      The auction room runs its own purse so you can rehearse a bidding strategy without touching
      the squad you have planned. Use <strong>Send squad to builder</strong> to copy the result across.
    </p>

    <p v-if="auction.error" class="alert">{{ auction.error.message }}</p>

    <div class="room">
      <div class="stack">
        <AuctionLot
          :lot="auction.lot"
          :next-increment="auction.session?.nextIncrement"
          :remaining="remaining"
        />

        <BaseCard v-if="auction.isLive" title="Bidding" accent="magenta">
          <div class="bidbar">
            <BaseButton variant="primary" size="lg" :loading="auction.loading" @click="auction.bid('you')">
              Bid for your team
            </BaseButton>
            <BaseButton variant="secondary" :loading="auction.loading" @click="auction.bid('rival')">
              Rival bids
            </BaseButton>
            <BaseButton
              variant="success"
              :loading="auction.loading"
              :disabled="!auction.lot.leader"
              @click="auction.sold()"
            >
              Hammer down
            </BaseButton>
            <BaseButton variant="ghost" :loading="auction.loading" @click="auction.unsold()">
              Mark unsold
            </BaseButton>
          </div>
          <p class="bidhint dim">
            Bids follow the published increment ladder: ₹0.05 Cr below ₹1 Cr, ₹0.10 Cr to ₹2 Cr,
            ₹0.20 Cr to ₹5 Cr, then ₹0.25 Cr.
          </p>
        </BaseCard>

        <BaseCard title="Nominate a player" subtitle="Search the remaining pool and put someone on the block">
          <div class="poolfilters">
            <BaseInput
              :model-value="filters.search"
              label="Search"
              placeholder="Player name…"
              @update:model-value="filters.search = $event"
            />
            <BaseSelect
              :model-value="filters.role"
              label="Role"
              placeholder="All roles"
              :options="players.facets?.roles || []"
              @update:model-value="filters.role = $event"
            />
            <BaseSelect
              :model-value="filters.nationality"
              label="Origin"
              placeholder="All"
              :options="players.facets?.nationalities || []"
              @update:model-value="filters.nationality = $event"
            />
          </div>

          <ul class="pool">
            <li v-for="player in available" :key="player.id" class="pool__row">
              <RouterLink :to="`/players/${player.id}`" class="pool__name truncate">{{ player.name }}</RouterLink>
              <span class="pool__meta truncate dim">{{ player.role }} · {{ player.nationality }}</span>
              <span class="pool__rating num">{{ player.rating }}</span>
              <span class="pool__price num"><MoneyValue :value="player.basePrice" /></span>
              <BaseButton
                size="sm"
                :variant="auction.lot?.playerId === player.id ? 'success' : 'secondary'"
                :disabled="auction.loading"
                @click="auction.nominate(player.id)"
              >
                {{ auction.lot?.playerId === player.id ? 'On block' : 'Nominate' }}
              </BaseButton>
            </li>
            <li v-if="!available.length && !pool.loading.value" class="pool__empty muted">
              No players match. Adjust the search above.
            </li>
          </ul>
        </BaseCard>
      </div>

      <div class="stack">
        <BaseCard title="Your purse" accent="gold">
          <BudgetMeter
            v-if="auction.summary"
            :budget="auction.summary.budget"
            :spent="auction.summary.totalSpent"
            :remaining="auction.summary.remainingBudget"
          />
          <div v-if="auction.summary" class="purse__counts">
            <div><span class="dim">Squad</span><strong class="num">{{ auction.summary.squadSize }}</strong></div>
            <div><span class="dim">Indian</span><strong class="num">{{ auction.summary.indianCount }}</strong></div>
            <div>
              <span class="dim">Overseas</span>
              <strong class="num">{{ auction.summary.overseasCount }}/{{ auction.summary.limits.maxOverseas }}</strong>
            </div>
          </div>
          <hr class="rule" />
          <RoleDistribution
            v-if="auction.summary"
            :distribution="auction.summary.roleDistribution"
            :total="auction.summary.squadSize"
          />
        </BaseCard>

        <BaseCard :title="`Bought (${auction.squad.length})`" :padded="false">
          <div class="boughtwrap">
            <SquadList :entries="auction.squad" :editable="false" />
          </div>
        </BaseCard>

        <BaseCard title="Lot history" :padded="false">
          <div class="boughtwrap">
            <AuctionHistory :history="auction.history" />
          </div>
        </BaseCard>

        <BaseCard title="Restart auction">
          <div class="restart">
            <BaseInput v-model="teamDraft" label="Team name" placeholder="My Team" />
            <BaseInput v-model="budgetDraft" label="Purse (₹ Cr)" type="number" step="0.5" min="1" />
            <BaseButton variant="danger" block @click="restart">Reset and start over</BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start; }

.note {
  padding: 11px 14px; border-radius: var(--radius-sm); font-size: 12.5px; line-height: 1.55;
  background: var(--brand-soft); border: 1px solid rgba(61, 90, 254, 0.28); color: var(--text-muted);
}
.note strong { color: var(--text); }

.alert {
  padding: 11px 14px; border-radius: var(--radius-sm); font-size: 13px;
  background: var(--danger-soft); border: 1px solid rgba(255, 92, 114, 0.3); color: var(--danger);
}

.bidbar { display: flex; flex-wrap: wrap; gap: 9px; }
.bidhint { font-size: 11.5px; margin-top: 12px; line-height: 1.5; }

.poolfilters { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }

.pool { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.pool__row {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr) 38px 74px 92px;
  align-items: center; gap: 10px;
  padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13px;
}
.pool__row:last-child { border-bottom: none; }
.pool__name { font-weight: 600; }
.pool__name:hover { color: var(--accent); }
.pool__meta { font-size: 11.5px; }
.pool__rating { font-weight: 700; color: var(--brand); text-align: center; }
.pool__price { font-weight: 700; color: var(--accent); text-align: right; }
.pool__empty { padding: 20px 0; font-size: 13px; }

.purse__counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
.purse__counts div { display: flex; flex-direction: column; gap: 2px; }
.purse__counts span { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
.purse__counts strong { font-size: 17px; font-weight: 700; }
.rule { border: none; border-top: 1px solid var(--border); margin: 16px 0; }

.boughtwrap { padding: 4px 18px 12px; max-height: 340px; overflow-y: auto; }

.restart { display: flex; flex-direction: column; gap: 12px; }

@media (max-width: 1200px) {
  .room { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 680px) {
  .poolfilters { grid-template-columns: minmax(0, 1fr); }
  .pool__row { grid-template-columns: minmax(0, 1fr) 62px 86px; }
  .pool__meta, .pool__rating { display: none; }
}
</style>
