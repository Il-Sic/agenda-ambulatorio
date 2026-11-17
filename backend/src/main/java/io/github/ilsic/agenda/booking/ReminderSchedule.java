package io.github.ilsic.agenda.booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Looks for visits to remind of every few minutes. */
@Component
class ReminderSchedule {

  private static final Logger log = LoggerFactory.getLogger(ReminderSchedule.class);

  private final VisitReminders reminders;

  ReminderSchedule(VisitReminders reminders) {
    this.reminders = reminders;
  }

  @Scheduled(fixedDelayString = "${agenda.reminders.interval:5m}")
  void remind() {
    try {
      int reminded = reminders.remindOfVisitsInTheNextDay();
      if (reminded > 0) {
        log.info("Recorded {} visit reminders", reminded);
      }
    } catch (RuntimeException exception) {
      // Nothing was committed: the same visits are picked up again on the next run.
      log.warn("Visit reminders not recorded, will retry: {}", exception.getMessage());
    }
  }
}
