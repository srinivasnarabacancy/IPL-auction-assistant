<script setup>
import { computed } from 'vue'
import BaseBadge from '../base/BaseBadge.vue'
import { renderMarkdown } from '@/utils/markdown.js'
import MoneyValue from '../base/MoneyValue.vue'

const props = defineProps({ message: { type: Object, required: true } })

const isUser = computed(() => props.message.role === 'user')
const html = computed(() => renderMarkdown(props.message.content))
const showCaret = computed(() => props.message.streaming && !props.message.content)
</script>

<template>
  <div class="bubble" :class="isUser ? 'bubble--user' : 'bubble--assistant'">
    <span class="bubble__avatar">{{ isUser ? '🧑' : '✦' }}</span>

    <div class="bubble__body">
      <div v-if="showCaret" class="bubble__thinking">
        <span /><span /><span />
      </div>
      <div v-else class="bubble__content" v-html="html" />

      <div v-if="message.error" class="bubble__error">{{ message.error }}</div>

      <div v-if="message.referencedPlayers?.length || message.matchedPlayers?.length" class="bubble__players">
        <RouterLink
          v-for="player in [...(message.referencedPlayers || []), ...(message.matchedPlayers || [])]
            .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
            .slice(0, 8)"
          :key="player.id"
          :to="`/players/${player.id}`"
          class="chip"
        >
          {{ player.name }}
          <span class="chip__price num"><MoneyValue :value="player.basePrice" /></span>
        </RouterLink>
      </div>

      <details v-if="message.sources?.length" class="bubble__sources">
        <summary>{{ message.sources.length }} source{{ message.sources.length === 1 ? '' : 's' }} retrieved</summary>
        <ul>
          <li v-for="source in message.sources" :key="`${source.source}-${source.title}`">
            <div class="src__head">
              <BaseBadge :tone="source.type === 'player' ? 'brand' : 'gold'" size="sm">{{ source.type }}</BaseBadge>
              <strong>{{ source.title }}</strong>
              <span class="dim num">{{ source.score }}</span>
            </div>
            <p class="src__snippet">{{ source.snippet.slice(0, 260) }}…</p>
          </li>
        </ul>
      </details>
    </div>
  </div>
</template>

<style scoped>
.bubble { display: flex; gap: 11px; align-items: flex-start; }
.bubble--user { flex-direction: row-reverse; }

.bubble__avatar {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px;
  display: grid; place-items: center; font-size: 14px;
  background: var(--surface); border: 1px solid var(--border);
}
.bubble--assistant .bubble__avatar { background: var(--accent-soft); border-color: rgba(240, 165, 0, 0.3); color: var(--accent); }

.bubble__body {
  max-width: min(760px, 86%);
  padding: 13px 16px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 13.5px;
  line-height: 1.62;
}
.bubble--user .bubble__body {
  background: var(--brand-soft);
  border-color: rgba(61, 90, 254, 0.3);
}

.bubble__content :deep(p) { margin: 0 0 9px; }
.bubble__content :deep(p:last-child) { margin-bottom: 0; }
.bubble__content :deep(ul) { margin: 0 0 9px; padding-left: 19px; }
.bubble__content :deep(li) { margin-bottom: 4px; }
.bubble__content :deep(strong) { color: var(--text); font-weight: 700; }
.bubble__content :deep(em) { color: var(--text-muted); }
.bubble__content :deep(code) {
  background: var(--bg); padding: 1px 5px; border-radius: 5px;
  font-size: 12px; border: 1px solid var(--border);
}
.bubble__content :deep(blockquote) {
  margin: 9px 0; padding: 8px 13px;
  border-left: 3px solid var(--accent); background: var(--bg-elevated);
  border-radius: 0 7px 7px 0; color: var(--text-muted); font-size: 12.5px;
}
.bubble__content :deep(h3) { font-size: 14px; margin: 12px 0 6px; }

.bubble__thinking { display: flex; gap: 5px; padding: 3px 0; }
.bubble__thinking span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
  animation: pulse 1.2s infinite ease-in-out;
}
.bubble__thinking span:nth-child(2) { animation-delay: 0.16s; }
.bubble__thinking span:nth-child(3) { animation-delay: 0.32s; }
@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }

.bubble__error {
  margin-top: 9px; padding: 8px 11px; font-size: 12px;
  background: var(--danger-soft); border: 1px solid rgba(255, 92, 114, 0.3);
  border-radius: 8px; color: var(--danger);
}

.bubble__players { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600;
  background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-muted);
}
.chip:hover { border-color: var(--accent); color: var(--accent); }
.chip__price { color: var(--text-muted); font-size: 11px; }

.bubble__sources { margin-top: 12px; font-size: 12px; }
.bubble__sources summary { cursor: pointer; color: var(--text-dim); font-weight: 600; }
.bubble__sources summary:hover { color: var(--text-muted); }
.bubble__sources ul { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.bubble__sources li { padding: 10px 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 9px; }
.src__head { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.src__head strong { flex: 1; min-width: 0; }
.src__snippet { margin-top: 6px; font-size: 11.5px; color: var(--text-dim); line-height: 1.5; }

@media (max-width: 680px) {
  .bubble__body { max-width: 100%; }
}
</style>
