package io.github.ilsic.agenda.scheduling;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

record ClosureRequest(@NotNull LocalDate day, @NotBlank @Size(max = 200) String reason) {}
