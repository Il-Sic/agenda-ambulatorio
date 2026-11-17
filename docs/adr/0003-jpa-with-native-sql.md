# 3. JPA for entities, native SQL where it matters

Status: accepted

## Context

Most of the persistence code is simple: load an entity, change it, save it. Two operations are
different. Finding free slots means expanding weekly availability into time slots and removing
the taken ones. Reading the outbox needs row locking that skips rows another worker holds.

## Decision

- Use Spring Data JPA for entities and straightforward queries.
- Write the two special queries in SQL with Spring's `JdbcClient`:
  - `FreeSlotFinder`: `generate_series`, `AT TIME ZONE` and `tstzrange` build and filter the
    slots in one statement.
  - the outbox reader: `SELECT … FOR UPDATE SKIP LOCKED`.
- Liquibase owns the schema. Hibernate only validates it (`ddl-auto: validate`).

Both styles use the same connection and the same transaction.

## Consequences

- Each tool is used for what it is good at; the SQL is short and readable as SQL.
- Time zone rules, including daylight saving time, are applied by PostgreSQL. No date
  arithmetic in Java to get wrong.
- The SQL is PostgreSQL-specific and is not checked by the compiler. Every native query has
  integration tests against a real PostgreSQL (Testcontainers).
- Hibernate does not flush pending changes before a JDBC query. The code never relies on reading
  through JDBC what it has just written through JPA in the same transaction.

## Alternatives considered

- **JPQL / Criteria only.** No `generate_series`, range types or `SKIP LOCKED`.
- **Generate the slots in Java.** More code and three queries instead of one, with the time zone
  logic duplicated outside the database.
- **JDBC everywhere.** A lot of mapping code for plain CRUD.
