package io.github.ilsic.agenda.shared;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration(proxyBeanMethods = false)
class TopicConfiguration {

  /** Created at startup if missing. Events of one booking share a key, hence a partition. */
  @Bean
  NewTopic bookingEventsTopic() {
    return TopicBuilder.name(Topics.BOOKING_EVENTS).partitions(3).replicas(1).build();
  }
}
