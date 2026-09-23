<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  step: { type: [String, Number], default: undefined },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
})
const emit = defineEmits(['update:modelValue'])

const onInput = (event, type) => {
  const raw = event.target.value
  if (type !== 'number') return emit('update:modelValue', raw)
  emit('update:modelValue', raw === '' ? null : Number(raw))
}
</script>

<template>
  <label class="field">
    <span v-if="label" class="field__label">{{ label }}</span>
    <span class="field__wrap">
      <slot name="prefix" />
      <input
        class="field__control"
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :step="step"
        :min="min"
        :max="max"
        @input="onInput($event, type)"
      />
    </span>
  </label>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field__label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--text-dim);
}
.field__wrap {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 11px;
  transition: border-color 0.15s ease;
}
.field__wrap:focus-within { border-color: var(--brand); }
.field__control {
  background: transparent; border: none; outline: none;
  padding: 9px 0; font-size: 13px; width: 100%; min-width: 0;
}
.field__control::placeholder { color: var(--text-dim); }
</style>
