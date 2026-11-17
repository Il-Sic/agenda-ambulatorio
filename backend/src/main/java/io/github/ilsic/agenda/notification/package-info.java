/**
 * Tells patients what happened to their booking. This module is driven by Kafka only: it consumes
 * booking events and nothing in the application calls it.
 */
@ApplicationModule(allowedDependencies = "shared")
package io.github.ilsic.agenda.notification;

import org.springframework.modulith.ApplicationModule;
