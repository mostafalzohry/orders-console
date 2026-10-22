# Decisions

## 1. No duplicate orders: an idempotency key enforced by the database (R2)

- **Decision:** one random key per form session, sent as `Idempotency-Key`. The server stores it with the order under a unique index on `(createdBy, idempotencyKey)`, and a repeat returns the stored order (`200`) instead of inserting.
- **Alternative I considered:** deduplicate by content, hashing customer and items inside a time window.
- **Why I rejected it:** two genuinely identical orders would be blocked, and the window is a guess. A key identifies the exact attempt, and the unique index makes parallel requests safe.
- **Proof:** `npm run test:duplicate`: 10 parallel requests, 1 created, 9 replayed, 1 order stored.
- **Limits:** a new key with the same data creates a second order. Keys never expire and are per user. The same key with a different body gets `422`.

## 2. Cursor pagination instead of page and limit (R1)

- **Decision:** cursor pagination ordered by the sort field and `_id`, 50 rows a page.
- **Alternative I considered:** page number with `skip` and `limit`.
- **Why I rejected it:** cost, measured with `explain` on 50,006 orders: a page 30,000 rows deep reads 51 index keys with a cursor and 30,051 with `skip`.
- **The real reason is correctness.** While orders arrive or are deleted, `skip` shifts the rows, so an agent sees one twice or misses one.
- **Cost I accepted:** Next and Previous only, no page numbers and no total count.

## 3. TanStack Query for server state (R1 rapid filter, O1 stats)

- **Decision:** TanStack Query owns server state. The query key holds the search, status, sort, direction and cursor, and every request carries an abort signal.
- **Alternative I considered:** `useEffect` and `useState` with a hand-written request-id guard.
- **Why I rejected it:** I would re-implement cancellation, caching and retries, and a stale-response bug is easy to introduce in exactly the case the brief tests by hand.
- **Result:** a slow old request can only fill its own key's cache entry. A test (500, 50 and 200 ms) proves the table shows the latest one, and removing `status` from the key makes it fail.
- **Trade-off:** one more dependency, and the key must contain every input.

## AI tools

I used Claude Code (Anthropic) throughout this project to write code, tests and documents. I set the requirements, made the design decisions (cursor pagination, idempotency key, computed totals, dialogs, which optional task), reviewed every step before committing, and ran and verified the results myself.
