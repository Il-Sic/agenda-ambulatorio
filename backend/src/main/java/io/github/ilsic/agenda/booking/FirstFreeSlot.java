package io.github.ilsic.agenda.booking;

import java.time.Instant;

/** The earliest visit a patient can book in a specialty, and with which of its doctors. */
record FirstFreeSlot(long specialtyId, long doctorId, Instant startsAt, Instant endsAt) {}
