package io.github.ilsic.agenda.scheduling;

import io.github.ilsic.agenda.shared.Problem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Reading is open to all staff. Changing the schedule is reserved to administrators. */
@RestController
@RequestMapping("/api/v1/staff")
@Tag(name = "Staff schedule", description = "Weekly availability of doctors and closure days")
class StaffScheduleController {

  private static final String ADMIN_ONLY = "hasRole('ADMIN')";
  private static final String PROBLEM = MediaType.APPLICATION_PROBLEM_JSON_VALUE;

  private final DoctorDirectory doctors;
  private final ScheduleService schedule;

  StaffScheduleController(DoctorDirectory doctors, ScheduleService schedule) {
    this.doctors = doctors;
    this.schedule = schedule;
  }

  @GetMapping("/doctors")
  @Operation(summary = "List every doctor")
  List<DoctorSummary> doctors() {
    return doctors.all();
  }

  @GetMapping("/doctors/{doctorId}/availability")
  @Operation(summary = "List the weekly availability of a doctor")
  List<AvailabilityWindow> availability(@PathVariable long doctorId) {
    return schedule.availabilityOf(doctorId);
  }

  @PostMapping("/doctors/{doctorId}/availability")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize(ADMIN_ONLY)
  @Operation(summary = "Add a weekly availability window (admin)")
  @ApiResponse(responseCode = "201", description = "The new window")
  @ApiResponse(
      responseCode = "400",
      description =
          "Ends before it starts or is shorter than one visit (type"
              + " /problems/invalid-availability)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  @ApiResponse(
      responseCode = "409",
      description = "Overlaps another window of that weekday (type /problems/availability-overlap)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  AvailabilityWindow addAvailability(
      @PathVariable long doctorId, @Valid @RequestBody AvailabilityRequest request) {
    return schedule.addAvailability(doctorId, request);
  }

  @DeleteMapping("/availability/{availabilityId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize(ADMIN_ONLY)
  @Operation(summary = "Remove a weekly availability window (admin)")
  void removeAvailability(@PathVariable long availabilityId) {
    schedule.removeAvailability(availabilityId);
  }

  @GetMapping("/closures")
  @Operation(summary = "List today's and future closure days")
  List<Closure> closures() {
    return schedule.upcomingClosures();
  }

  @PostMapping("/closures")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize(ADMIN_ONLY)
  @Operation(summary = "Close the clinic on a day (admin)")
  @ApiResponse(responseCode = "201", description = "The new closure day")
  @ApiResponse(
      responseCode = "409",
      description = "The day is already closed (type /problems/closure-exists)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  Closure close(@Valid @RequestBody ClosureRequest request) {
    return schedule.close(request);
  }

  @DeleteMapping("/closures/{closureId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize(ADMIN_ONLY)
  @Operation(summary = "Reopen a closed day (admin)")
  void reopen(@PathVariable long closureId) {
    schedule.reopen(closureId);
  }
}
