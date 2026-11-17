package io.github.ilsic.agenda;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

  private final ApplicationModules modules = ApplicationModules.of(AgendaApplication.class);

  @Test
  void modulesOnlyUseWhatTheyAreAllowedTo() {
    modules.verify();
  }
}
