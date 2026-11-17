package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.shared.Problem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Booking", description = "What a patient can do without an account")
class BookingController {

  private static final String PROBLEM = MediaType.APPLICATION_PROBLEM_JSON_VALUE;

  private final BookingService bookings;

  BookingController(BookingService bookings) {
    this.bookings = bookings;
  }

  @GetMapping("/doctors/{doctorId}/slots")
  @Operation(
      summary = "List the free slots of a doctor",
      description = "Both days are included and are meant in the clinic's time zone.")
  @ApiResponse(responseCode = "200", description = "Free slots, earliest first")
  @ApiResponse(
      responseCode = "400",
      description = "Period reversed or longer than 31 days (type /problems/invalid-period)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  @ApiResponse(
      responseCode = "404",
      description = "Unknown doctor (type /problems/doctor-not-found)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  List<Slot> freeSlots(
      @PathVariable long doctorId, @RequestParam LocalDate from, @RequestParam LocalDate to) {
    return bookings.freeSlots(doctorId, from, to);
  }

  @PostMapping("/bookings")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Book a slot")
  @ApiResponse(responseCode = "201", description = "Booked")
  @ApiResponse(
      responseCode = "400",
      description = "Invalid input (type /problems/validation, with the list of fields)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  @ApiResponse(
      responseCode = "409",
      description = "The slot is not offered or was just taken (type /problems/slot-not-available)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  BookingDetails book(@Valid @RequestBody BookingRequest request) {
    return bookings.book(request);
  }

  @PostMapping("/bookings/{code}/lookup")
  @Operation(summary = "Show a booking, given its code and the e-mail used to book")
  @ApiResponse(responseCode = "200", description = "The booking")
  @ApiResponse(
      responseCode = "404",
      description = "Wrong code or wrong e-mail (type /problems/booking-not-found)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  BookingDetails find(@PathVariable String code, @Valid @RequestBody EmailRequest request) {
    return bookings.find(code, request.email());
  }

  @PostMapping("/bookings/{code}/cancellation")
  @Operation(summary = "Cancel a booking, given its code and the e-mail used to book")
  @ApiResponse(responseCode = "200", description = "The cancelled booking")
  @ApiResponse(
      responseCode = "404",
      description = "Wrong code or wrong e-mail (type /problems/booking-not-found)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  @ApiResponse(
      responseCode = "409",
      description = "Already cancelled or already started (type /problems/appointment-state)",
      content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = Problem.class)))
  BookingDetails cancel(@PathVariable String code, @Valid @RequestBody EmailRequest request) {
    return bookings.cancel(code, request.email());
  }
}
