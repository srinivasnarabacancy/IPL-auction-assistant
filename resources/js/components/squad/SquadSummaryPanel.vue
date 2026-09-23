<script setup>
import { computed } from 'vue'
import BaseCard from '../base/BaseCard.vue'
import BaseBadge from '../base/BaseBadge.vue'
import BudgetMeter from './BudgetMeter.vue'
import RoleDistribution from './RoleDistribution.vue'
import MoneyValue from '../base/MoneyValue.vue'

const props = defineProps({
  summary: { type: Object, default: null },
  showViolations: { type: Boolean, default: true },
})


const toneFor = { error: 'danger', warning: 'warning', info: 'brand' }

const overseasTone = computed(() => {
  if (!props.summary) return 'neutral'
  if (props.summary.overseasCount > props.summary.limits.maxOverseas) return 'danger'
  if (props.summary.overseasCount === props.summary.limits.maxOverseas) return 'warning'
  return 'neutral'
})
</script>

<template>
  <div v-if="summary" class="summary">
    <BaseCard title="Budget tracker" accent="gold">
      <BudgetMeter
        :budget="summary.budget"
        :spent="summary.totalSpent"
        :remaining="summary.remainingBudget"
      />
      <div v-if="summary.costPerRemainingSlot != null" class="summary__slotcost">
        <span class="muted">Average left per remaining slot</span>
        <strong class="num"><MoneyValue :value="summary.costPerRemainingSlot" /></strong>
        <span class="dim">across {{ summary.slotsToMinimum }} slot{{ summary.slotsToMinimum === 1 ? '' : 's' }}</span>
      </div>
    </BaseCard>

    <BaseCard title="Squad composition" accent="brand">
      <div class="summary__counts">
        <div class="summary__count">
          <span class="summary__countlabel">Squad</span>
          <strong class="num">{{ summary.squadSize }}</strong>
          <span class="dim">/ {{ summary.limits.maxSquadSize }}</span>
        </div>
        <div class="summary__count">
          <span class="summary__countlabel">Indian</span>
          <strong class="num">{{ summary.indianCount }}</strong>
        </div>
        <div class="summary__count">
          <span class="summary__countlabel">Overseas</span>
          <strong class="num">{{ summary.overseasCount }}</strong>
          <span class="dim">/ {{ summary.limits.maxOverseas }}</span>
        </div>
        <div class="summary__count">
          <span class="summary__countlabel">Avg rating</span>
          <strong class="num">{{ summary.averageRating || '—' }}</strong>
        </div>
      </div>

      <div class="summary__badges">
        <BaseBadge :tone="overseasTone">
          {{ summary.overseasRemaining }} overseas slot{{ summary.overseasRemaining === 1 ? '' : 's' }} left
        </BaseBadge>
        <BaseBadge :tone="summary.slotsToMinimum ? 'warning' : 'success'">
          {{ summary.slotsToMinimum ? `${summary.slotsToMinimum} to minimum squad` : 'Minimum squad met' }}
        </BaseBadge>
      </div>

      <hr class="summary__rule" />
      <RoleDistribution :distribution="summary.roleDistribution" :total="summary.squadSize" />
    </BaseCard>

    <BaseCard v-if="showViolations" title="Squad checks" accent="magenta">
      <ul v-if="summary.violations.length" class="issues">
        <li v-for="issue in summary.violations" :key="issue.code" class="issues__item">
          <BaseBadge :tone="toneFor[issue.severity]" size="sm">{{ issue.severity }}</BaseBadge>
          <span>{{ issue.message }}</span>
        </li>
      </ul>
      <p v-else class="muted">No issues. This squad satisfies every rule the assistant checks.</p>
    </BaseCard>
  </div>
</template>

<style scoped>
.summary { display: flex; flex-direction: column; gap: 16px; }

.summary__slotcost {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); font-size: 12.5px;
}
.summary__slotcost strong { font-size: 15px; color: var(--accent); }

.summary__counts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.summary__count { display: flex; flex-direction: column; gap: 2px; }
.summary__countlabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }
.summary__count strong { font-size: 19px; font-weight: 700; }
.summary__count .dim { font-size: 11px; }

.summary__badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.summary__rule { border: none; border-top: 1px solid var(--border); margin: 16px 0; }

.issues { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.issues__item { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; line-height: 1.5; color: var(--text-muted); }
</style>
