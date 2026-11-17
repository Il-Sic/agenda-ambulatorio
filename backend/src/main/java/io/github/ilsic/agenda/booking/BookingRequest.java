package io.github.ilsic.agenda.booking;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

record BookingRequest(
    @NotNull Long doctorId,
    @NotNull Instant startsAt,
    @NotBlank @Size(max = 120) String patientName,
    @NotBlank @Email @Size(max = 254) String patientEmail,
    @NotBlank @Pattern(regexp = "\\+?[0-9 ]{6,20}") String patientPhone) {

  Patient patient() {
    return new Patient(patientName, patientEmail, patientPhone);
  }
}
