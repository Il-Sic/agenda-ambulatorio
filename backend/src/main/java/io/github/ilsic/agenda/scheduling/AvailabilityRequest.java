package io.github.ilsic.agenda.scheduling;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalTime;

record AvailabilityRequest(
    @NotNull DayOfWeek dayOfWeek,
    @NotNull @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "09:00")
        LocalTime startTime,
    @NotNull @JsonFormat(pattern = "HH:mm") @Schema(type = "string", example = "13:00")
        LocalTime endTime,
    @NotNull @Min(5) @Max(240) Integer slotMinutes) {}
