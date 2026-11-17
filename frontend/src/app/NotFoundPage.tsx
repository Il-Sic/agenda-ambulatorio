import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <title>Pagina non trovata - Poliambulatorio Valdoria</title>
      <h1 className="text-3xl font-bold">Pagina non trovata</h1>
      <p className="mt-3">
        L’indirizzo che hai aperto non esiste.{' '}
        <Link to="/" className="font-bold underline underline-offset-4">
          Vai alla prenotazione
        </Link>
        .
      </p>
    </>
  );
}
