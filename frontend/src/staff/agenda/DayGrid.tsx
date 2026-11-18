import { useId, useRef } from 'react';
import type { Schemas } from '../../api/client';
import { clockTime, formatSpokenTime, minutesOfDay } from '../../lib/dates';
import { lineColor } from '../../lib/specialty';
import { STATUS, type Visit } from './status';
import { StatusIcon } from './StatusIcon';

type DoctorDay = Schemas['DoctorDay'];
type Slot = Schemas['Slot'];

/** Half an hour is 60 pixels: a 20-minute visit still has room for a name. */
const PIXELS_PER_MINUTE = 2;

/** The heads of the columns, and the corner above the hours, are as tall as three lines. */
const HEAD = 'sticky top-0 z-20 h-[5.25rem] bg-paper';

export type Range = { start: number; end: number };

export type Selection =
  | { kind: 'visit'; code: string }
  | { kind: 'free'; doctorId: number; startsAt: string }
  | undefined;

type DayGridProps = {
  doctors: DoctorDay[];
  range: Range;
  /** Minutes since midnight now, when the day drawn is today. */
  now?: number;
  selection: Selection;
  /** Codes of the visits that match the search; undefined when nothing is searched. */
  matches?: Set<string>;
  onSelect: (selection: Selection) => void;
};

/**
 * The day as a grid: a column per doctor, blocks placed by time, so visits of 20 and 30 minutes
 * sit side by side. The hours a doctor does not receive are hatched. The line of the present
 * runs behind the blocks and never crosses a name.
 */
