# Orders Console

A small order-management app: a list that stays fast and correct over 50,000+ orders, a create form that can never produce a duplicate order, and a hardened login. Written answers are in [DECISIONS.md](DECISIONS.md) and [SCALE.md](SCALE.md).

**Stack:** Next.js 16 (React 19, TypeScript, Tailwind, TanStack Query and Table, React Hook Form and Zod), NestJS 11, MongoDB (local), argon2id, JWT in an httpOnly cookie.

```
backend/    NestJS API, port 3001
frontend/   Next.js app, port 3000. It proxies /api/* to the backend, so the browser sees one origin (no CORS, and the cookie works)
```

## Run it

**Prerequisites:** Node.js 22 or newer, and a MongoDB on `127.0.0.1:27017` without authentication. Nothing hosted is used.

No MongoDB yet? Install it from https://www.mongodb.com/docs/manual/installation/ (on a Mac: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb/brew/mongodb-community`). If you have Docker, `docker run -d --name orders-mongo -p 27017:27017 mongo` also works.

**Quick start**, from the repo root (macOS, Linux and Windows):

```bash
npm run setup   # installs both projects and creates backend/.env and frontend/.env (an existing .env is kept)
npm run seed    # drops and refills the database: 50,000 orders and 2 users
npm run dev     # API on http://localhost:3001 and web app on http://localhost:3000, in one terminal
```

Press Ctrl+C to stop both. The log lines are prefixed `[api]` and `[web]`.

**Or run each project by hand** (use `copy` instead of `cp` on Windows):

```bash
# 1. backend (terminal 1)
cd backend
cp .env.example .env
npm install
npm run seed          # compiles the backend, then inserts 50,000 orders and 2 users
npm run start:dev     # http://localhost:3001

# 2. frontend (terminal 2)
cd frontend
cp .env.example .env  # optional: BACKEND_URL already defaults to http://localhost:3001
npm install
npm run dev           # http://localhost:3000
```

Open http://localhost:3000 and sign in with a seeded user:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@test.local` | `Admin123!` |
| Agent | `agent@test.local` | `Agent123!` |

Only an admin can delete an order (an agent gets 403 from the server). Everything else works for both roles.

**Setup check** (log in, then read the list; on Windows use `curl.exe` and write each command on one line):

```bash
curl -i -c jar.txt -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@test.local","password":"Agent123!"}'
curl -b jar.txt 'http://localhost:3001/api/orders?limit=2'
```

The first call answers `200` and sets an `HttpOnly` cookie. The second returns two orders and a `nextCursor`.

Things to know:
- `npm run seed` first **drops the users and orders** in the database named by `MONGODB_URI`, then inserts the data. It also rebuilds `dist/`, so do not run it while `npm run start:dev` is running.
- Ports 3000 and 3001 must be free. To use other ports, run the projects by hand: set `PORT` in `backend/.env` and `BACKEND_URL` in `frontend/.env`, and start the frontend with `npm run dev -- -p <port>`.
- If MongoDB is not running, the API prints `Unable to connect to the database. Retrying (1)` up to nine times and exits with an error after about 70 seconds. Start MongoDB and run the command again.

## Tests

```bash
cd backend
npm run lint
npm test                # 102 unit tests
npm run test:e2e        # 152 end-to-end tests
npm run test:duplicate  # the R2 proof, see below

cd ../frontend
npm run lint
npm run typecheck
npm test                # 99 tests
```

The end-to-end tests use their own database, `orders_console_test`, and refuse to run against any database whose name does not end in `_test`, so they never touch your data.

**The R2 proof** (`npm run test:duplicate`) fires the same create request in parallel against the real database and counts the orders:

```
2 parallel requests -> statuses [200,201], same order id: true, orders in the database for this key: 1
10 parallel requests -> 1 created, 9 replayed, orders in the database for this key: 1
```

The frontend has a test for the rapid-filter case: request 1 resolves after 500 ms, request 2 after 50 ms, request 3 after 200 ms, and the table must show request 3.

## What was built

| Area | What it does |
|---|---|
| Login | `POST /api/login` sets an httpOnly, SameSite=Strict cookie. Logout ends the session on every device. |
| Orders list (R1) | Search by customer name or email (any word, matched at the start of a word), status filter, sort by date or amount, cursor pagination (Next / Previous, 50 per page). Details open in a dialog. |
| Create order (R2) | A dialog form validated on the client (Zod) and the server. The total is computed from the items, never typed. An idempotency key makes retries and double-clicks safe. |
| Stats card (optional O1) | `GET /api/orders/stats` waits 3 to 6 seconds on purpose. The card never blocks the page, cancels when you leave, and shows one Retry if it fails. |
| Delete | Admin only, enforced by the server. The UI hides the button for agents as a convenience. |

API (all under `/api`): `POST /login`, `POST /logout`, `GET /me`, `GET /orders`, `POST /orders` (needs an `Idempotency-Key` header), `GET /orders/stats`, `DELETE /orders/:id`.

## R1: indexes and evidence

Indexes on `orders`:

| Index | Used for |
|---|---|
| `createdAt_-1__id_-1` | newest-first list, date sort, cursor |
| `totalMinor_-1__id_-1` | amount sort |
| `status_1_createdAt_-1__id_-1` | status filter with date sort |
| `status_1_totalMinor_-1__id_-1` | status filter with amount sort |
| `createdBy_1_idempotencyKey_1` (unique, partial) | the R2 guarantee |
| `customerName_1`, `customerEmail_1` | exact lookups (see the note below the table) |

