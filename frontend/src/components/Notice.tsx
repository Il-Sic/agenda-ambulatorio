import type { ReactNode } from 'react';

type NoticeProps = { kind: 'error' | 'success' | 'info'; children: ReactNode };

const STYLES = {
  error: 'border-danger bg-danger-soft',
  success: 'border-ok bg-ok-soft',
  info: 'border-ink-soft bg-paper',
};

/** A message about what just happened. Errors interrupt the screen reader, the rest waits. */
export function Notice({ kind, children }: NoticeProps) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded border-l-8 px-4 py-3 font-bold ${STYLES[kind]}`}
    >
      {children}
    </p>
  );
}
