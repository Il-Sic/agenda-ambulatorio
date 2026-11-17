# 4. Server-side session instead of JWT

Status: accepted

## Context

Only the staff sign in. They use a single-page app served from the same origin as the API. The
application needs sign-in, sign-out, two roles and nothing else: no third-party clients, no
mobile app, no single sign-on.

## Decision

Use what Spring Security provides out of the box:

- Form login at `/api/v1/auth/login`; the server keeps the user in an HTTP session.
- The browser only holds the session id, in a cookie that is `HttpOnly` and `SameSite=Lax`
  (and `Secure` when served over HTTPS). JavaScript cannot read it.
- CSRF protection stays on. The server sends the token in a second cookie (`XSRF-TOKEN`) and
  the app repeats it in the `X-XSRF-TOKEN` header on every write. Another site can make the
  browser send the cookies, but cannot read the token to build the header.
- Passwords are stored as BCrypt hashes. Roles are `STAFF` and `ADMIN`; admin-only operations
  carry `@PreAuthorize("hasRole('ADMIN')")` where they are defined.
- 401 and 403 are returned as Problem Details like every other error.

No token format, signing key, refresh logic or authentication filter is written by hand.

## Consequences

- Sign-out is immediate: the server forgets the session, and the cookie is worthless.
- A script injected into the page cannot steal the credential, because it cannot read it.
- Cookies are sent automatically, so CSRF protection is mandatory. It is on, and tested without
  shortcuts (`AccessRulesTest`).
- Sessions live in the memory of one instance: a restart signs everybody out, and a second
  instance would need a shared store. Spring Session (JDBC or Redis) adds that without touching
  controllers.

## Alternatives considered

- **JWT in `localStorage`.** Readable by any script on the page, and valid until it expires:
  revoking one means keeping server-side state after all.
- **JWT in an HttpOnly cookie.** Still needs CSRF protection and still cannot be revoked
  simply. More code than a session for no gain when client and API share an origin.
- **An OpenID Connect provider (for example Keycloak).** The right tool for single sign-on
  across applications; far more than two demo accounts need.
