package io.github.ilsic.agenda.booking;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** The e-mail travels in the body, never in the URL, so it stays out of access logs. */
record EmailRequest(@NotBlank @Email String email) {}
