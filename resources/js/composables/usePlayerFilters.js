import { computed, reactive, ref, toRefs, watch } from 'vue'
import { useDebouncedRef } from './useDebouncedRef.js'

const emptyFilters = () => ({
  search: '',
  role: '',
  nationality: '',
  battingOrder: '',
  bowlingType: '',
  tags: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'rating',
})

/**
 * Owns the Player Explorer's filter state and turns it into API query params.
 * Text search is debounced; every other control applies immediately.
 */
export function usePlayerFilters(initial = {}) {
  const filters = reactive({ ...emptyFilters(), ...initial })
  const page = ref(1)

  const search = computed(() => filters.search)
  const debouncedSearch = useDebouncedRef(search, 300)

  // Any change to the criteria should send the user back to the first page.
  watch(
    () => [
      debouncedSearch.value, filters.role, filters.nationality, filters.battingOrder,
      filters.bowlingType, filters.tags.join(','), filters.minPrice, filters.maxPrice, filters.sortBy,
    ],
    () => { page.value = 1 },
  )

  const queryParams = computed(() => ({
    search: debouncedSearch.value || undefined,
    role: filters.role || undefined,
    nationality: filters.nationality || undefined,
    battingOrder: filters.battingOrder || undefined,
    bowlingType: filters.bowlingType || undefined,
    tags: filters.tags.length ? filters.tags : undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    sortBy: filters.sortBy || undefined,
    page: page.value,
    pageSize: 24,
  }))

  const activeCount = computed(
    () =>
      [filters.role, filters.nationality, filters.battingOrder, filters.bowlingType, filters.search]
        .filter(Boolean).length +
      filters.tags.length +
      (filters.minPrice != null ? 1 : 0) +
      (filters.maxPrice != null ? 1 : 0),
  )

  const reset = () => Object.assign(filters, emptyFilters())

  const toggleTag = (tag) => {
    const index = filters.tags.indexOf(tag)
    if (index === -1) filters.tags.push(tag)
    else filters.tags.splice(index, 1)
  }

  return { filters, ...toRefs(filters), page, queryParams, activeCount, reset, toggleTag }
}
