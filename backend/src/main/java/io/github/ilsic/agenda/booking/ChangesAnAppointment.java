package io.github.ilsic.agenda.booking;

import io.github.ilsic.agenda.shared.Problem;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.http.MediaType;

/** Documents, once, the answers shared by every staff action on an appointment. */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@ApiResponse(responseCode = "200", description = "The appointment after the change")
@ApiResponse(
    responseCode = "404",
    description = "Unknown appointment (type /problems/appointment-not-found)",
    content =
        @Content(
            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
            schema = @Schema(implementation = Problem.class)))
@ApiResponse(
    responseCode = "409",
    description =
        "The change makes no sense for the appointment as it is now (type"
            + " /problems/appointment-state), or someone else changed it first (type"
            + " /problems/concurrent-update)",
    content =
        @Content(
            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
            schema = @Schema(implementation = Problem.class)))
@interface ChangesAnAppointment {}
