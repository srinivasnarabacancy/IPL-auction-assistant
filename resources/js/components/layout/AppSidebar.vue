<script setup>
import { computed } from 'vue'
import { useSquadStore } from '@/stores/squad.js'
import MoneyValue from '../base/MoneyValue.vue'

defineProps({ open: Boolean })
defineEmits(['navigate'])

const squad = useSquadStore()

const links = [
  { to: '/', label: 'Dashboard', icon: '◆', exact: true },
  { to: '/players', label: 'Player Explorer', icon: '⌕' },
  { to: '/compare', label: 'Compare Players', icon: '⇄' },
  { to: '/squad', label: 'Squad Builder', icon: '▦' },
  { to: '/auction', label: 'Auction Room', icon: '⚡' },
  { to: '/assistant', label: 'AI Assistant', icon: '✦' },
]

const remaining = computed(() => squad.summary?.remainingBudget ?? squad.localRemaining)
const spentPct = computed(() => squad.summary?.spendPercentage ?? 0)
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--open': open }">
    <RouterLink to="/" class="brand" @click="$emit('navigate')">
      <span class="brand__mark">IPL</span>
      <span class="brand__text">
        <strong>Auction</strong>
        <small>Assistant</small>
      </span>
    </RouterLink>

    <nav class="nav">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav__link"
        :class="{ 'nav__link--active': $route.path === link.to || (!link.exact && $route.path.startsWith(link.to)) }"
        @click="$emit('navigate')"
      >
        <span class="nav__icon">{{ link.icon }}</span>
        <span>{{ link.label }}</span>
      </RouterLink>
    </nav>

    <div class="purse">
      <span class="purse__label">Squad purse</span>
      <strong class="purse__value num"><MoneyValue :value="remaining" /></strong>
      <div class="purse__bar">
        <div class="purse__fill" :style="{ width: `${Math.min(100, spentPct)}%` }" />
      </div>
      <span class="purse__meta">{{ squad.size }} players · <MoneyValue :value="squad.budget" /> total</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: rgba(10, 14, 31, 0.86);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--border);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand { display: flex; align-items: center; gap: 11px; padding: 0 8px; }
.brand__mark {
  font-family: var(--font-display);
  font-size: 19px; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent), var(--magenta));
  color: #10060a;
  padding: 7px 10px 5px;
  border-radius: 9px;
}
.brand__text { display: flex; flex-direction: column; line-height: 1.1; }
.brand__text strong { font-size: 14px; }
.brand__text small { font-size: 11px; color: var(--text-dim); letter-spacing: 0.06em; }

.nav { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.nav__link {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 500;
  color: var(--text-muted);
  transition: background 0.15s ease, color 0.15s ease;
}
.nav__link:hover { background: var(--surface); color: var(--text); }
.nav__link--active {
  background: linear-gradient(90deg, var(--accent-soft), transparent);
  color: var(--accent);
  font-weight: 600;
  box-shadow: inset 2px 0 0 var(--accent);
}
.nav__icon { width: 16px; text-align: center; font-size: 13px; }

.purse {
  display: flex; flex-direction: column; gap: 7px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.purse__label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600; }
.purse__value { font-size: 20px; color: var(--accent); }
.purse__bar { height: 5px; background: var(--bg); border-radius: 99px; overflow: hidden; }
.purse__fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--magenta)); transition: width 0.3s ease; }
.purse__meta { font-size: 11px; color: var(--text-dim); }

@media (max-width: 980px) {
  .sidebar {
    position: fixed; top: 0; left: 0; z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
  }
  .sidebar--open { transform: translateX(0); }
}
</style>
