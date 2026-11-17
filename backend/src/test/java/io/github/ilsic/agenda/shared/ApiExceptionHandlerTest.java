package io.github.ilsic.agenda.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

class ApiExceptionHandlerTest {

  @RestController
  static class ChangedBySomeoneElse {

    @PostMapping("/stale")
    void change() {
      throw new OptimisticLockingFailureException("row was updated by another transaction");
    }
  }

  private final MockMvcTester mvc =
      MockMvcTester.of(
          List.of(new ChangedBySomeoneElse()),
          builder -> builder.setControllerAdvice(new ApiExceptionHandler()).build());

  @Test
  void tellsTheClientWhenSomeoneElseChangedTheSameDataFirst() {
    assertThat(mvc.post().uri("/stale"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/concurrent-update");
  }
}
