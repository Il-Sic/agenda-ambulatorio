# 7. The waiting room calls numbers, and screens ask for news

Status: accepted

## Context

When the doctor is ready, someone has to tell the patient. A name called out across a waiting
room, or shown on a screen, tells strangers who is seeing which specialist: in a clinic that is
health data. Many clinics hand out a number at the desk and show the number instead.

Two things must learn about a call within seconds: the screen in the waiting room, and the
patient's own phone, if the booking is open on it.

## Decision

- **A number per day, given at the desk.** A patient who arrives on the day of the visit takes
  the next number of that day (`Appointment.markArrived`). Recording the arrival again keeps the
  number; an arrival recorded on a later day, for the books, gets none.
- **One row per day hands the numbers out.** `INSERT … ON CONFLICT (day) DO UPDATE SET
  last_number = last_number + 1 RETURNING last_number` (`CallNumbers`) runs inside the arrival's
  transaction. Arrivals at the same moment queue on that row and get different numbers; an
  arrival that is rolled back gives its number back, so there are no gaps. A unique constraint
  on day and number stays in the schema as the last word.
- **The screen is public and shows no name.** `GET /api/v1/waiting-room/calls` returns today's
  five latest calls: number, room, floor, specialty and time. Nothing in it identifies a patient,
  so the screen needs no account; the test compares the whole JSON, so a field added by mistake
  fails it.
- **Screens ask every few seconds.** The waiting room screen asks every 3 seconds; the patient's
  page every 5, and only on the day of the visit, until the call. Server-Sent Events or
  WebSockets would bring the delay to nothing, but they hold a connection open per screen
  through nginx and, with more than one backend instance, need a way to share the news between
  instances. For one screen and a few phones, an indexed query every few seconds is simpler, and
  survives restarts and network drops without a line of code.
- **Where to go is said the way the ticket says it.** A doctor has a room and a floor; the screen
  adds the line to follow: "Primo piano, segui la linea rossa". The split-flap tiles use the
  ticket's monospaced face: the screen is the clinic's other physical object (ADR 6).

## Consequences

- A call reaches the screen in about three seconds at most, and the phone in about five.
- The screen's query reads a partial index on day and call time: it costs next to nothing,
  however many screens ask.
- There is no "visit over" state, so the phone shows the call for a quarter of an hour, or until
  the end of the visit if that is later.
- Moving to push later would change how screens hear about calls, not the model behind them.
