import { useState, type ReactNode } from 'react';
import { Button } from '../components/Button';
import {
  dayCard,
  formatDay,
  formatDayShort,
  formatSpokenTime,
  formatWhen,
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

// Visits from one o'clock on are in the afternoon, as people at the clinic would say.
const AFTERNOON_FROM_HOUR = 13;

/** Pick a day among those with free slots, then a time on that day. */
export function SlotStep({ slots, from, to, onChoose, onEarlier, onLater }: SlotStepProps) {
  const days = groupSlotsByDay(slots);
  const [chosenDay, setChosenDay] = useState<string>();
  const day = days.find((candidate) => candidate.day === chosenDay) ?? days[0];
  const today = todayAtTheClinic();
  const first = slots[0];

  return (
    <div className="space-y-9">
      {first && from === today && (
        <div className="flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper py-3.5 pr-3.5 pl-5">
          <p className="leading-snug">
            <span className="block text-sm text-ink-soft">Il primo posto libero</span>
            <span className="block text-xl font-bold">{formatWhen(first.startsAt, today)}</span>
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              onChoose(first.startsAt);
            }}
          >
            Scegli questo
          </Button>
        </div>
      )}

      <fieldset className="min-w-0">
        <legend className="text-xl font-extrabold">Giorno</legend>
        <div className="-mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:none] sm:flex-wrap">
          {onEarlier && (
            <PageButton onClick={onEarlier} icon={<Chevron back />}>
              Giorni precedenti
            </PageButton>
          )}
          {days.map((candidate) => {
            const card = dayCard(candidate.day, today);
            const free = candidate.slots.length;
            return (
              <label
                key={candidate.day}
                className="relative flex h-24 w-[5.4rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-ink-soft bg-paper leading-tight hover:bg-ground has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink"
              >
                <input
                  type="radio"
                  name="giorno"
                  className="sr-only"
                  checked={candidate.day === day?.day}
                  onChange={() => {
                    setChosenDay(candidate.day);
                  }}
                />
                <span className="text-sm">{card.weekday}</span>
                <span className="text-xl font-extrabold tracking-tight">{card.date}</span>
                <span className="text-xs">
                  {free === 1 ? '1 libero' : `${String(free)} liberi`}
                </span>
              </label>
            );
          })}
          {onLater && (
            <PageButton onClick={onLater} icon={<CalendarIcon />}>
              Giorni successivi
            </PageButton>
          )}
        </div>
      </fieldset>

      {day ? (
        <div>
          <h2 className="text-xl font-extrabold">Ora, {formatDay(day.slots[0]?.startsAt ?? '')}</h2>
          <div className="mt-3 grid items-start gap-x-4 gap-y-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
            {partsOfTheDay(day.slots).map(({ name, slots: inPart }) => (
              <TimeGroup key={name} name={name} slots={inPart} onChoose={onChoose} />
            ))}
          </div>
        </div>
      ) : (
        <p>
          Nessun orario libero dal {formatDayShort(from)} al {formatDayShort(to)}.
          {onLater ? ' Prova nei giorni successivi.' : ' Le prenotazioni non vanno oltre.'}
        </p>
      )}
    </div>
  );
}

function partsOfTheDay(slots: Slot[]): { name: string; slots: Slot[] }[] {
  const hourOf = (slot: Slot) => Number(formatSpokenTime(slot.startsAt).split(':')[0]);
  const morning = slots.filter((slot) => hourOf(slot) < AFTERNOON_FROM_HOUR);
  const afternoon = slots.filter((slot) => hourOf(slot) >= AFTERNOON_FROM_HOUR);
  return [
    { name: 'Mattina', slots: morning },
    { name: 'Pomeriggio', slots: afternoon },
  ].filter((part) => part.slots.length > 0);
}

type TimeGroupProps = { name: string; slots: Slot[]; onChoose: (startsAt: string) => void };

function TimeGroup({ name, slots, onChoose }: TimeGroupProps) {
  return (
    <>
      <p className="flex min-h-13 items-center text-ink-soft">{name}</p>
      <ul aria-label={name} className="flex flex-wrap gap-2.5">
        {slots.map((slot) => (
          <li key={slot.startsAt}>
            <button
              type="button"
              onClick={() => {
                onChoose(slot.startsAt);
              }}
              className="h-13 w-24 rounded-xl border-[1.5px] border-ink-soft bg-paper text-xl font-bold tabular-nums hover:border-ink hover:bg-ground"
            >
              {formatSpokenTime(slot.startsAt)}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

type PageButtonProps = { onClick: () => void; icon: ReactNode; children: string };

function PageButton({ onClick, icon, children }: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-24 w-[5.4rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-sm leading-tight font-bold hover:bg-paper"
    >
      {icon}
      {children}
    </button>
  );
}

function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={back ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
