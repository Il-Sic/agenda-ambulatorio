# 2. The database forbids double booking

Status: accepted

## Context

The one rule that must never break: the same doctor cannot have two appointments at the same
time. A check in application code ("is the slot free? then insert") is not enough. Two requests
can both see the slot as free and both insert.

## Decision

Enforce the rule with a PostgreSQL exclusion constraint on the `appointment` table:

```sql
CONSTRAINT appointment_no_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status <> 'CANCELLED')
```

- Two rows conflict when they have the same doctor **and** overlapping periods.
- `'[)'` makes the end exclusive, so 09:00–09:30 and 09:30–10:00 do not conflict.
- The `WHERE` clause leaves cancelled appointments out, so a cancelled slot can be booked again.
- `btree_gist` is required to use plain equality (`doctor_id`) inside a GiST index.

The application still checks that a slot is free before inserting, to give a friendly answer in
the normal case. The constraint is what guarantees the rule.

## What happens when requests race

Measured with `ConcurrentBookingTest`: twelve requests for the same slot released at the same
instant, repeated thirty times. Exactly one booking was created every time.

- Usually the losing insert waits for the winning transaction and then fails with SQLSTATE
  `23P01` (exclusion violation).
- Sometimes two rows are written before either is checked. Each transaction then waits for the
  other, and PostgreSQL breaks the deadlock by aborting one of them with `40P01`. In that
  artificial race this happened to roughly one losing request in five, each after waiting
  `deadlock_timeout` (one second by default).
- `BookingService` translates both codes into "slot not available" (HTTP 409).
- With the constraint removed, the same test lets ten of the twelve requests through: the check
  in application code is not enough on its own.

## Consequences

- The rule holds for every writer: the API, a script, a manual `INSERT`.
- It compares periods, not start times: it stays correct if visit lengths change or differ
  between doctors.
- The schema depends on PostgreSQL. Accepted: the project already relies on it.
- The application must translate two database errors, not one, into a clear "slot no longer
  available" answer.
- A request that loses through a deadlock answers about a second later than the others.

## Alternatives considered

- **Unique index on `(doctor_id, starts_at)`.** Only works while every slot sits on one fixed
  grid; a 20-minute visit at 09:10 could overlap a 30-minute one at 09:00.
- **Pessimistic lock on the doctor row.** Correct only if every code path remembers to take it.
- **`SERIALIZABLE` transactions.** Correct, but every transaction must be ready to retry.
