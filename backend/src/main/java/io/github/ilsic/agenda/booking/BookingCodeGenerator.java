package io.github.ilsic.agenda.booking;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Makes the codes patients use to find their booking. They are random, so they cannot be guessed
 * from one another, and avoid characters that are easy to confuse when read aloud (0/O, 1/I).
 */
@Component
class BookingCodeGenerator {

  static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  static final int LENGTH = 8;

  private final SecureRandom random = new SecureRandom();

  String next() {
    StringBuilder code = new StringBuilder(LENGTH);
    for (int i = 0; i < LENGTH; i++) {
      code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
    }
    return code.toString();
  }
}
