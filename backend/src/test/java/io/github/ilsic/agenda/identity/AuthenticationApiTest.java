package io.github.ilsic.agenda.identity;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@IntegrationTest
class AuthenticationApiTest {

  @Autowired MockMvcTester mvc;
  @Autowired TestData data;

  @BeforeEach
  void setUp() {
    data.reset();
    data.staffUser("anna", "Anna Russo", "STAFF", "correct-horse-battery");
  }

  @Test
  void aVisitorWhoHasNotSignedInHasNoIdentity() {
    assertThat(mvc.get().uri("/api/v1/auth/me"))
        .hasStatus(HttpStatus.UNAUTHORIZED)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/unauthenticated");
  }

  @Test
  void signsInAndKeepsTheUserInTheSession() {
    MvcTestResult login = signIn("anna", "correct-horse-battery");

    assertThat(login).hasStatus(HttpStatus.NO_CONTENT);
    assertThat(mvc.get().uri("/api/v1/auth/me").session(sessionOf(login)))
        .hasStatusOk()
        .bodyJson()
        .isLenientlyEqualTo(
            """
            {"username": "anna", "displayName": "Anna Russo", "role": "STAFF"}
            """);
  }

  @Test
  void rejectsAWrongPassword() {
    assertThat(signIn("anna", "not-the-password"))
        .hasStatus(HttpStatus.UNAUTHORIZED)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/bad-credentials");
  }

  @Test
  void answersAnUnknownUserExactlyLikeAWrongPassword() {
    assertThat(signIn("nobody", "correct-horse-battery"))
        .hasStatus(HttpStatus.UNAUTHORIZED)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/bad-credentials");
  }

  @Test
  void signingOutEndsTheSession() {
    MockHttpSession session = sessionOf(signIn("anna", "correct-horse-battery"));

    assertThat(mvc.post().uri("/api/v1/auth/logout").with(csrf()).session(session))
        .hasStatus(HttpStatus.NO_CONTENT);

    assertThat(mvc.get().uri("/api/v1/auth/me").session(session))
        .hasStatus(HttpStatus.UNAUTHORIZED);
  }

  private MvcTestResult signIn(String username, String password) {
    return mvc.post()
        .uri("/api/v1/auth/login")
        .with(csrf())
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .param("username", username)
        .param("password", password)
        .exchange();
  }

  private static MockHttpSession sessionOf(MvcTestResult result) {
    return (MockHttpSession) result.getRequest().getSession(false);
  }
}
