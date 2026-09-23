<script setup>
import { computed } from 'vue'
import { useSquadStore } from '@/stores/squad.js'
import MoneyValue from '../base/MoneyValue.vue'
import BrandMark from '../base/BrandMark.vue'
import NavIcon from '../base/NavIcon.vue'

defineProps({ open: Boolean })
defineEmits(['navigate'])

const squad = useSquadStore()

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', exact: true },
  { to: '/players', label: 'Player Explorer', icon: 'explore' },
  { to: '/compare', label: 'Compare Players', icon: 'compare' },
  { to: '/squad', label: 'Squad Builder', icon: 'squad' },
  { to: '/auction', label: 'Auction Room', icon: 'auction' },
  { to: '/assistant', label: 'AI Assistant', icon: 'assistant' },
]

const remaining = computed(() => squad.summary?.remainingBudget ?? squad.localRemaining)
const spentPct = computed(() => squad.summary?.spendPercentage ?? 0)
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--open': open }">
    <RouterLink to="/" class="brand" @click="$emit('navigate')">
      <BrandMark :size="32" />
      <span class="brand__text">
        <strong>IPL Auction</strong>
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
        <NavIcon :name="link.icon" class="nav__icon" />
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
  background: var(--chrome);
  border-right: 1px solid var(--border-strong);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand { display: flex; align-items: center; gap: 10px; padding: 0 8px; }
.brand__text { display: flex; flex-direction: column; gap: 2px; line-height: 1.15; }
.brand__text strong { font-size: 14.5px; font-weight: 600; letter-spacing: -0.005em; }
.brand__text small {
  font-size: 9.5px;
  color: var(--text-dim);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
}

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
  background: var(--surface-hover);
  color: var(--text);
  font-weight: 600;
  box-shadow: inset 2px 0 0 var(--accent-line);
}
.nav__icon { opacity: 0.9; }

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
.purse__fill { height: 100%; background: var(--accent); opacity: 0.8; transition: width 0.3s ease; }
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
