package io.github.ilsic.agenda.scheduling;

record SpecialtySummary(long id, String name) {

  static SpecialtySummary of(Specialty specialty) {
    return new SpecialtySummary(specialty.id(), specialty.name());
  }
}
