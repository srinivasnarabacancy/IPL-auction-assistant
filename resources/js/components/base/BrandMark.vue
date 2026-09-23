<script setup>
defineProps({
  size: { type: [Number, String], default: 34 },
})
</script>

<template>
  <!--
    Bat and ball. The bat is one tapered silhouette rather than two rectangles,
    so the shoulder between blade and handle is visible at large sizes, and the
    ball sits clear of the handle - overlapping them merges the two shapes into
    a mallet at 16px. Drawn on transparent here; the favicon uses the same
    geometry knocked out of a solid tile, which is what survives a browser tab.
  -->
  <svg
    class="mark"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    role="img"
    aria-label="IPL Auction Assistant"
  >
    <g transform="rotate(42 17 17)">
      <path
        class="mark__bat"
        d="M14.2 6.4 Q14.2 4.7 17.3 4.7 Q20.4 4.7 20.4 6.4 L20.4 16.0
           Q20.4 17.4 18.6 17.7 L18.3 25.6 Q18.3 26.8 17.3 26.8
           Q16.3 26.8 16.3 25.6 L16.0 17.7 Q14.2 17.4 14.2 16.0 Z"
      />
    </g>
    <circle class="mark__ball" cx="8.2" cy="9.8" r="3.6" />
  </svg>
</template>

<style scoped>
.mark { display: block; flex-shrink: 0; }
.mark__bat { fill: var(--accent); }
.mark__ball { fill: var(--accent); opacity: 0.85; }
</style>
