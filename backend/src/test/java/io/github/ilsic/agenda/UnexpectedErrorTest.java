package io.github.ilsic.agenda;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Runs on a real HTTP port: what happens to an exception nobody handles is decided by the servlet
 * container's error dispatch, which a mock request never goes through.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "agenda.outbox.scheduling.enabled=false")
@Import({
  TestcontainersConfiguration.class,
  TestClockConfiguration.class,
  UnexpectedErrorTest.BrokenEndpoint.class
})
class UnexpectedErrorTest {

  /** A public endpoint that fails the way a bug or a lost database connection would. */
  @RestController
  static class BrokenEndpoint {

    @GetMapping("/api/v1/doctors/0/broken")
    void fail() {
      throw new IllegalStateException("an internal detail nobody outside should read");
    }
  }

  @Value("${local.server.port}")
  int port;

  @Test
  void aFailureNobodyHandledIsAServerErrorAndNotASignInProblem() throws Exception {
    HttpRequest request =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/doctors/0/broken"))
            .build();

    HttpResponse<String> response =
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(500);
    assertThat(response.headers().firstValue("Content-Type").orElse(""))
        .startsWith("application/problem+json");
    assertThat(JsonPath.<String>read(response.body(), "$.type")).isEqualTo("/problems/unexpected");
    assertThat(JsonPath.<String>read(response.body(), "$.instance"))
        .isEqualTo("/api/v1/doctors/0/broken");
    assertThat(response.body()).doesNotContain("internal detail");
  }
}
