package io.github.ilsic.agenda.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Locale;

/** Contact details given when booking. Patients have no account. */
@Embeddable
public record Patient(
    @Column(name = "patient_name") String name,
    @Column(name = "patient_email") String email,
    @Column(name = "patient_phone") String phone) {

  public Patient {
    name = name.strip();
    email = email.strip().toLowerCase(Locale.ROOT);
    phone = phone.strip();
  }
}
