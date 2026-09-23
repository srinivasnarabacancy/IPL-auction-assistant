# IPL Auction Assistant

A full-stack application that takes an IPL auction from browsing the player pool to a defensible
squad: filter → compare → budget → bid → ask. The assistant answers questions grounded in the
player catalogue, an auction-rules knowledge base, and the squad you have actually built.

The player data and knowledge base ship with the repo, so a clone is a working demo — no database
and no API key required to start.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js ≥ 20, Express 4 |
| Frontend | Vue 3 (Composition API) + Vite 6, bundled from `resources/` |
| Styling | Plain CSS with design tokens — no UI framework |
| State | Pinia, persisted to `localStorage` |
| Database | MongoDB via Mongoose — **optional**; falls back to the committed JSON seed |
| Vector store | In-process cosine index persisted to `storage/`, behind a swappable interface |
| LLM (chat) | Google Gemini (`gemini-3.5-flash-lite`); Claude selectable via `LLM_PROVIDER` |
| LLM (embeddings) | Google Gemini (`gemini-embedding-001`, truncated to 768 dimensions) |
| Deployment | Vercel — serverless function for `/api`, static client from `dist/` |

No auth, no queue, no build step for the server: everything derived lives under `storage/` and is
rebuildable from the committed corpus with one command.

## Prerequisites

- Node.js 20+ with npm
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier is enough) — optional;
  without one the assistant runs a deterministic retrieval-only answerer
- MongoDB — optional; without it player data is read from `database/seeds/players.json`

## Setup

```bash
npm install
cp .env.example .env         # then add GOOGLE_API_KEY
npm run ingest               # build the retrieval index into storage/
npm run dev                  # API on :4000, client on :5173
```

`npm run setup` does the install and the `.env` copy in one step. The first `npm run dev` builds
the index automatically if `npm run ingest` was skipped, so the sequence above works as written.

## Configuration

Everything lives in `config/index.js`, overridable by environment variable. The knobs you are most
likely to touch:

| Variable | Default | Effect |
|---|---|---|
| `GOOGLE_API_KEY` | — | Enables Gemini. Unset ⇒ retrieval-only fallback answers |
| `LLM_PROVIDER` | `gemini` when a Google key is present | `gemini` or `anthropic` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Answer generation |
| `EMBEDDING_PROVIDER` | `local` in code, `gemini` in `.env.example` | `local`, `gemini` or `cohere` |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Vectors |
| `GEMINI_EMBEDDING_DIMENSIONS` | `768` | Truncated and re-normalised |
| `RAG_TOP_K` | `6` | Chunks retrieved per question |
| `MONGODB_URI` | — | Empty ⇒ in-memory mode from the JSON seed |
| `PORT` | `4000` | API port; the Vite dev server proxies `/api` to it |

Changing the embedding provider changes the vector width, so the index is keyed by provider name
and rebuilt automatically when it no longer matches.

Auction rules — the ₹120 Cr purse, the 18–25 squad range, the 8-overseas cap and the bid increment
ladder — live in `AUCTION_RULES` in the same file. The UI, the REST API and the assistant all read
them from there, so they cannot drift apart.

## How it works

**Ingest, offline:** load markdown + player records → chunk → embed → normalise → store.
One document per player is generated from its row, phrased the way users ask, because retrieval
quality depends far more on that wording than on the embedding model.

**Query, per message:** parse hard constraints → retrieve → resolve named players → assemble
context (rules + catalogue matches + live squad + budget projections) → generate → stream.

Vector search alone cannot enforce "under ₹5 crore", so `app/services/rag/queryParser.js` extracts price, role,
nationality and speciality constraints deterministically and the exact matches go into the prompt
alongside the retrieved passages. Every question also carries the user's current squad and purse,
so "what can we still afford?" needs no extra detail.

## Project layout

