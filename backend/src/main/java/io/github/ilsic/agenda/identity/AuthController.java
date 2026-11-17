package io.github.ilsic.agenda.identity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(
    name = "Authentication",
    description =
        "Staff sign in by posting `username` and `password` as a form to /api/v1/auth/login"
            + " and sign out by posting to /api/v1/auth/logout. Both answer 204.")
class AuthController {

  private final StaffUserRepository users;

  AuthController(StaffUserRepository users) {
    this.users = users;
  }

  @GetMapping("/me")
  @Operation(summary = "Who is signed in. Answers 401 when nobody is.")
  CurrentUser me(Authentication authentication) {
    return users.findByUsername(authentication.getName()).map(CurrentUser::of).orElseThrow();
  }
}
