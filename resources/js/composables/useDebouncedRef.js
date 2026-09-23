import { ref, watch, onUnmounted } from 'vue'

/** Mirrors a source ref, updating only after it has been quiet for `delay` ms. */
export function useDebouncedRef(source, delay = 300) {
  const debounced = ref(source.value)
  let timer = null

  watch(source, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  onUnmounted(() => clearTimeout(timer))
  return debounced
}
