import { z } from 'zod';

export const email = z
  .string()
  .trim()
  .pipe(z.email('Scrivi un indirizzo email valido, per esempio nome@esempio.it.'));

/** Same rules the API applies; checking them here saves the patient a round trip. */
export const patientDetails = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, 'Scrivi nome e cognome.')
    .max(120, 'Usa al massimo 120 caratteri.'),
  patientEmail: email,
  patientPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{6,20}$/, 'Scrivi un numero di telefono, solo cifre e spazi.'),
});

export type PatientDetails = z.infer<typeof patientDetails>;

export const bookingLookup = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Scrivi il codice di prenotazione.')
    .transform((code) => code.toUpperCase()),
  email,
});

export type BookingLookup = z.infer<typeof bookingLookup>;
