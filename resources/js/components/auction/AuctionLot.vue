<script setup>
import { computed } from 'vue'
import BaseBadge from '../base/BaseBadge.vue'
import MoneyValue from '../base/MoneyValue.vue'

const props = defineProps({
  lot: { type: Object, default: null },
  nextIncrement: { type: Number, default: null },
  remaining: { type: Number, default: 0 },
})


const player = computed(() => props.lot?.player ?? null)
const youLead = computed(() => props.lot?.leader === 'you')
const nextBid = computed(() => {
  if (!props.lot) return null
  return props.lot.bidCount === 0
    ? props.lot.currentBid
    : Math.round((props.lot.currentBid + (props.nextIncrement ?? 0)) * 100) / 100
})
const canAfford = computed(() => nextBid.value !== null && nextBid.value <= props.remaining)
</script>

<template>
  <div class="lot" :class="{ 'lot--live': lot, 'lot--leading': youLead }">
    <template v-if="player">
      <div class="lot__head">
        <BaseBadge tone="accent" size="sm">On the block</BaseBadge>
        <BaseBadge :tone="player.nationality === 'Overseas' ? 'warning' : 'neutral'" size="sm">
          {{ player.nationality }}
        </BaseBadge>
        <BaseBadge tone="neutral" size="sm">{{ player.role }}</BaseBadge>
      </div>

      <RouterLink :to="`/players/${player.id}`" class="lot__name">{{ player.name }}</RouterLink>
      <p class="lot__meta">
        {{ player.country }} · {{ player.age }}y · rating {{ player.rating }} · base <MoneyValue :value="player.basePrice" />
      </p>

      <div class="lot__bid">
        <span class="lot__bidlabel">Current bid</span>
        <strong class="lot__bidvalue num"><MoneyValue :value="lot.currentBid" /></strong>
        <span class="lot__leader" :class="{ 'lot__leader--you': youLead }">
          <template v-if="lot.leader">{{ youLead ? 'You are leading' : `Leading: ${lot.leader}` }}</template>
          <template v-else>No bids yet — opens at base price</template>
        </span>
      </div>

      <div class="lot__next">
        <span class="muted">Your next bid</span>
        <strong class="num" :class="{ 'lot__unaffordable': !canAfford }"><MoneyValue :value="nextBid" /></strong>
        <span v-if="!canAfford" class="lot__warn">exceeds your purse</span>
      </div>

      <div v-if="player.tags?.length" class="lot__tags">
        <BaseBadge v-for="tag in player.tags" :key="tag" tone="neutral" size="sm">{{ tag }}</BaseBadge>
      </div>
    </template>

    <div v-else class="lot__idle">
      <span class="lot__idleicon">⚡</span>
      <strong>No player on the block</strong>
      <p class="muted">Nominate a player to open the bidding.</p>
    </div>
  </div>
</template>

<style scoped>
.lot {
  display: flex; flex-direction: column; gap: 10px;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.lot--live { border-color: var(--border-strong); box-shadow: var(--shadow); }
.lot--leading { border-color: rgba(86, 163, 137, 0.4); box-shadow: var(--shadow); }

.lot__head { display: flex; flex-wrap: wrap; gap: 6px; }
.lot__name { font-family: var(--font-display); font-size: 40px; letter-spacing: 1px; line-height: 1.05; }
.lot__name:hover { color: var(--accent); }
.lot__meta { font-size: 13px; color: var(--text-muted); }

.lot__bid {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px;
  margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border);
}
.lot__bidlabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600; width: 100%; }
.lot__bidvalue { font-size: 38px; font-weight: 700; color: var(--accent); letter-spacing: -0.02em; }
.lot__leader { font-size: 12.5px; color: var(--text-muted); }
.lot__leader--you { color: var(--success); font-weight: 700; }

.lot__next { display: flex; align-items: baseline; gap: 8px; font-size: 13px; }
.lot__next strong { font-size: 16px; }
.lot__unaffordable { color: var(--danger); }
.lot__warn { font-size: 11.5px; color: var(--danger); }

.lot__tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }

.lot__idle { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 10px; text-align: center; }
.lot__idleicon { font-size: 30px; opacity: 0.7; }
.lot__idle p { font-size: 13px; }

@media (max-width: 560px) {
  .lot__name { font-size: 30px; }
  .lot__bidvalue { font-size: 30px; }
}
</style>
