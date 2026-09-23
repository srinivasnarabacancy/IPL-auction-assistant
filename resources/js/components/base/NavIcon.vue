<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})
</script>

<template>
  <!--
    One stroke set at a single weight, drawn on a 24 grid and inheriting
    currentColor, so every item in the nav sits on the same baseline and picks
    up the active colour. The previous icons were assorted text glyphs, which
    is why they differed in weight and why the lightning bolt rendered as a
    colour emoji.
  -->
  <svg
    class="navicon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Dashboard: panels of a layout -->
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    </template>

    <!-- Player Explorer: search the pool -->
    <template v-else-if="name === 'explore'">
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path d="M15.6 15.6 21 21" />
    </template>

    <!-- Compare Players: side-by-side measures -->
    <template v-else-if="name === 'compare'">
      <path d="M3.5 20.5h17" />
      <rect x="6" y="10" width="4.6" height="7.5" rx="1.2" />
      <rect x="13.4" y="5.5" width="4.6" height="12" rx="1.2" />
    </template>

    <!-- Squad Builder: a group of players -->
    <template v-else-if="name === 'squad'">
      <circle cx="9.2" cy="8" r="3.4" />
      <path d="M3 19.6c0-3.2 2.8-5.4 6.2-5.4s6.2 2.2 6.2 5.4" />
      <circle cx="17.6" cy="9.6" r="2.5" />
      <path d="M17.9 14.4c1.9.4 3.1 2 3.1 4" />
    </template>

    <!-- Auction Room: the gavel -->
    <template v-else-if="name === 'auction'">
      <path d="M12.8 4.2 19.4 10.8" stroke-width="4.2" />
      <path d="M14.4 10.2 7.2 17.4" />
      <path d="M3.6 20.6h9.2" />
    </template>

    <!-- AI Assistant: a robot -->
    <template v-else-if="name === 'assistant'">
      <rect x="3.8" y="7.6" width="16.4" height="12.2" rx="3.4" />
      <path d="M12 7.6V4.6" />
      <circle cx="12" cy="3.2" r="1.3" />
      <path d="M9.4 12.6v1.6M14.6 12.6v1.6" />
      <path d="M9.8 16.8h4.4" />
    </template>
  </svg>
</template>

<style scoped>
.navicon { display: block; flex-shrink: 0; }
</style>
