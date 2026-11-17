package io.github.ilsic.agenda.scheduling;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.DayOfWeek;

/** Stores weekdays as ISO numbers (Monday = 1 … Sunday = 7), the same PostgreSQL's ISODOW uses. */
@Converter(autoApply = true)
class IsoDayOfWeekConverter implements AttributeConverter<DayOfWeek, Short> {

  @Override
  public Short convertToDatabaseColumn(DayOfWeek day) {
    return day == null ? null : (short) day.getValue();
  }

  @Override
  public DayOfWeek convertToEntityAttribute(Short isoNumber) {
    return isoNumber == null ? null : DayOfWeek.of(isoNumber);
  }
}
