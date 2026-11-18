package io.github.ilsic.agenda.booking;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** The e-mail that proves the booking is yours, and the start of the slot to move it to. */
record ReschedulingRequest(@NotBlank @Email String email, @NotNull Instant startsAt) {}
