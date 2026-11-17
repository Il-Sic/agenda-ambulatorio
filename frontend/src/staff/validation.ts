import { z } from 'zod';

export const credentials = z.object({
  username: z.string().trim().min(1, 'Scrivi il nome utente.'),
  password: z.string().min(1, 'Scrivi la password.'),
});

export type Credentials = z.infer<typeof credentials>;

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

const time = (missing: string) => z.string().regex(/^\d{2}:\d{2}$/, missing);

/** The same rules the API applies to a weekly availability window. */
export const availabilityWindow = z
  .object({
    dayOfWeek: z.enum(WEEKDAYS),
    startTime: time('Scrivi l’ora di inizio.'),
    endTime: time('Scrivi l’ora di fine.'),
    slotMinutes: z.number().int().min(5).max(240),
  })
  .superRefine((window, context) => {
    const length = minutesOfDay(window.endTime) - minutesOfDay(window.startTime);
    if (length <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'L’ora di fine deve venire dopo l’ora di inizio.',
      });
    } else if (length < window.slotMinutes) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'La fascia è più corta di una visita.',
      });
    }
  });

export type AvailabilityWindowForm = z.infer<typeof availabilityWindow>;

export const closure = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scegli il giorno.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Scrivi il motivo della chiusura.')
    .max(200, 'Usa al massimo 200 caratteri.'),
});

export type ClosureForm = z.infer<typeof closure>;

function minutesOfDay(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
