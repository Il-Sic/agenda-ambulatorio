package io.github.ilsic.agenda.booking;

import java.time.LocalDate;
import java.util.List;

/**
 * A day at the clinic as the front desk draws it: who receives when, what is booked and what is
 * still free.
 *
 * @param closure why the clinic is closed that day, or an empty text when it is open
 */
record DayPlan(LocalDate date, String closure, List<DoctorDay> doctors) {

  /**
   * One doctor's day. Hours are empty when the doctor does not receive; free slots are offered only
   * from now to the end of the booking horizon; appointments include cancelled ones.
   */
  record DoctorDay(
      long id,
      String name,
      String specialty,
      List<Slot> hours,
      List<Slot> freeSlots,
      List<AgendaEntry> appointments) {}
}
