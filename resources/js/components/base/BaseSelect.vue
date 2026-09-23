<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // string[] | { value, label }[]
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'All' },
})
defineEmits(['update:modelValue'])

const normalise = (option) =>
  typeof option === 'object' ? option : { value: option, label: option }
</script>

<template>
  <label class="field">
    <span v-if="label" class="field__label">{{ label }}</span>
    <select
      class="field__control"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="normalise(option).value" :value="normalise(option).value">
        {{ normalise(option).label }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field__label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--text-dim);
}
.field__control {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 11px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
  cursor: pointer;
  width: 100%;
}
.field__control:focus { border-color: var(--brand); }
option { background: var(--bg-elevated); }
</style>
