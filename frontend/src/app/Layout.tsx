import { Link, NavLink, Outlet } from 'react-router';

const NAV_LINK =
  'inline-flex min-h-11 items-center underline-offset-8 aria-[current=page]:font-bold aria-[current=page]:underline';

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:bg-ink focus:p-3 focus:text-white"
      >
        Vai al contenuto
      </a>
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-4xl flex-wrap items-baseline justify-between gap-x-6 px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            Poliambulatorio Valdoria
          </Link>
          <nav aria-label="Principale" className="flex gap-x-6">
            <NavLink to="/" end className={NAV_LINK}>
              Prenota
            </NavLink>
            <NavLink to="/prenotazione" className={NAV_LINK}>
              La mia prenotazione
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="contenuto" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 px-4 py-2 text-sm text-ink-soft">
          <p className="py-2">
            Sito dimostrativo: medici, pazienti e orari sono inventati. Non inserire dati personali
            reali.
          </p>
          <Link
            to="/segreteria"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Area segreteria
          </Link>
        </div>
      </footer>
    </div>
  );
}
