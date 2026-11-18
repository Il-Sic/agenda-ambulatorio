import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { signOut } from '../api/auth';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { LogoMark } from '../components/Logo';
import { Notice } from '../components/Notice';
import { SkipLink } from '../components/SkipLink';
import { useCurrentUser } from './useCurrentUser';

const NAV_LINK =
  'inline-flex min-h-10 items-center rounded-lg px-3 underline-offset-8 hover:underline aria-[current=page]:bg-white aria-[current=page]:font-bold aria-[current=page]:text-ink aria-[current=page]:no-underline';

/** Frame of every staff page. Without a session it sends the visitor to sign in. */
export function StaffArea() {
  const { user, signedOut, failure, refetch } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signOutFailure, setSignOutFailure] = useState<string>();

  if (signedOut) {
    return <Navigate to="/segreteria/accesso" replace />;
  }

  async function leave() {
    try {
      await signOut();
    } catch (error) {
      // Still signed in: better to say so than to pretend otherwise.
      setSignOutFailure(messageFor(error));
      return;
    }
    // Nothing a signed-in person has seen stays in memory.
    queryClient.clear();
    await navigate('/segreteria/accesso');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="on-ink bg-ink text-white">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-2 sm:px-6">
          <Link to="/segreteria" className="flex items-center gap-3 text-lg font-bold">
            <LogoMark size={30} />
            Segreteria Valdoria
          </Link>
          <nav aria-label="Segreteria" className="flex flex-wrap gap-x-1">
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
                className="min-h-11 rounded border-2 border-white px-3 font-bold hover:bg-white hover:text-ink"
              >
                Esci
              </button>
            </div>
          )}
        </div>
      </header>
      <main id="contenuto" className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-6 sm:px-6">
        {signOutFailure && (
          <div className="mb-6">
            <Notice kind="error">{signOutFailure}</Notice>
          </div>
        )}
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
