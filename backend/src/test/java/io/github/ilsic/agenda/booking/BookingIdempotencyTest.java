package io.github.ilsic.agenda.booking;

import static io.github.ilsic.agenda.TestCsrf.csrf;
import static java.time.DayOfWeek.MONDAY;
import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import io.github.ilsic.agenda.IntegrationTest;
import io.github.ilsic.agenda.TestData;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * A patient on a weak connection may send the same booking twice without knowing whether the first
 * attempt arrived. With an Idempotency-Key the second attempt gets the first one's answer.
 */
@IntegrationTest
class BookingIdempotencyTest {

  private static final String NINE = "2027-03-01T08:00:00Z";
  private static final String HALF_PAST_NINE = "2027-03-01T08:30:00Z";

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @Autowired TestData data;

  long doctor;

  @BeforeEach
  void setUp() {
    data.reset();
    doctor = data.doctor();
    data.availability(doctor, MONDAY, "09:00", "10:00", 30);
  }

  @Test
  void repeatingARequestWithTheSameKeyReturnsTheBookingAlreadyMade() throws Exception {
    MvcTestResult first = book("key-1", NINE, "giulia.bianchi@example.com");
    MvcTestResult second = book("key-1", NINE, "giulia.bianchi@example.com");

    assertThat(first).hasStatus(HttpStatus.CREATED);
    assertThat(second).hasStatus(HttpStatus.CREATED);
    assertThat(codeOf(second)).isEqualTo(codeOf(first));
    assertThat(count("appointment")).isEqualTo(1);
    assertThat(count("outbox_event")).isEqualTo(1);
  }

  @Test
  void withoutAKeyTheSecondAttemptFindsTheSlotTaken() {
    book(null, NINE, "giulia.bianchi@example.com");

    assertThat(book(null, NINE, "giulia.bianchi@example.com")).hasStatus(HttpStatus.CONFLICT);
  }

  @Test
  void aKeyCannotBeReusedForADifferentBooking() {
    book("key-1", NINE, "giulia.bianchi@example.com");

    assertThat(book("key-1", HALF_PAST_NINE, "giulia.bianchi@example.com"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/idempotency-key-reused");
    assertThat(count("appointment")).isEqualTo(1);
  }

  @Test
  void someoneElseTakingTheSlotIsStillAConflictWhateverTheKey() {
    book("key-1", NINE, "giulia.bianchi@example.com");

    assertThat(book("key-2", NINE, "marco.conti@example.com"))
        .hasStatus(HttpStatus.CONFLICT)
        .bodyJson()
        .extractingPath("$.type")
        .isEqualTo("/problems/slot-not-available");
  }

  @Test
  void retriesSentAtTheSameInstantCreateOneBookingAndAllGetIt() throws Exception {
    int retries = 8;
    CountDownLatch everyoneReady = new CountDownLatch(retries);
    CountDownLatch go = new CountDownLatch(1);
    List<MvcTestResult> results = new ArrayList<>();
    try (ExecutorService pool = Executors.newFixedThreadPool(retries)) {
      List<Future<MvcTestResult>> futures = new ArrayList<>();
      for (int i = 0; i < retries; i++) {
        futures.add(
            pool.submit(() -> {
              everyoneReady.countDown();
              go.await();
              return book("same-key", NINE, "giulia.bianchi@example.com");
            }));
      }
      everyoneReady.await();
      go.countDown();
      for (Future<MvcTestResult> future : futures) {
        results.add(future.get(30, TimeUnit.SECONDS));
      }
    }

    assertThat(results).allSatisfy(result -> assertThat(result).hasStatus(HttpStatus.CREATED));
    List<String> codes = new ArrayList<>();
    for (MvcTestResult result : results) {
      codes.add(codeOf(result));
    }
    assertThat(codes).containsOnly(codes.getFirst());
    assertThat(count("appointment")).isEqualTo(1);
    assertThat(count("outbox_event")).isEqualTo(1);
  }

  @Test
  void refusesAKeyThatIsUnreasonablyLong() {
    assertThat(book("k".repeat(101), NINE, "giulia.bianchi@example.com"))
        .hasStatus(HttpStatus.BAD_REQUEST);
  }

  private MvcTestResult book(String idempotencyKey, String startsAt, String email) {
    var request =
        mvc.post()
            .uri("/api/v1/bookings")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"doctorId": %d, "startsAt": "%s", "patientName": "Giulia Bianchi",
                 "patientEmail": "%s", "patientPhone": "333 1234567"}
                """
                    .formatted(doctor, startsAt, email));
    if (idempotencyKey != null) {
      request = request.header("Idempotency-Key", idempotencyKey);
    }
    return request.exchange();
  }

  private long count(String table) {
    return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
  }

  private static String codeOf(MvcTestResult booking) throws Exception {
    return JsonPath.read(
        booking.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.code");
  }
}
