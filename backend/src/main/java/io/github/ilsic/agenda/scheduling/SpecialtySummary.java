package io.github.ilsic.agenda.scheduling;

import java.util.List;

/** A specialty with the doctors who practise it, so a patient can look for a doctor by name. */
record SpecialtySummary(long id, String name, List<String> doctors) {

  static SpecialtySummary of(Specialty specialty, List<String> doctors) {
    return new SpecialtySummary(specialty.id(), specialty.name(), doctors);
  }
}
