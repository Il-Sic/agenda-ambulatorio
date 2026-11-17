package io.github.ilsic.agenda.booking;

import jakarta.persistence.Embeddable;
import java.time.Instant;

/** The period of one visit. The end is exclusive: a slot ending at 09:30 leaves 09:30 free. */
@Embeddable
public record Slot(Instant startsAt, Instant endsAt) {}
