package io.github.ilsic.agenda;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Keeps {@code docs/openapi.json} in step with the code. The frontend generates its API types from
 * that file, so a forgotten update would be caught here instead of at runtime.
 */
@IntegrationTest
class OpenApiSpecTest {

  private static final Path COMMITTED_SPEC = Path.of("..", "docs", "openapi.json");

  @Autowired MockMvcTester mvc;

  @Test
  void theCommittedSpecDescribesTheCurrentApi() throws Exception {
    String currentSpec =
        mvc.get()
                .uri("/v3/api-docs")
                .exchange()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8)
            + "\n";
    if (Boolean.getBoolean("openapi.update")) {
      Files.writeString(COMMITTED_SPEC, currentSpec);
    }

    assertThat(COMMITTED_SPEC)
        .as(
            "docs/openapi.json is out of date. Regenerate it with:"
                + " ./mvnw test -Dtest=OpenApiSpecTest -Dopenapi.update=true")
        .exists()
        .hasContent(currentSpec);
  }
}
