import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../api/client';
import { messageFor } from '../api/problem';
import { Notice } from '../components/Notice';
import { formatDateTime } from '../lib/dates';

/**
 * The e-mails produced from booking events. Each one got here through the outbox, Kafka and the
 * notification consumer; the list refreshes on its own, so a new booking shows up in seconds.
 */
export function NotificationsPage() {
  const emails = useQuery({
    queryKey: ['notifications'],
    queryFn: () => unwrap(api.GET('/api/v1/staff/notifications')),
    refetchInterval: 5_000,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <title>Notifiche inviate - Segreteria Valdoria</title>
      <h1 className="text-3xl font-bold">Notifiche inviate</h1>
      <p className="text-ink-soft">
        Le ultime 50 email ai pazienti, dalla più recente. In questo sito dimostrativo le email
        vengono solo registrate, non spedite.
      </p>

      {emails.error && <Notice kind="error">{messageFor(emails.error)}</Notice>}
      {emails.isPending && <p className="text-ink-soft">Carico le notifiche…</p>}
      {emails.data?.length === 0 && (
        <p>Nessuna email inviata finora. Ne parte una a ogni prenotazione o annullamento.</p>
      )}
      <div className="space-y-3">
        {emails.data?.map((email) => (
          <article
            key={email.id}
            className="border-l-[0.625rem] border-ink-soft bg-paper px-4 py-3"
          >
            <h2 className="font-bold">{email.subject}</h2>
            <p className="text-sm text-ink-soft">
              A <span className="break-all">{email.recipient}</span>
            </p>
            <p className="text-sm text-ink-soft">{formatDateTime(email.sentAt)}</p>
            <details className="mt-2">
              <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">
                Testo dell’email
              </summary>
              <p className="mt-2 border-t border-rule pt-3 whitespace-pre-line">{email.body}</p>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
