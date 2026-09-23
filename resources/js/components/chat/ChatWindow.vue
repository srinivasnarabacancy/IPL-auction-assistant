<script setup>
import { nextTick, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({ messages: { type: Array, default: () => [] } })

const scroller = ref(null)

/** Keeps the newest text in view while an answer streams in. */
watch(
  () => props.messages.map((message) => message.content.length).join(','),
  async () => {
    await nextTick()
    const el = scroller.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { flush: 'post' },
)
</script>

<template>
  <div ref="scroller" class="window">
    <div class="window__inner">
      <slot name="intro" />
      <MessageBubble v-for="message in messages" :key="message.id" :message="message" />
    </div>
  </div>
</template>

<style scoped>
.window { overflow-y: auto; flex: 1; min-height: 0; }
.window__inner { display: flex; flex-direction: column; gap: 18px; padding: 4px 2px 8px; }
</style>
