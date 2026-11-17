/**
 * Transactional outbox: events are stored with the change that caused them and published to Kafka
 * afterwards. See docs/adr/0005.
 */
@ApplicationModule(allowedDependencies = "shared")
package io.github.ilsic.agenda.outbox;

import org.springframework.modulith.ApplicationModule;
