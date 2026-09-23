import { ref, shallowRef } from 'vue'

/**
 * Wraps an async function with loading/error state and guards against a slow
 * response overwriting a newer one.
 */
export function useAsync(fn, { initialData = null } = {}) {
  const data = shallowRef(initialData)
  const error = ref(null)
  const loading = ref(false)
  let requestId = 0

  const run = async (...args) => {
    const id = ++requestId
    loading.value = true
    error.value = null
    try {
      const result = await fn(...args)
      if (id === requestId) data.value = result
      return result
    } catch (err) {
      if (id === requestId) error.value = err
      return null
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  return { data, error, loading, run }
}
