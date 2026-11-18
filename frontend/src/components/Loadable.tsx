import type { ReactNode } from 'react';
import { messageFor } from '../api/problem';
import { Button } from './Button';
import { Notice } from './Notice';

type LoadableProps<T> = {
  query: { data: T | undefined; error: unknown; isPending: boolean; refetch: () => unknown };
  loading: string;
  children: (data: T) => ReactNode;
};

/** The three faces of a request: waiting, failed (with a way to retry), done. */
export function Loadable<T>({ query, loading, children }: LoadableProps<T>) {
  if (query.data !== undefined) {
    return children(query.data);
  }
  if (query.error) {
    return (
      <div className="space-y-3">
        <Notice kind="error">{messageFor(query.error)}</Notice>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Riprova
        </Button>
      </div>
    );
  }
  return query.isPending ? <p className="text-ink-soft">{loading}</p> : null;
}
