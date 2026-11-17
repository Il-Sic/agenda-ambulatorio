/** Shown instead of a page that failed to render, so nobody is left looking at a stack trace. */
export function ErrorPage() {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-12">
      <title>Errore - Poliambulatorio Valdoria</title>
      <h1 className="text-3xl font-bold">Questa pagina non ha funzionato</h1>
      <p>Non dipende da te. Ricarica la pagina, oppure riparti dalla prenotazione.</p>
      <p>
        <a href="/" className="font-bold underline underline-offset-4">
          Torna alla prenotazione
        </a>
      </p>
    </main>
  );
}
