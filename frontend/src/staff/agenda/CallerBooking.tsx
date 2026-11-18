import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, unwrap } from '../../api/client';
import { fieldErrors, messageFor } from '../../api/problem';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { formatDay, formatSpokenTime } from '../../lib/dates';
import { randomKey } from '../../lib/randomKey';
import { lineColor } from '../../lib/specialty';
import { patientDetails, type PatientDetails } from '../../patient/validation';

type CallerBookingProps = {
  doctorId: number;
  doctorName: string;
  specialty: string;
  startsAt: string;
  onBooked: (code: string) => void;
  onClose: () => void;
};

/**
 * A free slot chosen in the grid, for a patient on the phone. The booking goes through the same
 * rules as one made on the site, idempotency key included.
 */
export function CallerBooking({
  doctorId,
  doctorName,
  specialty,
  startsAt,
  onBooked,
  onClose,
}: CallerBookingProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Drawn afresh for each slot (see the key where it is used): one idempotency key per slot.
  const [idempotencyKey] = useState(randomKey);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientDetails>({
    resolver: zodResolver(patientDetails),
    defaultValues: { patientName: '', patientEmail: '', patientPhone: '' },
  });

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const submit = handleSubmit(async (patient) => {
    try {
      const booking = await unwrap(
        api.POST('/api/v1/bookings', {
          params: { header: { 'Idempotency-Key': idempotencyKey } },
          body: { doctorId, startsAt, ...patient },
        }),
      );
      onBooked(booking.code);
    } catch (error) {
      for (const field of fieldErrors(error)) {
        if (field in patient) {
          setError(field as keyof PatientDetails, { message: 'Controlla questo campo.' });
        }
      }
      setError('root', { message: messageFor(error) });
    }
  });

  const time = formatSpokenTime(startsAt);
  return (
    <section aria-labelledby="prenota-telefono" className="rounded-2xl bg-paper p-5">
      <h2
        id="prenota-telefono"
        ref={heading}
        tabIndex={-1}
        className="text-xl/tight font-extrabold tracking-tight"
      >
        Prenota per chi telefona
      </h2>
      <p className="mt-2 flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: lineColor(specialty) }}
        />
        {formatDay(startsAt)} alle {time}, {doctorName}
      </p>
      <form onSubmit={(event) => void submit(event)} noValidate className="mt-4 space-y-3">
        {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
        <Field
          label="Nome e cognome"
          autoComplete="off"
          error={errors.patientName?.message}
          {...register('patientName')}
        />
        <Field
          label="Telefono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          error={errors.patientPhone?.message}
          {...register('patientPhone')}
        />
        <Field
          label="Email"
          hint="Qui il paziente riceve il codice."
          type="email"
          inputMode="email"
          autoComplete="off"
          error={errors.patientEmail?.message}
          {...register('patientEmail')}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Prenotazione in corso…' : `Prenota alle ${time}`}
        </Button>
      </form>
      <Button variant="quiet" className="mt-2" onClick={onClose}>
        Chiudi
      </Button>
    </section>
  );
}
