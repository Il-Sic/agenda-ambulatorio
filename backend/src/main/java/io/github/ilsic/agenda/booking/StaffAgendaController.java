package io.github.ilsic.agenda.booking;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff")
@Tag(name = "Staff agenda", description = "The day's visits and what happened to them")
class StaffAgendaController {

  private final AgendaService agenda;

  StaffAgendaController(AgendaService agenda) {
    this.agenda = agenda;
  }

  @GetMapping("/agenda")
  @Operation(summary = "List the appointments of a day, earliest first")
  List<AgendaEntry> day(
      @RequestParam LocalDate date, @RequestParam(required = false) Long doctorId) {
    return agenda.day(date, doctorId);
  }

  @GetMapping("/day-plan")
  @Operation(
      summary = "Draw a day for the front desk",
      description =
          "Every doctor with the hours they receive that day, the slots still free and the"
              + " appointments, cancelled ones included. Free slots are offered only from now to"
              + " the end of the 90-day booking horizon; a closure day has no hours.")
  DayPlan dayPlan(@RequestParam LocalDate date) {
    return agenda.plan(date);
  }

  @PostMapping("/appointments/{id}/arrival")
  @Operation(summary = "Record that the patient has arrived")
  @ChangesAnAppointment
  AgendaEntry markArrived(@PathVariable long id) {
    return agenda.markArrived(id);
  }

  @PostMapping("/appointments/{id}/call")
  @Operation(
      summary = "Call the patient to the doctor's room",
      description =
          "Puts the number the patient took on arrival on the waiting room screen. Only a patient"
              + " who arrived today can be called; calling again brings the number back on top.")
  @ChangesAnAppointment
  AgendaEntry call(@PathVariable long id) {
    return agenda.call(id);
  }

  @PostMapping("/appointments/{id}/no-show")
  @Operation(summary = "Record that the patient did not show up")
  @ChangesAnAppointment
  AgendaEntry markNoShow(@PathVariable long id) {
    return agenda.markNoShow(id);
  }

  @PostMapping("/appointments/{id}/cancellation")
  @Operation(summary = "Cancel a visit that has not started yet")
  @ChangesAnAppointment
  AgendaEntry cancel(@PathVariable long id) {
    return agenda.cancel(id);
  }
}
