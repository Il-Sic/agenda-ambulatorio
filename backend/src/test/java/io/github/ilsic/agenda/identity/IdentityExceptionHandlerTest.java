package io.github.ilsic.agenda.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

class IdentityExceptionHandlerTest {

  @RestController
  static class SignInWhileTheDatabaseIsDown {

    @PostMapping("/sign-in")
    void signIn() {
      throw new InternalAuthenticationServiceException("connection refused: db-internal-host");
    }
  }

  private final MockMvcTester mvc =
      MockMvcTester.of(
          List.of(new SignInWhileTheDatabaseIsDown()),
          builder -> builder.setControllerAdvice(new IdentityExceptionHandler()).build());

  @Test
  void aSignInThatFailsForTechnicalReasonsIsNotBlamedOnTheCredentials() {
    MvcTestResult result = mvc.post().uri("/sign-in").exchange();

    assertThat(result).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(result).bodyJson().extractingPath("$.type").isEqualTo("/problems/unexpected");
    assertThat(result).bodyText().doesNotContain("db-internal-host");
  }
}
