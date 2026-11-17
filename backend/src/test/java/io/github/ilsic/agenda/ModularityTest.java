package io.github.ilsic.agenda;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

  private final ApplicationModules modules = ApplicationModules.of(AgendaApplication.class);

  private final JavaClasses productionCode =
      new ClassFileImporter()
          .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
          .importPackagesOf(AgendaApplication.class);

  @Test
  void modulesOnlyUseWhatTheyAreAllowedTo() {
    modules.verify();
  }

  /** The notification module is reached through Kafka only: no other code may call into it. */
  @Test
  void nothingCallsTheNotificationModuleDirectly() {
    noClasses()
        .that()
        .resideOutsideOfPackage("..notification..")
        .should()
        .dependOnClassesThat()
        .resideInAPackage("..notification..")
        .check(productionCode);
  }

  @Test
  void theNotificationModuleKnowsNothingAboutBookings() {
    noClasses()
        .that()
        .resideInAPackage("..notification..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage("..booking..", "..scheduling..", "..outbox..", "..identity..")
        .check(productionCode);
  }
}
