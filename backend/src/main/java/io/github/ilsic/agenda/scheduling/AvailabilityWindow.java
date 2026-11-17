package io.github.ilsic.agenda.scheduling;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.DayOfWeek;
import java.time.LocalTime;

record AvailabilityWindow(
    long id,
    DayOfWeek dayOfWeek,
    @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "09:00") LocalTime startTime,
    @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "13:00") LocalTime endTime,
    int slotMinutes) {

  static AvailabilityWindow of(WeeklyAvailability availability) {
    return new AvailabilityWindow(
        availability.id(),
        availability.dayOfWeek(),
        availability.startTime(),
        availability.endTime(),
        availability.slotMinutes());
  }
}
