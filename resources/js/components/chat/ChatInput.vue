<script setup>
import { nextTick, ref } from 'vue'
import BaseButton from '../base/BaseButton.vue'

const props = defineProps({ streaming: Boolean })
const emit = defineEmits(['send', 'stop'])

const text = ref('')
const textarea = ref(null)

/** Grows with the content up to a cap, so long questions stay readable. */
async function autosize() {
  await nextTick()
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 168)}px`
}

function submit() {
  const value = text.value.trim()
  // Keep the text in the box while an answer is streaming: the store ignores a
  // second question, so clearing it here would silently discard what was typed.
  if (!value || props.streaming) return
  emit('send', value)
  text.value = ''
  autosize()
}

function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <textarea
      ref="textarea"
      v-model="text"
      class="composer__input"
      rows="1"
      placeholder="Ask about players, budget, squad rules… (Enter to send, Shift+Enter for a new line)"
      @input="autosize"
      @keydown="onKeydown"
    />
    <BaseButton v-if="streaming" variant="danger" @click="emit('stop')">Stop</BaseButton>
    <BaseButton v-else variant="primary" :disabled="!text.trim()" @click="submit">Ask</BaseButton>
  </form>
</template>

<style scoped>
.composer {
  display: flex; align-items: flex-end; gap: 10px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.composer:focus-within { border-color: var(--border-strong); }
.composer__input {
  flex: 1; min-width: 0;
  background: transparent; border: none; outline: none; resize: none;
  font-size: 13.5px; line-height: 1.55; padding: 8px 4px; max-height: 168px;
}
.composer__input::placeholder { color: var(--text-dim); }
</style>