`explain("executionStats")` on 50,006 orders:

| Query | Index chosen | Keys examined | Time |
|---|---|---|---|
| newest page (51 rows) | `createdAt_-1__id_-1` | 51 | 2 ms |
| a page 30,000 rows deep, by cursor | `createdAt_-1__id_-1` | 51 | 2 ms |
| the same page with `skip(30000)` | `createdAt_-1__id_-1` | 30,051 | 8 ms |
| status = paid, amount descending | `status_1_totalMinor_-1__id_-1` | 51 | 5 ms |
| status = paid, date descending | `status_1_createdAt_-1__id_-1` | 51 | 0 ms |
| search "smith" (name or email), newest | `createdAt_-1__id_-1` | 11,689 | 50 ms |
| idempotency replay lookup | none (collection scan) | 50,006 documents | 7 ms |

Two honest notes on that table:
- **Search** walks the date index and filters, so its cost grows with the table. The name and email indexes are not chosen by the planner for this query. They help exact lookups only.
- **The replay lookup is a collection scan.** The unique index is *partial* (`idempotencyKey` must be a string), and MongoDB cannot prove an equality on a string satisfies `$type: "string"`, so it will not use the index to read the existing order back. This happens only when a duplicate request arrives (the insert itself still uses the index, so the guarantee holds). I tested in a scratch database that defining the partial filter as `{ idempotencyKey: { $exists: true } }` makes the planner use the index. I did not change the live index at the last minute because it needs a re-seed on existing databases. It is the first item in [SCALE.md](SCALE.md).

## Code review findings (the contractor's auth middleware)

| # | Problem found | What I changed | Status |
|---|---|---|---|
| 1 | Hardcoded secret `"sarh-secret-2026"` in the source | `JWT_SECRET` comes from the environment, must be at least 32 characters, and a value starting with `change-me` is rejected in production. `.env` is git-ignored; `.env.example` is committed. | Fixed |
| 2 | `jwt.decode` reads the token without verifying the signature, so anyone can forge one | `verifyAsync` with the secret and a fixed algorithm (`HS256`). A token signed with another secret is rejected (tested). | Fixed |
| 3 | The token is accepted from `req.query.token`, which leaks it into logs, history and referrers | The token is read only from the httpOnly cookie. The query string and the `Authorization` header are ignored (both tested). | Fixed |
| 4 | The admin check lives only in the React `AdminOnly` component, so the API is open | A server-side `RolesGuard` with `@Roles(Admin)` on `DELETE /api/orders/:id`. An agent gets 403 (tested). The UI check is only a convenience. | Fixed |
| 5 | Passwords stored and compared in plain text | argon2id hashes. The seed script hashes too. | Fixed |
| 6 | The login query uses the request body directly, which allows Mongo operator injection such as `{ "$ne": null }` | Request bodies are validated (strings only, unknown fields rejected). An operator object gets 400 (tested). | Fixed |
| 7 | The token never expires | Tokens and the cookie last one hour (`JWT_EXPIRES_IN_SECONDS`). Expired tokens are rejected (tested). | Fixed |
| 8 | The role is frozen inside the token, so a demoted or disabled user keeps access | The token carries only the user id and a token version. The role and the active flag are read from the database on every request, so a role change applies at once. Logout raises the version and ends the session everywhere. | Fixed |
| 9 | No protection against brute force | Two limits: 5 attempts a minute per email and IP, and 30 a minute per IP. The response time still differs slightly between an unknown email and a wrong password (a dummy hash would hide it). I chose not to add one. | **Partly** |
| 10 | Fragile header parsing (`split(" ")[1]`) | There is no header parsing at all, because the token lives in the cookie. | Fixed |
| 11 | `DELETE` is unprotected, takes any id, and always answers `{ ok: true }` | Admin only, the id must be a valid ObjectId (400), 404 when missing, 204 on success, and the deletion is logged with who did it. | Fixed |
| 12 | `req.user` is untyped | A typed `AuthUser` and a `@CurrentUser()` decorator. | Fixed |

Also added beyond the list: `helmet` security headers (the `X-Powered-By` header is removed), and the auth tests refuse to run on a database whose name does not end in `_test`.

## Where the token is stored

The token lives in an `httpOnly`, `SameSite=Strict` cookie, never in `localStorage` or in JavaScript. That means a cross-site script cannot read and steal the token, and other sites cannot make the browser send it (which also blocks CSRF). It does not stop a script that already runs on the page from making requests as the user while the page is open, and it does not protect a stolen, unlocked device.

## Product question: "Delete all cancelled orders"

1. Why do you need it: clutter in the list, reports, storage, or a legal reason? A filter or a report might solve it without deleting anything.
2. Do you ever need cancelled orders later (refunds, disputes, accounting, audits)? A deleted order cannot be recovered.
3. Who may press it, and should it show the number of orders before it acts?
4. If she cannot answer, I would build a soft delete instead: mark cancelled orders as archived (a flag and a date), hide them from the default list, and keep them recoverable. An admin-only "archive cancelled orders older than N days" action would show the count first.
5. Either way: a confirmation and an audit record of who did it. A real hard delete only under an agreed retention rule.

## Time spent

Around 6 hours.
