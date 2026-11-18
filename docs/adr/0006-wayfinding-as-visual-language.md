# 6. Wayfinding as the visual language

Status: accepted

## Context

The people who book a visit are often elderly, often on a phone, sometimes with poor eyesight.
The site must be legible first. It must also be recognisable: a booking form with the usual
cards, gradients and soft shadows would look like every other demo.

Italian hospitals already solved a similar problem on their floors: a coloured line for each
department, which a patient follows from the entrance. Clinics hand out a paper ticket that says
where and when to go.

## Decision

The interface borrows those two objects and gives each one a single job.

- **Lines are structure, never decoration.** Every specialty has a colour (`lib/specialty.ts`).
  On the home page the lines come down from "Sei qui" and bend into their specialty, so the map
  is the menu. Further on, the colour only says which specialty a screen or an appointment
  belongs to.
- **The ticket is the only object.** It is the only element with a shadow, and the only text
  set in the monospaced face, because it is "printed". It is the code a patient keeps.
- **One typeface family.** Atkinson Hyperlegible was drawn for readers with low vision. The
  display sizes use its heaviest weight with tight spacing; nothing else is added.
- **Motion only to show a change.** One moment per screen at most: the lines being painted on
  the home page, the ticket being printed at the end. All of it stops when the system asks for
  reduced motion.
- **Colour never carries meaning alone.** Statuses always have a word and an icon as well, and
  every text colour keeps a contrast of at least 4.5:1.

The geometry of the line map lives in CSS custom properties (`.line-map` in `index.css`); React
only says which line an element draws and in which colour. Rows never cross because the first
specialty takes the rightmost line.

## Consequences

- A specialty added later gets a colour automatically, and keeps it.
- The line map assumes a handful of specialties: past about ten, the bundle of lines would get
  too wide on a phone and the home page would need another layout.
- Screenshots in the README must be retaken whenever the look changes.
