package io.github.ilsic.agenda.shared;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfiguration {

  @Bean
  OpenAPI apiDescription() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Agenda Ambulatorio API")
                .version("v1")
                .description(
                    "Appointment booking for a fictional outpatient clinic. "
                        + "Errors are returned as RFC 9457 Problem Details."))
        .servers(List.of(new Server().url("/")));
  }

  /**
   * Response records never leave a field out, so unless a schema says otherwise every property is
   * marked as required. Clients generated from the spec then get plain types, not optional ones.
   */
  @Bean
  OpenApiCustomizer everyPropertyIsRequired() {
    return openApi -> {
      if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
        return;
      }
      openApi.getComponents().getSchemas().values().stream()
          .filter(schema -> schema.getProperties() != null && schema.getRequired() == null)
          .forEach(schema -> schema.setRequired(List.copyOf(schema.getProperties().keySet())));
    };
  }
}
