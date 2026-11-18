import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '../components/Logo';
import { SkipLink } from '../components/SkipLink';

/** The width and the side margins every part of the public pages shares. */
const PAGE = 'mx-auto w-full max-w-[76rem] px-5 sm:px-8 lg:px-14';

const NAV_LINK =
  'inline-flex min-h-11 items-center underline-offset-[10px] decoration-[3px] hover:underline aria-[current=page]:font-bold aria-[current=page]:underline';

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header
        className={`${PAGE} flex flex-wrap items-center justify-between gap-x-8 gap-y-1 pt-5 pb-3 sm:pt-7`}
      >
        <Link to="/">
          <Logo />
        </Link>
        <nav aria-label="Principale" className="flex gap-x-8">
          <NavLink to="/" end className={NAV_LINK}>
            Prenota
          </NavLink>
          <NavLink to="/prenotazione" className={NAV_LINK}>
            La mia prenotazione
          </NavLink>
        </nav>
      </header>
      <main id="contenuto" className={`${PAGE} flex-1 pt-5 pb-14`}>
        <Outlet />
      </main>
      <footer
        className={`${PAGE} flex flex-wrap items-center justify-between gap-x-6 py-4 text-sm text-ink-soft`}
      >
        <p className="py-2">
          Sito dimostrativo: medici, pazienti e orari sono inventati. Non inserire dati personali
          reali.
        </p>
        <Link
          to="/segreteria"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Area riservata alla segreteria
        </Link>
      </footer>
    </div>
  );
}
