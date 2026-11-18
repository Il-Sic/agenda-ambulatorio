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
   *
   * @param lastName what heads the doctor's column, where the full name does not fit
   */
  record DoctorDay(
      long id,
      String name,
      String lastName,
      String specialty,
      List<Slot> hours,
      List<Slot> freeSlots,
      List<AgendaEntry> appointments) {}
}
