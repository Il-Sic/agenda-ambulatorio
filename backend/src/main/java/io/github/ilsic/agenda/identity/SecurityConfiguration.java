package io.github.ilsic.agenda.identity;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;

/**
 * Staff sign in with a form post and are remembered by a server-side session. The browser only
 * holds an HttpOnly cookie; a second cookie carries the CSRF token the single-page app echoes back
 * in a header. See docs/adr/0004.
 */
@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
class SecurityConfiguration {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, ProblemDetailsSecurityHandler problems)
      throws Exception {
    return http.authorizeHttpRequests(requests ->
            requests
                // Reporting an error is not a request of its own: without this, an unexpected
                // failure would come out as "sign in" or "not allowed".
                .dispatcherTypeMatchers(DispatcherType.ERROR)
                .permitAll()
                // Patients have no account.
                .requestMatchers(HttpMethod.GET, "/api/v1/specialties", "/api/v1/doctors/**")
                .permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/bookings/**")
                .permitAll()
                // Admin-only operations are marked with @PreAuthorize where they are defined.
                .requestMatchers("/api/v1/staff/**")
                .hasAnyRole(StaffRole.STAFF.name(), StaffRole.ADMIN.name())
                .requestMatchers("/api/v1/auth/me")
                .authenticated()
                .requestMatchers("/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**")
                .permitAll()
                .anyRequest()
                .denyAll())
        .formLogin(login ->
            login
                // The page itself belongs to the single-page app; naming it here only
                // switches off Spring Security's built-in login page.
                .loginPage("/segreteria/accesso")
                .loginProcessingUrl("/api/v1/auth/login")
                .successHandler((request, response, authentication) ->
                    response.setStatus(HttpStatus.NO_CONTENT.value()))
                .failureHandler(problems))
        .logout(logout ->
            logout
                .logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler(
                    new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
        .exceptionHandling(
            errors -> errors.authenticationEntryPoint(problems).accessDeniedHandler(problems))
        // An API answers 401; it never redirects back to a remembered page after login.
        .requestCache(AbstractHttpConfigurer::disable)
        .csrf(CsrfConfigurer::spa)
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
  }
}
