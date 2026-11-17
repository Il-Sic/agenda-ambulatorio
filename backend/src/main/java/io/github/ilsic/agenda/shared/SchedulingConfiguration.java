package io.github.ilsic.agenda.shared;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Switches on the background jobs (methods marked with {@code @Scheduled}). Tests turn this off and
 * call the jobs directly, so nothing happens behind their back.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(name = "agenda.scheduling.enabled", matchIfMissing = true)
class SchedulingConfiguration {}
