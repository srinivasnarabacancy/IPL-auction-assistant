<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  label: { type: String, default: 'Scrollable list' },
})

const rail = ref(null)
const atStart = ref(true)
const atEnd = ref(false)
const overflowing = ref(false)

/**
 * Built on native overflow scrolling rather than a transform-based slider:
 * touch swipe, trackpad, keyboard arrows, focus-scrolling and screen readers
 * all work without any code. The buttons only automate what the container
 * already does, and they hide entirely when nothing overflows.
 */
function measure() {
  const el = rail.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  overflowing.value = max > 4
  atStart.value = el.scrollLeft <= 4
  atEnd.value = el.scrollLeft >= max - 4
}

function page(direction) {
  const el = rail.value
  if (!el) return
  // Scroll by just under a viewport so one card stays visible as an anchor.
  el.scrollBy({ left: direction * el.clientWidth * 0.82, behavior: 'smooth' })
}

let observer = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (rail.value) observer.observe(rail.value)
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <div class="carousel">
    <div
      ref="rail"
      class="carousel__rail"
      role="region"
      :aria-label="label"
      tabindex="0"
      @scroll.passive="measure"
    >
      <slot />
    </div>

    <template v-if="overflowing">
      <button
        class="carousel__nav carousel__nav--prev"
        type="button"
        aria-label="Scroll left"
        :disabled="atStart"
        @click="page(-1)"
      >
        ‹
      </button>
      <button
        class="carousel__nav carousel__nav--next"
        type="button"
        aria-label="Scroll right"
        :disabled="atEnd"
        @click="page(1)"
      >
        ›
      </button>
      <div class="carousel__fade carousel__fade--start" :class="{ 'is-hidden': atStart }" />
      <div class="carousel__fade carousel__fade--end" :class="{ 'is-hidden': atEnd }" />
    </template>
  </div>
</template>

<style scoped>
.carousel { position: relative; }

.carousel__rail {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-left: 2px;
  padding: 2px;
  scrollbar-width: none;
}
.carousel__rail::-webkit-scrollbar { display: none; }
.carousel__rail:focus-visible { outline: 2px solid var(--accent-line); outline-offset: 4px; border-radius: var(--radius); }

/* Slotted cards size themselves to the rail rather than the grid. */
.carousel__rail > :deep(*) {
  flex: 0 0 clamp(240px, 26%, 290px);
  scroll-snap-align: start;
}

.carousel__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 20px;
  line-height: 1;
  padding-bottom: 3px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text);
  background: var(--surface-hover);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow);
  transition: opacity 0.15s ease, background 0.15s ease;
  z-index: 2;
}
.carousel__nav:hover:not(:disabled) { background: var(--border-strong); }
.carousel__nav:disabled { opacity: 0; pointer-events: none; }
.carousel__nav--prev { left: -6px; }
.carousel__nav--next { right: -6px; }

/* A soft edge signals "there is more" without adding another control. */
.carousel__fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 44px;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 1;
}
.carousel__fade--start { left: 0; background: linear-gradient(90deg, var(--surface), transparent); }
.carousel__fade--end { right: 0; background: linear-gradient(270deg, var(--surface), transparent); }
.carousel__fade.is-hidden { opacity: 0; }

@media (max-width: 680px) {
  .carousel__rail > :deep(*) { flex: 0 0 82%; }
  .carousel__nav { display: none; }
}
</style>
