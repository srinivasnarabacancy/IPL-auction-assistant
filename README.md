# IPL Auction Assistant

An AI-powered assistant for IPL auction planning. Explore the player pool, compare options, build a
squad against a configurable purse, simulate live bidding, and ask a RAG-backed assistant questions
that are grounded in both the player catalogue and an auction-rules knowledge base.

**Stack:** Vue 3 (Composition API) + Vite + Pinia · Node.js + Express · MongoDB (optional) ·
Google Gemini for generation and embeddings (Claude supported as an alternative), with a
pluggable vector store.

---

## Quick start

The app runs with **zero configuration** — no database and no API keys required.

```bash
npm run setup          # installs dependencies and creates .env
npm run dev            # starts the API on :4000 and the client on :5173
```

Open <http://localhost:5173>.

On first boot the backend builds its retrieval index from the knowledge base and the player data,
and caches it to `storage/vector-index.json`.

### Running the two sides separately

```bash
npm run dev:server     # http://localhost:4000/api
npm run dev:client     # http://localhost:5173  (proxies /api to :4000)
```

One package, one `npm install`, one `node_modules` — the server and the client live in the same
project, Laravel style, with `index.html` and `vite.config.js` at the root.

---

## What runs without configuration, and what configuration adds

| Concern | Default (no config) | With configuration |
|---|---|---|
| **Database** | In-memory, seeded from `database/seeds/players.json` | Set `MONGODB_URI`, then `npm run seed` |
| **LLM** | Deterministic retrieval-only answerer | Set `GOOGLE_API_KEY` for Gemini answers (or `ANTHROPIC_API_KEY` + `LLM_PROVIDER=anthropic` for Claude) |
| **Embeddings** | Local hashed TF-IDF (no network) | `EMBEDDING_PROVIDER=gemini` (uses the same `GOOGLE_API_KEY`), or `cohere` |
| **Vector store** | In-process cosine index, persisted to disk | Swap `MemoryVectorStore` for Qdrant/pgvector |

Every one of these sits behind an interface, so turning one on does not touch the rest of the app.
See `.env.example` for the full list.

---

## Features

**Dashboard** — purse, squad size, overseas usage and rule violations at a glance, plus marquee
players and value picks.

**Player Explorer** — search and filter by role, Indian/Overseas, batting position, bowling type,
speciality tags and base-price range, with sorting and pagination.

**Player Details** — full batting and bowling statistics, profile, similar players, and a live
"what does buying this player do to my purse" projection.

**Compare Players** — up to four players side by side, with the best value in each row highlighted.

**Squad Builder** — a configurable purse, editable per-player prices, live squad value and
composition, rule checks, and suggestions for the gaps in the squad.

**Auction Room** — nominate a player, bid against rival franchises on the real increment ladder,
drop the hammer, and watch the purse and squad update. Runs its own purse so a bidding rehearsal
does not disturb the planned squad; results can be copied to the Squad Builder.

**AI Assistant** — a streaming chat that answers with the player catalogue, the auction knowledge
base and your current squad and purse all in context.

The assistant handles questions such as:

- *"Show Indian middle-order batsmen under ₹5 crore."*
- *"I need a death bowler. Show suitable options."*
- *"We have ₹12 crore remaining. What type of players can we target?"*
- *"Compare Jasprit Bumrah and Rashid Khan."*
- *"How much budget will remain if I buy Hardik Pandya?"*

---

## Architecture

