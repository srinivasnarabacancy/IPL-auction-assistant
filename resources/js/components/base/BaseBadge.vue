<script setup>
defineProps({
  tone: { type: String, default: 'neutral' }, // neutral | accent | success | warning | danger
  size: { type: String, default: 'md' },
})
</script>

<template>
  <span class="badge" :class="[`badge--${tone}`, `badge--${size}`]"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 99px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge--sm { padding: 3px 8px; font-size: 10px; }
.badge--md { padding: 5px 10px; font-size: 11px; }

.badge--neutral { background: var(--surface-hover); color: var(--text-muted); border-color: var(--border); }
.badge--accent { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-line); }
.badge--success { background: var(--success-soft); color: var(--success); border-color: rgba(47, 209, 140, 0.3); }
.badge--warning { background: var(--warning-soft); color: var(--warning); border-color: rgba(255, 181, 71, 0.3); }
.badge--danger { background: var(--danger-soft); color: var(--danger); border-color: rgba(255, 92, 114, 0.3); }
</style>