```
server.js                Local entry point
api/index.js             Serverless entry point (Vercel)
bootstrap/app.js         Express assembly — middleware, routes, error handling
config/                  Environment + auction rule constants
routes/                  players · squad · auction · chat
app/
  middleware/            zod validation, error handler
  models/                Mongoose schemas
  repositories/          The only code that touches storage
  services/
    playerQuery.js       Pure filter / sort / paginate / facets
    squadService.js      Squad analysis, budget projection, bid increments
    auctionService.js    Auction sessions (nominate → bid → sold)
    rag/                 chunker · embeddings · vectorStore · ingest
                         queryParser · retriever · llm · chatService
database/
  connection.js          Mongo connection with in-memory fallback
  seeds/players.json     61 mock players
  knowledge-base/*.md    Auction rules, squad rules, roles, budget strategy
storage/                 Generated vector index — gitignored
resources/js/            Vue client: api · stores · composables · components · views
resources/css/main.css   Design tokens and global styles
scripts/                 ingest · seed
```

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Status, database mode, active model, index size, auction rules |
| `GET` | `/api/players` | List with search, filters, sorting, pagination |
| `GET` | `/api/players/facets` | Distinct filter values and price range |
| `GET` | `/api/players/compare?ids=` | Compare players, with the best value per metric |
| `GET` | `/api/players/:id` | Player detail plus similar players |
| `POST` | `/api/squad/analyse` | Budget, composition and rule violations |
| `POST` | `/api/squad/project` | Purse impact of buying a given player |
| `POST` | `/api/squad/suggestions` | Players for the gaps, within the remaining purse |
| `POST` | `/api/auction/sessions` | Start a session; `/nominate`, `/bid`, `/sold`, `/unsold` follow |
| `POST` | `/api/chat/ask` | Ask the assistant (single response) |
| `POST` | `/api/chat/stream` | Ask the assistant (SSE: `token` → `context` → `done`) |
| `POST` | `/api/chat/reindex` | Rebuild the retrieval index |

## Verification

There is no automated test suite; this is a deliberate scope decision. These commands cover the
pipeline end to end:

```bash
curl -s localhost:4000/api/health                    # database mode, active model, index size
npm run ingest                                       # re-embed the corpus, confirm the provider
curl -s "localhost:4000/api/players?role=Bowler&maxPrice=2"        # filters
curl -s "localhost:4000/api/players/compare?ids=p041,p052"         # comparison + best-value flags
curl -sN -X POST localhost:4000/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"question":"I need a death bowler.","budget":120,"squad":[]}'  # retrieval + streaming
```

The assistant is the piece most worth checking by hand. Ask it something answerable
("Show Indian middle-order batsmen under ₹5 crore"), something that needs your live squad
("How much budget will remain if I buy Hardik Pandya?"), and something outside the corpus
("Who won the 2019 Nobel Prize in Physics?") — the last should refuse rather than guess.

## Data

The 61 players in `database/seeds/players.json` are **mock data**: real player names and roles with
illustrative career numbers shaped like IPL statistics. They are not accurate records and should
not be quoted as such.

To swap in a real feed, replace that file — or point the repository at a real collection — and run
`npm run ingest` to rebuild the index.

## Deployment

```bash
vercel --prod
```

Set `GOOGLE_API_KEY`, `LLM_PROVIDER=gemini` and `EMBEDDING_PROVIDER=gemini` in **Project Settings →
Environment Variables** for Production *and* Preview, before the first build. `vercel-build` runs
`npm run ingest`, and the index must be embedded with the same provider the running function uses
or every cold start will rebuild it.

What differs on Vercel: the index is built at deploy time and bundled via `includeFiles`; the
filesystem is read-only, so `vectorStore.persist()` swallows `EROFS`/`EACCES` and keeps the index in
memory; and a boot failure degrades rather than crashes — if the index cannot be loaded or rebuilt,
the API still serves and the assistant falls back to its deterministic answerer.

## Known limitations

**Auction sessions are held in memory** (`app/services/auctionService.js`). Serverless invocations
do not share memory, so on Vercel a session created by one instance may not be visible to the next
and bidding can fail with *"Auction session not found"*. Locally the same thing happens across a
server restart. Everything else is unaffected: squads live in the browser and player data is
read-only. Backing sessions with MongoDB or Redis is the fix; that module is written so only the
`Map` has to change.

**Squads, comparisons and chat history live in the browser.** They survive a refresh but are not
shared between devices and are not readable server-side.

**Free-tier embeddings have two separate ceilings**, and they behave differently:

| Quota | Limit | Recovery |
|---|---|---|
| `EmbedContentRequestsPerMinute...FreeTier` | 100 / minute | Retried automatically using the server-supplied `retryDelay` |
| `EmbedContentRequestsPerDay...FreeTier` | 1000 / day | Not retried — the API returns `retryDelay: 0s`; it resets at the daily boundary |

Hitting the daily ceiling does not break the app. `npm run ingest` fails, so the index cannot be
rebuilt, and query embedding fails, so retrieval returns nothing — but the deterministic query
parser still supplies catalogue matches and the answer stays correct, just without the knowledge
base passages. Chat generation is a separate quota and keeps working.

A paid tier removes both ceilings; `EMBEDDING_PROVIDER=local` avoids embedding API calls entirely,
at some cost to retrieval quality — a deploy configured that way never depends on the quota.

`vercel-build` runs the ingest with `--soft`, so a deploy is never blocked by an unavailable
embedding provider: the build logs the failure, ships without a prebuilt index, and the running app
falls back to catalogue-only answers. `npm run ingest` on its own stays strict and exits non-zero,
because locally you want to know.
