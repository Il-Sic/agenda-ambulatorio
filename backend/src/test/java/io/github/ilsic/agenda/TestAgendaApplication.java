package io.github.ilsic.agenda;

import org.springframework.boot.SpringApplication;

/**
 * Runs the application locally against throwaway containers: {@code ./mvnw spring-boot:test-run}.
 */
public class TestAgendaApplication {

  public static void main(String[] args) {
    SpringApplication.from(AgendaApplication::main)
        .with(TestcontainersConfiguration.class)
        .run(args);
  }
}
