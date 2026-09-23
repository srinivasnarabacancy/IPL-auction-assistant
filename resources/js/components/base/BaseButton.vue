<script setup>
defineProps({
  variant: { type: String, default: 'secondary' }, // primary | secondary | ghost | danger | success
  size: { type: String, default: 'md' }, // sm | md | lg
  block: Boolean,
  disabled: Boolean,
  loading: Boolean,
})
</script>

<template>
  <button
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--loading': loading }]"
    :disabled="disabled || loading"
    type="button"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease, opacity 0.15s ease;
  white-space: nowrap;
}
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn--sm { padding: 6px 11px; font-size: 12px; }
.btn--md { padding: 9px 15px; font-size: 13px; }
.btn--lg { padding: 13px 22px; font-size: 15px; }
.btn--block { width: 100%; }

.btn--primary { background: var(--accent); color: #1a1200; }
.btn--primary:hover:not(:disabled) { background: #ffb81f; }

.btn--secondary { background: var(--surface-hover); color: var(--text); border-color: var(--border-strong); }
.btn--secondary:hover:not(:disabled) { background: var(--border-strong); }

.btn--ghost { background: transparent; color: var(--text-muted); border-color: var(--border); }
.btn--ghost:hover:not(:disabled) { color: var(--text); border-color: var(--border-strong); background: var(--surface); }

.btn--danger { background: var(--danger-soft); color: var(--danger); border-color: rgba(255, 92, 114, 0.35); }
.btn--danger:hover:not(:disabled) { background: rgba(255, 92, 114, 0.25); }

.btn--success { background: var(--success-soft); color: var(--success); border-color: rgba(47, 209, 140, 0.35); }
.btn--success:hover:not(:disabled) { background: rgba(47, 209, 140, 0.25); }

.btn__spinner {
  width: 13px; height: 13px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
