import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { bookingLookup, type BookingLookup } from './validation';

type LookupFormProps = {
  submitLabel: string;
  /** Rejects with the API error when the booking cannot be opened. */
  onSubmit: (lookup: BookingLookup) => Promise<void>;
  /** Code and e-mail the patient already typed on another page: filled in and sent at once. */
  initial?: BookingLookup;
};

/** The booking code and the e-mail used to book: all a patient needs to open a booking. */
export function LookupForm({ submitLabel, onSubmit, initial }: LookupFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bookingLookup),
    defaultValues: initial ?? { code: '', email: '' },
  });

  const submit = handleSubmit(async (lookup: BookingLookup) => {
    try {
      await onSubmit(lookup);
    } catch (error) {
      setError('root', { message: messageFor(error) });
    }
  });

  const sentInitial = useRef(false);
  useEffect(() => {
    if (initial && !sentInitial.current) {
      sentInitial.current = true;
      void submit();
    }
  }, [initial, submit]);

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
      {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
      <Field
        label="Codice di prenotazione"
        hint="Otto caratteri, per esempio ABCD2345."
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="[&_input]:font-mono [&_input]:text-xl [&_input]:font-bold [&_input]:tracking-[0.12em]"
        error={errors.code?.message}
        {...register('code')}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Ricerca in corso…' : submitLabel}
      </Button>
    </form>
  );
}
