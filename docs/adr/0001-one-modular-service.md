# 1. One service, split into modules

Status: accepted

## Context

The application has four distinct concerns: who works when (`scheduling`), appointments
(`booking`), reliable event publishing (`outbox`) and e-mails (`notification`). They change for
different reasons, but the project is small, has one team and one database.

## Decision

Build a single Spring Boot service. Each concern is a top-level package under
`io.github.ilsic.agenda` and is treated as a module:

- A module declares the modules it may use in its `package-info.java`
  (`@ApplicationModule(allowedDependencies = …)`).
- `ModularityTest` runs Spring Modulith's `verify()` on every build. A forbidden dependency or a
  cycle fails the build.
- Inside a module, classes are package-private unless another module needs them.
- Modules refer to each other's data by id (an appointment stores `doctorId`, not a `Doctor`).

All modules share one PostgreSQL database. Each table is written by exactly one module.

## Consequences

- One thing to build, run and debug; `docker compose up` starts everything.
- The boundaries are real: breaking one fails a test, not a code review.
- A module can later be extracted into its own service along a boundary that already exists.
- Known exception: the free-slot query in `booking` reads the availability tables owned by
  `scheduling`, because one SQL statement is simpler and faster than combining two results in
  Java. It only reads.

## Alternatives considered

- **Microservices.** Separate deployments, network calls and distributed transactions for a
  problem this size add cost without benefit.
- **Packages by layer** (`controller`, `service`, `repository`). Nothing stops any class from
  using any other, so the design erodes.
- **Maven multi-module build.** Boundaries enforced by the compiler, but more build ceremony
  than a test that takes one second.