```
server.js                Entry point
bootstrap/app.js         Express app assembly (middleware, routes, error handling)
config/                  Environment + auction rule constants (one place to change the rules)
routes/                  REST endpoints: players, squad, auction, chat
app/
  middleware/            Validation (zod) and error handling
  models/                Mongoose schemas
  repositories/          The only code that touches storage
  services/
    playerQuery.js         Pure filter / sort / paginate / facets
    squadService.js        Squad analysis, budget projection, bid increments
    auctionService.js      Auction sessions (nominate -> bid -> sold)
    rag/
      chunker.js           Markdown + player-record chunking
      embeddings.js        Local, Gemini and Cohere providers, one interface
      vectorStore.js       Cosine index; the seam for a real vector DB
      ingest.js            Builds the index from the knowledge base + players
      queryParser.js       Natural language -> hard catalogue constraints
      retriever.js         Embed, search, de-duplicate
      llm.js               Gemini / Claude client (streaming + single-shot)
      chatService.js       Context assembly and answer generation
database/
  connection.js          Mongo connection with an in-memory fallback
  seeds/players.json     61 mock players
  knowledge-base/*.md    Auction rules, squad rules, roles, budget strategy
storage/                 Generated artefacts (vector index) - gitignored
scripts/                 ingest / seed CLI entry points
resources/
  css/main.css           Design tokens and global styles
  js/
    api/                 Fetch client + SSE reader, one module per resource
    stores/              Pinia: squad, players, compare, auction, chat
    composables/         usePlayerFilters, useAsync, useCurrency, useDebouncedRef
    components/          base/ layout/ player/ squad/ auction/ chat/
    views/               One per route, lazy-loaded
    main.js              Client entry
index.html               Vite entry document
vite.config.js           Client build + /api dev proxy
dist/                    Production client build
```

### Design notes

- **One definition of the rules.** Squad limits, budget maths and bid increments live only in
  `config/` and `app/services/squadService.js`. The UI, the REST API and the AI assistant all read
  the same numbers, so they cannot disagree.
- **Retrieval is hybrid.** Vector search alone is unreliable for hard constraints like
  "under ₹5 crore", so `queryParser.js` extracts those deterministically and the exact matches go
  into the prompt alongside the retrieved passages.
- **The assistant always knows your position.** Every question carries the live squad and purse, so
  "what can we still afford?" needs no extra detail from the user.
- **Storage is behind a repository.** Filtering runs in memory because the catalogue is small; when
  it grows, push the predicate into `playerRepository.findAll` and nothing else changes.
- **The model provider is one file.** `llm.js` exposes `streamAnswer` / `answerOnce` for both
  Gemini and Claude; `LLM_PROVIDER` picks one and nothing else in the app knows the difference.
- **The index is keyed by embedding provider.** Providers emit different vector widths, and scoring
  a 768-d query against a 4096-d index fails silently rather than erroring, so `ensureIndex`
  rebuilds automatically whenever the active provider differs from the one that built the index.

---

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Status, database mode, LLM mode, index size, auction rules |
| `GET` | `/api/players` | List with search, filters, sorting, pagination |
| `GET` | `/api/players/facets` | Distinct filter values and price range |
| `GET` | `/api/players/compare?ids=` | Compare players, with the best value per metric |
| `GET` | `/api/players/:id` | Player detail plus similar players |
| `POST` | `/api/squad/analyse` | Budget, composition and rule violations |
| `POST` | `/api/squad/project` | Purse impact of buying a given player |
| `POST` | `/api/squad/suggestions` | Players for the gaps, within the remaining purse |
| `GET` | `/api/squad/rules` | Auction and squad rule constants |
| `POST` | `/api/auction/sessions` | Start an auction session |
| `POST` | `/api/auction/sessions/:id/nominate` | Put a player on the block |
| `POST` | `/api/auction/sessions/:id/bid` | Place a bid (`you` or `rival`) |
| `POST` | `/api/auction/sessions/:id/sold` | Drop the hammer |
| `POST` | `/api/chat/ask` | Ask the assistant (single response) |
| `POST` | `/api/chat/stream` | Ask the assistant (SSE: `token` → `context` → `done`) |
| `POST` | `/api/chat/reindex` | Rebuild the retrieval index |

---

## Data

The 61 players in `database/seeds/players.json` are **mock data**: real player names and roles
with illustrative career numbers shaped like IPL statistics. They are not accurate records and
should not be quoted as such.

To swap in a real feed, replace that file (or point the repository at a real collection) and run
`npm run ingest` to rebuild the retrieval index.

---

## Scripts

| Command | Effect |
|---|---|
| `npm run setup` | Install dependencies and create `.env` |
| `npm run dev` | Run the API and the client together |
| `npm run build` | Production build of the client into `dist/` |
| `npm run ingest` | Rebuild the vector index from the knowledge base and players |
| `npm run seed` | Load the seed players into MongoDB (requires `MONGODB_URI`) |