export function DayGrid({ doctors, range, now, selection, matches, onSelect }: DayGridProps) {
  const height = (range.end - range.start) * PIXELS_PER_MINUTE;
  const halfHours: number[] = [];
  for (let minute = range.start; minute < range.end; minute += 30) {
    halfHours.push(minute);
  }
  const nowShown = now !== undefined && now >= range.start && now <= range.end;
  // The present has a label of its own: the hour it would half cover is left out.
  const underNow = (minute: number) => nowShown && now > minute - 5 && now < minute + 16;

  // Opening today, the grid starts at the present, as a wall calendar at the desk would.
  // Only once: afterwards the scroll belongs to whoever is using the grid.
  const scrolled = useRef(false);
  const startAtNow = (element: HTMLElement | null) => {
    if (!element || scrolled.current) {
      return;
    }
    scrolled.current = true;
    if (nowShown) {
      element.scrollTop = (now - range.start) * PIXELS_PER_MINUTE - element.clientHeight / 2;
    }
  };

  return (
    // The grid scrolls on its own, so the doctors' names stay on top while the hours go by.
    <section
      ref={startAtNow}
      aria-label="Griglia del giorno"
      className="max-h-[calc(100dvh-9rem)] overflow-auto overscroll-contain rounded-2xl bg-paper"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `4.5rem repeat(${String(doctors.length)}, minmax(0, 1fr))`,
          // Narrower than this, the grid scrolls sideways instead of squeezing the names.
          minWidth: `${String(4.5 + doctors.length * 9)}rem`,
        }}
      >
        <div aria-hidden="true">
          <div className={HEAD} />
          <div className="relative border-t border-rule" style={{ height }}>
            {halfHours
              .filter((minute) => !underNow(minute))
              .map((minute) => (
                <span
                  key={minute}
                  className={`absolute right-2.5 text-sm text-ink-soft tabular-nums ${minute % 60 === 0 ? 'font-bold' : ''}`}
                  style={{ top: (minute - range.start) * PIXELS_PER_MINUTE + 3 }}
                >
                  {clockTime(minute)}
                </span>
              ))}
            {nowShown && (
              <span
                className="absolute right-1.5 z-10 rounded-md bg-ink px-1.5 text-xs leading-[22px] font-bold text-white tabular-nums"
                style={{ top: (now - range.start) * PIXELS_PER_MINUTE - 11 }}
              >
                {clockTime(now)}
              </span>
            )}
          </div>
        </div>
        {doctors.map((doctor) => (
          <DoctorColumn
            key={doctor.id}
            doctor={doctor}
            range={range}
            height={height}
            now={now}
            selection={selection}
            matches={matches}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

type DoctorColumnProps = Omit<DayGridProps, 'doctors'> & { doctor: DoctorDay; height: number };

function DoctorColumn({
  doctor,
  range,
  height,
  now,
  selection,
  matches,
  onSelect,
}: DoctorColumnProps) {
  const headingId = useId();
  const top = (instant: string) =>
    (Math.max(minutesOfDay(instant), range.start) - range.start) * PIXELS_PER_MINUTE;
  const bottom = (instant: string) =>
    (Math.min(minutesOfDay(instant), range.end) - range.start) * PIXELS_PER_MINUTE;
  const within = (period: { startsAt: string; endsAt: string }) =>
    minutesOfDay(period.endsAt) > range.start && minutesOfDay(period.startsAt) < range.end;

  type Item = { startsAt: string; endsAt: string; visit?: Visit; free?: Slot };
  const items: Item[] = [
    ...doctor.appointments
      .filter((visit) => visit.status !== 'CANCELLED')
      .map((visit) => ({ startsAt: visit.startsAt, endsAt: visit.endsAt, visit })),
    ...doctor.freeSlots.map((free) => ({ startsAt: free.startsAt, endsAt: free.endsAt, free })),
  ]
    .filter(within)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const free = doctor.freeSlots.length;
  const nowTop = now === undefined ? undefined : (now - range.start) * PIXELS_PER_MINUTE;

  return (
    <section aria-labelledby={headingId} className="min-w-0 border-l border-rule">
      <div
        className={`${HEAD} border-t-8 px-3 pt-2 leading-snug`}
        style={{ borderColor: lineColor(doctor.specialty) }}
      >
        {/* The surname is what fits and what the desk says; the full name is read out. */}
        <h3 id={headingId} className="truncate font-bold">
          <span aria-hidden="true">{doctor.lastName}</span>
          <span className="sr-only">{doctor.name}</span>
        </h3>
        <p className="truncate text-sm text-ink-soft">{doctor.specialty}</p>
        {free > 0 && (
          <p className="truncate text-sm text-ink-soft">
            {free === 1 ? '1 posto libero' : `${String(free)} posti liberi`}
          </p>
        )}
      </div>
      <div className="relative border-t border-rule" style={{ height }}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#e1e8ed_0_6px,transparent_6px_12px)]"
        />
        {doctor.hours.filter(within).map((period) => (
          <div
            key={period.startsAt}
            aria-hidden="true"
            className="absolute inset-x-0 bg-paper"
            style={{
              top: top(period.startsAt),
              height: bottom(period.endsAt) - top(period.startsAt),
            }}
          />
        ))}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_59px,#e1e8ed_59px_60px)]"
        />
        {nowTop !== undefined && nowTop > 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 bg-ground/60"
            style={{ height: Math.min(nowTop, height) }}
          />
        )}
        {nowTop !== undefined && nowTop >= 0 && nowTop <= height && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 h-[3px] bg-ink"
            style={{ top: nowTop - 1 }}
          />
        )}
        <ul aria-label={`Agenda: ${doctor.name}`} className="absolute inset-0">
          {items.map((item) => {
            const y = top(item.startsAt);
            const blockHeight = bottom(item.endsAt) - y;
            return (
              <li
                key={item.startsAt + (item.visit?.code ?? 'libero')}
                className="absolute inset-x-[3px] z-[1]"
                style={{ top: y + 2, height: blockHeight - 4 }}
              >
                {item.visit ? (
                  <VisitBlock
                    visit={item.visit}
                    size={blockSize(blockHeight)}
                    selected={selection?.kind === 'visit' && selection.code === item.visit.code}
                    dimmed={matches !== undefined && !matches.has(item.visit.code)}
                    onSelect={() => {
                      onSelect({ kind: 'visit', code: item.visit?.code ?? '' });
                    }}
                  />
                ) : (
                  <FreeBlock
                    startsAt={item.startsAt}
                    doctorName={doctor.name}
                    selected={
                      selection?.kind === 'free' &&
                      selection.doctorId === doctor.id &&
                      selection.startsAt === item.startsAt
                    }
                    dimmed={matches !== undefined}
                    onSelect={() => {
                      onSelect({ kind: 'free', doctorId: doctor.id, startsAt: item.startsAt });
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

type BlockSize = 'line' | 'two-lines' | 'three-lines';

/**
 * What a visit block has room for. From twenty minutes up the name gets a line of its own, under
 * the time; from about half an hour the status is written out too. Shorter visits keep to one line.
 */
function blockSize(height: number): BlockSize {
  if (height >= 52) {
    return 'three-lines';
  }
  return height >= 38 ? 'two-lines' : 'line';
}

const BLOCK =
  'flex h-full w-full flex-col justify-center overflow-hidden rounded-lg px-2.5 text-left text-sm leading-tight';
const SELECTED = 'outline-3 outline-offset-1 outline-ink';

type VisitBlockProps = {
  visit: Visit;
  size: BlockSize;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
};

function VisitBlock({ visit, size, selected, dimmed, onSelect }: VisitBlockProps) {
  const status = STATUS[visit.status];
  const time = <span className="font-bold tabular-nums">{formatSpokenTime(visit.startsAt)}</span>;
  const name = <span className="truncate font-bold">{visit.patientName}</span>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`${BLOCK} ${status.block} ${selected ? `outline ${SELECTED}` : ''} ${dimmed ? 'opacity-35' : ''}`}
    >
      {size === 'line' ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {time} {name}
          <StatusIcon status={visit.status} className="ml-auto" />
        </span>
      ) : (
        <>
          <span className="flex items-center justify-between gap-1.5 text-xs">
            {time}
            <StatusIcon status={visit.status} />
          </span>{' '}
          {name}
        </>
      )}{' '}
      {size === 'three-lines' ? (
        <span className="mt-0.5 text-xs">{status.label}</span>
      ) : (
        <span className="sr-only">, {status.label}</span>
      )}
    </button>
  );
}

type FreeBlockProps = {
  startsAt: string;
  doctorName: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
};

function FreeBlock({ startsAt, doctorName, selected, dimmed, onSelect }: FreeBlockProps) {
  const time = formatSpokenTime(startsAt);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${time} libero, prenota con ${doctorName}`}
      onClick={onSelect}
      className={`${BLOCK} border-[1.5px] border-dashed border-ink-soft hover:bg-ground ${selected ? `bg-paper outline ${SELECTED}` : ''} ${dimmed ? 'opacity-35' : ''}`}
    >
      <span className="flex items-center gap-1.5">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="tabular-nums">{time}</span> libero
      </span>
    </button>
  );
}
