/** Appointments: finding a free slot, booking it, and what happens to the visit afterwards. */
@ApplicationModule(allowedDependencies = {"scheduling", "outbox", "shared"})
package io.github.ilsic.agenda.booking;

import org.springframework.modulith.ApplicationModule;
