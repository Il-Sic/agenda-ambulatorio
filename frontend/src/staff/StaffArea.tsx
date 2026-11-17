import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { signOut } from '../api/auth';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { useCurrentUser } from './useCurrentUser';

const NAV_LINK =
  'inline-flex min-h-11 items-center underline-offset-8 hover:underline aria-[current=page]:font-bold aria-[current=page]:underline';

/** Frame of every staff page. Without a session it sends the visitor to sign in. */
export function StaffArea() {
  const { user, signedOut, failure, refetch } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (signedOut) {
    return <Navigate to="/segreteria/accesso" replace />;
  }

  async function leave() {
    await signOut();
    // Nothing a signed-in person has seen stays in memory.
    queryClient.clear();
    await navigate('/segreteria/accesso');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-paper focus:p-3 focus:text-ink"
      >
        Vai al contenuto
      </a>
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-2">
          <Link to="/segreteria" className="text-lg font-bold">
            Segreteria Valdoria
          </Link>
          <nav aria-label="Segreteria" className="flex flex-wrap gap-x-6">
            <NavLink to="/segreteria" end className={NAV_LINK}>
              Agenda
            </NavLink>
            <NavLink to="/segreteria/orari" className={NAV_LINK}>
              Orari dei medici
            </NavLink>
            <NavLink to="/segreteria/chiusure" className={NAV_LINK}>
              Giorni di chiusura
            </NavLink>
            <NavLink to="/segreteria/notifiche" className={NAV_LINK}>
              Notifiche inviate
            </NavLink>
          </nav>
          {user && (
            <div className="flex items-center gap-x-4">
              <span>{user.displayName}</span>
              <button
                type="button"
                onClick={() => void leave()}
                className="min-h-11 rounded border-2 border-white px-3 font-bold hover:bg-white hover:text-ink focus-visible:outline-white"
              >
                Esci
              </button>
            </div>
          )}
        </div>
      </header>
      <main id="contenuto" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {user && <Outlet context={user} />}
        {failure !== null && failure !== undefined && (
          <div className="space-y-3">
            <Notice kind="error">{messageFor(failure)}</Notice>
            <Button variant="secondary" onClick={() => void refetch()}>
              Riprova
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
