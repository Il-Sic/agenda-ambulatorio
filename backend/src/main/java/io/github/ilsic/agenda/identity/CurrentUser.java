package io.github.ilsic.agenda.identity;

record CurrentUser(String username, String displayName, StaffRole role) {

  static CurrentUser of(StaffUser user) {
    return new CurrentUser(user.username(), user.displayName(), user.role());
  }
}
