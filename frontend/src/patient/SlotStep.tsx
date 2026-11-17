import { useState } from 'react';
import { Button } from '../components/Button';
import {
  formatDayLong,
  formatDayShort,
  formatTime,
  groupSlotsByDay,
  todayAtTheClinic,
  type Slot,
} from '../lib/dates';

type SlotStepProps = {
  slots: Slot[];
  from: string;
  to: string;
  onChoose: (startsAt: string) => void;
  onEarlier?: () => void;
  /** Absent on the last page the clinic takes bookings for. */
  onLater?: () => void;
};

/** Pick a day among those with free slots, then a time on that day. */
export function SlotStep({ slots, from, to, onChoose, onEarlier, onLater }: SlotStepProps) {
  const days = groupSlotsByDay(slots);
  const [chosenDay, setChosenDay] = useState<string>();
  const day = days.find((candidate) => candidate.day === chosenDay) ?? days[0];
  const today = todayAtTheClinic();

  return (
    <div className="space-y-5">
      {day ? (
        <>
          <fieldset className="min-w-0">
            <legend className="font-bold">Giorno</legend>
            <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 py-2">
              {days.map((candidate) => (
                <label
                  key={candidate.day}
                  className="relative inline-flex min-h-12 shrink-0 cursor-pointer items-center rounded border-2 border-ink-soft bg-paper px-4 font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink"
                >
                  <input
                    type="radio"
                    name="giorno"
                    className="sr-only"
                    checked={candidate.day === day.day}
                    onChange={() => {
                      setChosenDay(candidate.day);
                    }}
                  />
                  {candidate.day === today ? 'Oggi' : formatDayShort(candidate.day)}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <h3 className="font-bold">
              Orari liberi di {formatDayLong(day.slots[0]?.startsAt ?? day.day)}
            </h3>
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {day.slots.map((slot) => (
                <li key={slot.startsAt}>
                  <button
                    type="button"
                    onClick={() => {
                      onChoose(slot.startsAt);
                    }}
                    className="min-h-12 w-full rounded border-2 border-ink-soft bg-paper text-lg font-bold tabular-nums hover:border-ink hover:bg-ground"
                  >
                    {formatTime(slot.startsAt)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p>
          Nessun orario libero dal {formatDayShort(from)} al {formatDayShort(to)}.
          {onLater ? ' Prova nei giorni successivi.' : ' Le prenotazioni non vanno oltre.'}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {onEarlier && (
          <Button variant="secondary" onClick={onEarlier}>
            Giorni precedenti
          </Button>
        )}
        {onLater && (
          <Button variant="secondary" onClick={onLater}>
            Giorni successivi
          </Button>
        )}
      </div>
    </div>
  );
}
