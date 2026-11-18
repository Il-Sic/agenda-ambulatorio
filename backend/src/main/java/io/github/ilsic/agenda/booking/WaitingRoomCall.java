package io.github.ilsic.agenda.booking;

import java.time.Instant;

/**
 * One call as the waiting room screen shows it: a number and where to go, never who. The screen
 * hangs in a public room, so nothing here may identify the patient.
 *
 * @param room where to go, such as "Ambulatorio 4", or an empty text if the doctor has none set
 * @param floor the floor of that room, such as "Primo piano", or an empty text
 * @param specialty names the coloured line to follow, as the ticket says
 */
record WaitingRoomCall(int number, String room, String floor, String specialty, Instant calledAt) {}
