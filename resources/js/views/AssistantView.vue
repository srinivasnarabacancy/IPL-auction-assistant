<script setup>
import { computed, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat.js'
import { useSquadStore } from '@/stores/squad.js'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import MoneyValue from '@/components/base/MoneyValue.vue'

const chat = useChatStore()
const squad = useSquadStore()

onMounted(() => chat.loadMeta())

const remaining = computed(() => squad.summary?.remainingBudget ?? squad.localRemaining)
// Read the provider from the API rather than hardcoding it: the backend can be
// pointed at Gemini or Claude, and a stale label here would misreport which
// model actually answered.
const llmLabel = computed(() =>
  chat.meta?.llmConfigured ? `${chat.meta.llm} + RAG` : 'Retrieval-only fallback',
)
</script>

<template>
  <div class="page assistant">
    <header class="page-head">
      <div>
        <h1>AI Assistant</h1>
        <p class="subtitle">
          Every answer is grounded in the player catalogue, the auction knowledge base and your live squad.
        </p>
      </div>
      <div class="row-wrap">
        <!--
          The model name and index size are diagnostics. The one thing a user
          should know is that answers are coming from the fallback answerer
          rather than the model, because that visibly changes their quality.
        -->
        <BaseBadge v-if="chat.meta && !chat.meta.llmConfigured" tone="warning">
          Retrieval-only mode
        </BaseBadge>
        <BaseButton v-if="!chat.isEmpty" variant="ghost" size="sm" @click="chat.clear()">New chat</BaseButton>
      </div>
    </header>

    <div class="assistant__body">
      <div class="assistant__chat">
        <ChatWindow :messages="chat.messages">
          <template #intro>
            <BaseCard v-if="chat.isEmpty" title="Ask about the auction">
              <p class="intro">
                I can find players that fit a need and a budget, compare them, explain the auction
                and squad rules, and work out what your remaining purse of
                <strong><MoneyValue :value="remaining" /></strong> can still buy.
              </p>
              <div class="prompts">
                <button
                  v-for="suggestion in chat.suggestions"
                  :key="suggestion"
                  class="prompt"
                  type="button"
                  @click="chat.ask(suggestion)"
                >
                  {{ suggestion }}
                </button>
              </div>
            </BaseCard>
          </template>
        </ChatWindow>

        <ChatInput :streaming="chat.streaming" @send="chat.ask($event)" @stop="chat.stop()" />
      </div>

      <aside class="assistant__side">
        <BaseCard title="Context sent with every question">
          <dl class="ctx">
            <div><dt>Purse remaining</dt><dd class="num"><MoneyValue :value="remaining" /></dd></div>
            <div><dt>Total purse</dt><dd class="num"><MoneyValue :value="squad.budget" /></dd></div>
            <div><dt>Squad size</dt><dd class="num">{{ squad.size }}</dd></div>
            <div v-if="squad.summary"><dt>Indian / Overseas</dt><dd class="num">{{ squad.summary.indianCount }} / {{ squad.summary.overseasCount }}</dd></div>
          </dl>
          <p class="ctx__note dim">
            The assistant sees this automatically, so questions like “what can we still afford?”
            need no extra detail.
          </p>
        </BaseCard>

        <BaseCard v-if="chat.suggestions.length && !chat.isEmpty" title="Try next">
          <div class="prompts prompts--compact">
            <button
              v-for="suggestion in chat.suggestions.slice(0, 4)"
              :key="suggestion"
              class="prompt"
              type="button"
              :disabled="chat.streaming"
              @click="chat.ask(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </BaseCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.assistant { height: calc(100vh - var(--topbar-height) - 72px); min-height: 520px; }
.assistant__body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; flex: 1; min-height: 0; }
.assistant__chat { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.assistant__side { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }

.intro { font-size: 13.5px; line-height: 1.65; color: var(--text-muted); }
.intro strong { color: var(--accent); }

.prompts { display: flex; flex-direction: column; gap: 7px; margin-top: 14px; }
.prompts--compact { margin-top: 0; }
.prompt {
  text-align: left; padding: 10px 13px; border-radius: var(--radius-sm); cursor: pointer;
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 12.5px; line-height: 1.45;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.prompt:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
.prompt:disabled { opacity: 0.5; cursor: not-allowed; }

.ctx { display: flex; flex-direction: column; gap: 10px; margin: 0; }
.ctx div { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.ctx dt { font-size: 12.5px; color: var(--text-muted); }
.ctx dd { margin: 0; font-size: 14px; font-weight: 700; }
.ctx__note { font-size: 11.5px; margin-top: 14px; line-height: 1.5; }

@media (max-width: 1100px) {
  .assistant { height: auto; }
  .assistant__body { grid-template-columns: minmax(0, 1fr); }
  .assistant__chat { min-height: 60vh; }
}
</style>
