# Scaling memo

**Scenario:** 5 million orders, three developers, agents in two countries all day. Numbers below were measured on 50,006 orders.

## What I would change

1. **Stats.** `GET /api/orders/stats` counts the whole collection on every request. At 5M that is a real scan. I would keep counters updated on each write, or a periodic roll-up, so the card reads a few numbers, with a short-lived Redis cache in front if it still feels slow. A cache alone only hides the scan, and the first request after each expiry would still pay for it.
2. **Search.** The word-start match examined 11,689 entries for "smith" (50 ms), and the cost grows with the table, about 100 times more at 5M. I would store normalised word tokens in an indexed array, require two or three characters, and cap the scan.
3. **The replay lookup.** The duplicate-request path reads the stored order back with a collection scan, because the partial unique index is declared with `$type`. `$exists: true` fixes it (checked in a scratch database). I would also let keys expire and state the new limit.
4. **Login limits** are counted in memory, per process, so behind several instances they multiply. They need a shared store such as Redis.
5. **Two countries.** An API and a nearby read replica per region for lists and search. Creates still go to the primary and pay one round trip.
6. **Deletes.** Replace the hard delete and log line with an `archivedAt` flag and an audit record in the database.
7. **Operating it.** CI on every push (unit, end-to-end, duplicate proof), structured logs with a request id, and a readiness endpoint (I removed the health route for this exercise).

## What I would deliberately keep

- **Cursor pagination:** 51 keys against 30,051 for `skip` at 30,000 rows deep. The gap only grows.
- **The idempotency guarantee in a unique index.** It holds across any number of API instances.
- **The repository layer.** Only two classes touch Mongoose.
- **The cookie session with the role read from the database.** A revoked user or a role change applies on the next request.

## What I would refuse to build

- **"Delete all cancelled orders" without answers** about why, who, and what must be kept. I would offer an archive with a count and an audit record.
- **A client-typed amount.** Two sources of truth for money.
- **Page numbers and "jump to page 4,000".** They force `skip` and show rows twice while orders arrive.

