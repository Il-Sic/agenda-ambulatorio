package io.github.ilsic.agenda.shared;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * The shape of every error body, for the API documentation. The bodies themselves are Spring's
 * {@code ProblemDetail}; this record only describes them to clients.
 */
@Schema(description = "RFC 9457 Problem Details. `type` tells the kinds of error apart.")
public record Problem(
    @Schema(requiredMode = REQUIRED, example = "/problems/slot-not-available") String type,
    @Schema(requiredMode = REQUIRED) String title,
    @Schema(requiredMode = REQUIRED) int status,
    @Schema(requiredMode = REQUIRED) String detail,
    @Schema(requiredMode = REQUIRED) String instance,
    @Schema(description = "Only for /problems/validation: the fields that were rejected")
        List<InvalidField> errors) {

  public record InvalidField(String field, String message) {}
}
