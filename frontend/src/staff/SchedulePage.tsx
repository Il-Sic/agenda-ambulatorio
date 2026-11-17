import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { SelectField } from '../components/SelectField';
import { numberOrUndefined } from '../lib/params';
import { useStaffUser } from './useCurrentUser';

type Window = Schemas['AvailabilityWindow'];
type NewWindow = Schemas['AvailabilityRequest'];

const WEEKDAYS: Record<Window['dayOfWeek'], string> = {
  MONDAY: 'lunedì',
  TUESDAY: 'martedì',
  WEDNESDAY: 'mercoledì',
  THURSDAY: 'giovedì',
  FRIDAY: 'venerdì',
  SATURDAY: 'sabato',
  SUNDAY: 'domenica',
};
const VISIT_LENGTHS = [15, 20, 30, 45, 60];

/** When each doctor receives patients during the week. Bookable slots are derived from this. */
export function SchedulePage() {
  const user = useStaffUser();
  const isAdmin = user.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  const doctors = useQuery({
    queryKey: ['staff-doctors'],
    queryFn: () => unwrap(api.GET('/api/v1/staff/doctors')),
  });
  const doctorId = numberOrUndefined(params.get('medico')) ?? doctors.data?.[0]?.id;
  const windows = useQuery({
    queryKey: ['availability', doctorId],
    enabled: doctorId !== undefined,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/staff/doctors/{doctorId}/availability', {
          params: { path: { doctorId: doctorId ?? 0 } },
        }),
      ),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['availability', doctorId] });
  const remove = useMutation({
    mutationFn: (availabilityId: number) =>
      unwrap(
        api.DELETE('/api/v1/staff/availability/{availabilityId}', {
          params: { path: { availabilityId } },
        }),
      ),
    onSettled: refresh,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <title>Orari dei medici - Segreteria Valdoria</title>
      <h1 className="text-3xl font-bold">Orari dei medici</h1>
      <SelectField
        label="Medico"
        className="max-w-sm"
        value={doctorId ?? ''}
        onChange={(event) => {
          setParams({ medico: event.target.value });
        }}
      >
        {doctors.data?.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name}
          </option>
        ))}
      </SelectField>

      {windows.error && <Notice kind="error">{messageFor(windows.error)}</Notice>}
      {remove.error && <Notice kind="error">{messageFor(remove.error)}</Notice>}
      {windows.isLoading && <p className="text-ink-soft">Carico gli orari…</p>}
      {windows.data?.length === 0 && <p>Nessuna fascia: questo medico non è prenotabile.</p>}
      {windows.data && windows.data.length > 0 && (
        <ul className="divide-y divide-rule border-y border-rule bg-paper">
          {windows.data.map((window) => {
            const hours = `${window.startTime} – ${window.endTime}`;
            const weekday = WEEKDAYS[window.dayOfWeek];
            return (
              <li
                key={window.id}
                className="grid grid-cols-[6.5rem_1fr] items-center gap-x-4 px-4 py-2 sm:grid-cols-[6.5rem_9rem_1fr_auto]"
              >
                <span className="font-bold">{weekday}</span>
                <span className="font-bold tabular-nums">{hours}</span>
                <span className="text-ink-soft">visite da {window.slotMinutes} minuti</span>
                {isAdmin && (
                  <Button
                    variant="quiet"
                    disabled={remove.isPending}
                    aria-label={`Rimuovi la fascia di ${weekday} ${hours}`}
                    onClick={() => {
                      remove.mutate(window.id);
                    }}
                  >
                    Rimuovi
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && doctorId !== undefined ? (
        <AddWindowForm key={doctorId} doctorId={doctorId} onAdded={refresh} />
      ) : (
        !isAdmin && <p className="text-ink-soft">Solo la direzione può modificare gli orari.</p>
      )}
    </div>
  );
}

type AddWindowFormProps = { doctorId: number; onAdded: () => Promise<void> };

function AddWindowForm({ doctorId, onAdded }: AddWindowFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewWindow>({
    defaultValues: { dayOfWeek: 'MONDAY', startTime: '', endTime: '', slotMinutes: 30 },
  });

  const submit = handleSubmit(async (window) => {
    try {
      await unwrap(
        api.POST('/api/v1/staff/doctors/{doctorId}/availability', {
          params: { path: { doctorId } },
          body: window,
        }),
      );
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
      <h2 className="text-xl font-bold">Aggiungi una fascia</h2>
      {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Giorno della settimana" {...register('dayOfWeek')}>
          {Object.entries(WEEKDAYS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          label="Dalle"
          type="time"
          error={errors.startTime?.message}
          {...register('startTime', { required: 'Scrivi l’ora di inizio.' })}
        />
        <Field
          label="Alle"
          type="time"
          error={errors.endTime?.message}
          {...register('endTime', { required: 'Scrivi l’ora di fine.' })}
        />
        <SelectField
          label="Durata della visita"
          {...register('slotMinutes', { valueAsNumber: true })}
        >
          {VISIT_LENGTHS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minuti
            </option>
          ))}
        </SelectField>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Aggiungi fascia
      </Button>
    </form>
  );
}
