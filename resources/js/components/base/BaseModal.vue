<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  wide: Boolean,
})
const emit = defineEmits(['close'])

const onKey = (event) => { if (event.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal" :class="{ 'modal--wide': wide }" role="dialog" aria-modal="true">
      <header class="modal__head">
        <h3 class="modal__title">{{ title }}</h3>
        <button class="modal__close" type="button" aria-label="Close" @click="emit('close')">✕</button>
      </header>
      <div class="modal__body"><slot /></div>
      <footer v-if="$slots.footer" class="modal__foot"><slot name="footer" /></footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(4, 7, 20, 0.72);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  width: min(560px, 100%);
  max-height: 86vh;
  display: flex; flex-direction: column;
}
.modal--wide { width: min(940px, 100%); }
.modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
}
.modal__title { font-size: 16px; }
.modal__close {
  background: transparent; border: none; cursor: pointer;
  color: var(--text-dim); font-size: 15px; padding: 4px 8px; border-radius: 6px;
}
.modal__close:hover { color: var(--text); background: var(--surface-hover); }
.modal__body { padding: 20px; overflow-y: auto; }
.modal__foot { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
</style>
