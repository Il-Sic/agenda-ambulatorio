import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import { fetchCurrentUser } from '../api/auth';
import type { Schemas } from '../api/client';
import { ApiError } from '../api/problem';
import { ME } from '../app/queryClient';

export type StaffUser = Schemas['CurrentUser'];

/** Asks the server who is signed in. "Nobody" is an answer, not an error. */
export function useCurrentUser() {
  const query = useQuery({ queryKey: ME, queryFn: fetchCurrentUser, staleTime: 60_000 });
  const signedOut = query.error instanceof ApiError && query.error.status === 401;
  return {
    user: signedOut ? undefined : query.data,
    signedOut,
    failure: signedOut ? undefined : query.error,
    refetch: query.refetch,
  };
}

/** Inside the staff area there is always a signed-in user; pages read it from here. */
export function useStaffUser(): StaffUser {
  return useOutletContext<StaffUser>();
}
