package io.github.ilsic.agenda.identity;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Tells Spring Security where the staff accounts live. */
@Service
class StaffUserDetailsService implements UserDetailsService {

  private final StaffUserRepository users;

  StaffUserDetailsService(StaffUserRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String username) {
    return users
        .findByUsername(username)
        .map(user ->
            User.withUsername(user.username())
                .password(user.passwordHash())
                .roles(user.role().name())
                .build())
        .orElseThrow(() -> new UsernameNotFoundException(username));
  }
}
