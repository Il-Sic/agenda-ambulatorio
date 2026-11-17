import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { formatDayKeyLong } from '../lib/dates';
import { useStaffUser } from './useCurrentUser';

type NewClosure = Schemas['ClosureRequest'];

const CLOSURES = ['closures'];

/** Days on which the whole clinic is closed: no slot is offered on them. */
export function ClosuresPage() {
  const isAdmin = useStaffUser().role === 'ADMIN';
  const queryClient = useQueryClient();
  const closures = useQuery({
    queryKey: CLOSURES,
    queryFn: () => unwrap(api.GET('/api/v1/staff/closures')),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: CLOSURES });
  const reopen = useMutation({
    mutationFn: (closureId: number) =>
      unwrap(api.DELETE('/api/v1/staff/closures/{closureId}', { params: { path: { closureId } } })),
    onSettled: refresh,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <title>Giorni di chiusura - Segreteria Valdoria</title>
      <h1 className="text-3xl font-bold">Giorni di chiusura</h1>
      <p className="text-ink-soft">
        In questi giorni non si può prenotare. Le visite già prenotate restano in agenda: vanno
        annullate da lì.
      </p>

      {closures.error && <Notice kind="error">{messageFor(closures.error)}</Notice>}
      {reopen.error && <Notice kind="error">{messageFor(reopen.error)}</Notice>}
      {closures.isPending && <p className="text-ink-soft">Carico le chiusure…</p>}
      {closures.data?.length === 0 && <p>Nessun giorno di chiusura in programma.</p>}
      {closures.data && closures.data.length > 0 && (
        <ul className="divide-y divide-rule border-y border-rule bg-paper">
          {closures.data.map((closure) => {
            const day = formatDayKeyLong(closure.day);
            return (
              <li
                key={closure.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2 sm:grid-cols-[16rem_1fr_auto]"
              >
                <span className="font-bold">{day}</span>
                <span className="text-ink-soft max-sm:col-start-1 max-sm:row-start-2">
                  {closure.reason}
                </span>
                {isAdmin && (
                  <Button
                    variant="quiet"
                    disabled={reopen.isPending}
                    aria-label={`Riapri ${day}`}
                    onClick={() => {
                      reopen.mutate(closure.id);
                    }}
                  >
                    Riapri
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin ? (
        <AddClosureForm onAdded={refresh} />
      ) : (
        <p className="text-ink-soft">Solo la direzione può modificare le chiusure.</p>
      )}
    </div>
  );
}

function AddClosureForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewClosure>({ defaultValues: { day: '', reason: '' } });

  const submit = handleSubmit(async (closure) => {
    try {
      await unwrap(api.POST('/api/v1/staff/closures', { body: closure }));
      await onAdded();
      reset();
    } catch (error) {
      setError('root', { message: messageFor(error) });
    }
  });

  return (
    <form
      onSubmit={(event) => void submit(event)}
      noValidate
      className="space-y-4 border-t-2 border-ink pt-5"
    >
      <h2 className="text-xl font-bold">Aggiungi un giorno di chiusura</h2>
      {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Field
          label="Giorno"
          type="date"
          error={errors.day?.message}
          {...register('day', { required: 'Scegli il giorno.' })}
        />
        <Field
          label="Motivo"
          hint="Per esempio: festa del patrono."
          error={errors.reason?.message}
          {...register('reason', {
            validate: (reason) => reason.trim() !== '' || 'Scrivi il motivo della chiusura.',
          })}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Aggiungi chiusura
      </Button>
    </form>
  );
}
