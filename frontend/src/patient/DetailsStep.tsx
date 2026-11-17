import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { fieldErrors, messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { patientDetails, type PatientDetails } from './validation';

type DetailsStepProps = {
  /** What the patient typed before, if they had to come back and pick another slot. */
  initial?: PatientDetails;
  /** Rejects with the API error when the booking cannot be made. */
  onSubmit: (details: PatientDetails) => Promise<void>;
};

export function DetailsStep({ initial, onSubmit }: DetailsStepProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientDetails>({
    resolver: zodResolver(patientDetails),
    defaultValues: initial ?? { patientName: '', patientEmail: '', patientPhone: '' },
  });

  const submit = handleSubmit(async (details) => {
    try {
      await onSubmit(details);
    } catch (error) {
      for (const field of fieldErrors(error)) {
        if (field in details) {
          setError(field as keyof PatientDetails, { message: 'Controlla questo campo.' });
        }
      }
      setError('root', { message: messageFor(error) });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
      {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
      <Field
        label="Nome e cognome"
        autoComplete="name"
        error={errors.patientName?.message}
        {...register('patientName')}
      />
      <Field
        label="Email"
        hint="Qui riceverai il codice di prenotazione."
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.patientEmail?.message}
        {...register('patientEmail')}
      />
      <Field
        label="Telefono"
        hint="Per avvisarti se la visita cambia."
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        error={errors.patientPhone?.message}
        {...register('patientPhone')}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Prenotazione in corso…' : 'Conferma prenotazione'}
      </Button>
    </form>
  );
}
