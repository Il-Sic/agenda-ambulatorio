# Agenda Ambulatorio

Prenotazione delle visite per un poliambulatorio: il paziente prenota senza account, la segreteria gestisce l'agenda, e lo stesso orario non può essere prenotato due volte nemmeno con richieste contemporanee.

[![CI](https://github.com/Il-Sic/agenda-ambulatorio/actions/workflows/ci.yml/badge.svg)](https://github.com/Il-Sic/agenda-ambulatorio/actions/workflows/ci.yml)

[English version](README.en.md)

> Progetto dimostrativo. Il «Poliambulatorio Valdoria» non esiste: medici, pazienti e orari sono inventati e non c'è alcun dato sanitario reale.

![La pagina di prenotazione: specialità e medico scelti, orari liberi del giorno](docs/screenshots/computer-prenotazione.png)

<p>
  <img src="docs/screenshots/telefono-1-specialita.png" alt="Sul telefono: scelta della specialità" width="240">
  <img src="docs/screenshots/telefono-2-orari.png" alt="Sul telefono: scelta del giorno e dell'ora" width="240">
  <img src="docs/screenshots/telefono-3-conferma.png" alt="Sul telefono: tagliando di conferma con il codice" width="240">
</p>

## Provalo in un minuto

Serve solo Docker.

```bash
git clone https://github.com/Il-Sic/agenda-ambulatorio.git
cd agenda-ambulatorio
docker compose up --build
```

Quando i container sono pronti apri <http://localhost:8080>. Il primo avvio compila backend e frontend e richiede qualche minuto.

| Cosa provare | Dove |
|---|---|
| Prenotare una visita | <http://localhost:8080> |
| Rivedere o annullare con codice ed email | «La mia prenotazione» |
| Agenda, orari, chiusure, email inviate | <http://localhost:8080/segreteria> |
| Documentazione dell'API | <http://localhost:8080/swagger-ui/index.html> |

Credenziali di esempio per l'area segreteria:

| Utente | Password | Ruolo |
|---|---|---|
| `segreteria` | `segreteria-demo` | `STAFF`: agenda del giorno e notifiche |
| `admin` | `admin-demo` | `ADMIN`: in più modifica orari e chiusure |

Valgono solo in questa demo locale: le crea il caricamento dei dati di esempio, che parte soltanto con Docker Compose. Lo stesso vale per la password del database in `compose.yaml`.

Un giro consigliato: prenota una visita, poi entra come `segreteria` e apri «Notifiche inviate». L'email di conferma che trovi lì è passata da Kafka.

Se la porta 8080 è occupata, copia `.env.example` in `.env` e cambia `APP_PORT`. Il sito risponde solo dal tuo computer; per aprirlo da un telefono sulla stessa rete imposta `APP_BIND=0.0.0.0` nello stesso file. Per ripartire dai dati iniziali: `docker compose down -v`.

![L'agenda del giorno vista dalla segreteria](docs/screenshots/computer-agenda.png)

## Cosa dimostra

| Aspetto | Dove guardare |
|---|---|
| Nessuna doppia prenotazione, garantita dal database con un vincolo di esclusione | [`002-booking.sql`](backend/src/main/resources/db/changelog/changes/002-booking.sql) |
| La prova: dodici richieste nello stesso istante, una sola prenotazione | [`ConcurrentBookingTest`](backend/src/test/java/io/github/ilsic/agenda/booking/ConcurrentBookingTest.java) |
| Prenotazione ripetibile: la stessa richiesta rimandata con la stessa chiave di idempotenza non crea doppioni | [`IdempotentBooking`](backend/src/main/java/io/github/ilsic/agenda/booking/IdempotentBooking.java), [`BookingIdempotencyTest`](backend/src/test/java/io/github/ilsic/agenda/booking/BookingIdempotencyTest.java) |
| Orari liberi calcolati con una sola query SQL, cambio dell'ora legale compreso | [`FreeSlotFinder`](backend/src/main/java/io/github/ilsic/agenda/booking/FreeSlotFinder.java), [`FreeSlotFinderTest`](backend/src/test/java/io/github/ilsic/agenda/booking/FreeSlotFinderTest.java) |
| Outbox transazionale: l'evento nasce nella stessa transazione della prenotazione | [`Outbox`](backend/src/main/java/io/github/ilsic/agenda/outbox/Outbox.java), [`BookingService`](backend/src/main/java/io/github/ilsic/agenda/booking/BookingService.java) |
| Pubblicazione su Kafka con `FOR UPDATE SKIP LOCKED` | [`OutboxPublisher`](backend/src/main/java/io/github/ilsic/agenda/outbox/OutboxPublisher.java), [`OutboxPublisherTest`](backend/src/test/java/io/github/ilsic/agenda/outbox/OutboxPublisherTest.java) |
| Consumer idempotente: un evento consegnato due volte produce una sola email | [`SimulatedEmailSender`](backend/src/main/java/io/github/ilsic/agenda/notification/SimulatedEmailSender.java) |
| Un solo servizio a moduli, con i confini verificati a ogni build | [`ModularityTest`](backend/src/test/java/io/github/ilsic/agenda/ModularityTest.java) |
| Sessione su cookie HttpOnly, CSRF, due ruoli, tutto il resto negato | [`SecurityConfiguration`](backend/src/main/java/io/github/ilsic/agenda/identity/SecurityConfiguration.java), [`AccessRulesTest`](backend/src/test/java/io/github/ilsic/agenda/identity/AccessRulesTest.java) |
| Errori in formato Problem Details, distinti da un `type` stabile | [`BookingExceptionHandler`](backend/src/main/java/io/github/ilsic/agenda/booking/BookingExceptionHandler.java) |
| Contratto dell'API sempre allineato: schema OpenAPI → tipi TypeScript, controllati in CI | [`OpenApiSpecTest`](backend/src/test/java/io/github/ilsic/agenda/OpenApiSpecTest.java), [`client.ts`](frontend/src/api/client.ts) |
| Interfaccia pensata per il telefono e accessibile, con axe a ogni schermata | [`BookingPage`](frontend/src/patient/BookingPage.tsx), [`accessibility.ts`](e2e/tests/accessibility.ts) |
| Test end to end attraverso tutto lo stack, Kafka compreso | [`staff-agenda.spec.ts`](e2e/tests/staff-agenda.spec.ts) |

## Architettura

```mermaid
flowchart TB
    P([Paziente]) --> N
    S([Segreteria]) --> N
    N["nginx<br/>app React e inoltro di /api"] --> APP

    subgraph APP["Un solo servizio Spring Boot"]
        I["identity<br/>accesso, sessione, ruoli"]
        B["booking<br/>orari liberi, prenotazioni, agenda"]
        SC["scheduling<br/>medici, orari, chiusure"]
        O["outbox<br/>eventi da pubblicare"]
        NO["notification<br/>email ai pazienti"]
        B --> SC
        B --> O
    end

    APP --> DB[("PostgreSQL")]
    O -- pubblica --> K{{"Kafka"}}
    K -- consuma --> NO
```

- **Un solo servizio, cinque moduli.** Ogni modulo è un package che dichiara da chi può dipendere; un test fa fallire la build se qualcuno sgarra.
- **`notification` è raggiungibile solo da Kafka.** Nessun altro modulo lo chiama, e lui non conosce le classi degli altri: condividono solo il nome del topic e il formato JSON dell'evento.
- **nginx serve la pagina e inoltra `/api`.** Il browser parla con una sola origine, quindi cookie di sessione e CSRF funzionano senza CORS.

Il percorso di una prenotazione:

1. `booking` controlla che l'orario sia tra quelli offerti e inserisce la visita. Se un'altra richiesta è arrivata prima, il vincolo di esclusione rifiuta l'inserimento e l'API risponde 409.
2. Nella stessa transazione scrive l'evento nella tabella `outbox_event`.
3. `outbox` pubblica l'evento su Kafka e lo segna come pubblicato.
4. `notification` lo consuma, scrive l'email e la segreteria la vede in «Notifiche inviate».

![L'email di conferma nella pagina «Notifiche inviate»](docs/screenshots/computer-notifiche.png)

## Scelte tecniche

Ogni decisione importante ha una pagina che spiega contesto, scelta, conseguenze e alternative scartate.

| Decisione | In breve |
|---|---|
| [Un solo servizio a moduli](docs/adr/0001-one-modular-service.md) | Confini veri senza il costo operativo dei microservizi |
| [Vincolo nel database contro la doppia prenotazione](docs/adr/0002-database-constraint-against-double-booking.md) | La regola vale per chiunque scriva, anche sotto concorrenza |
| [JPA insieme a SQL nativo](docs/adr/0003-jpa-with-native-sql.md) | JPA per le entità, SQL dove serve la potenza di PostgreSQL |
| [Sessione invece di JWT](docs/adr/0004-session-instead-of-jwt.md) | Niente token leggibili da JavaScript, uscita immediata |
| [Outbox invece della pubblicazione diretta](docs/adr/0005-transactional-outbox.md) | Nessun evento perso e nessun evento per dati mai salvati |

Stack: Java 25, Spring Boot 4.1, PostgreSQL 18, Liquibase, Kafka 4.4 in modalità KRaft, React 19, TypeScript, Vite, TanStack Query, React Hook Form con Zod, Tailwind CSS.

## Test

| Livello | Cosa copre | Come lanciarlo |
|---|---|---|
| Backend | Vincoli del database, concorrenza, ora legale, API, sicurezza, outbox e consumer con PostgreSQL e Kafka veri (Testcontainers), confini dei moduli | `cd backend && ./mvnw verify` |
| Frontend | Ogni pagina usata come farebbe una persona, contro un backend finto | `cd frontend && npm ci && npm test` |
| End to end | Il paziente prenota, la segreteria annulla, l'email arriva; da computer e da telefono, con controlli di accessibilità | vedi sotto |

Il backend richiede JDK 25 e Docker acceso. Il frontend richiede Node 24 o 26.

I test end to end girano contro lo stack avviato con Docker Compose:

```bash
docker compose up --build --detach --wait
cd e2e
npm ci
npx playwright install chromium
npm test
```

Alcuni dettagli che contano:

- I test del backend girano con la JVM nel fuso di Tokyo: se il codice dipende dal fuso della macchina, fallisce ovunque e non solo in produzione.
- Il test di concorrenza è stato fatto fallire apposta: tolto il vincolo, dieci richieste su dodici riescono a prenotare lo stesso orario.
- La CI esegue tutti e tre i livelli e controlla formattazione, lint, tipi e che i tipi generati dall'API siano aggiornati.

## Sviluppo in locale

Con lo stack Docker fermo (`docker compose down`), in due terminali:

```bash
# Backend su http://localhost:8080, con PostgreSQL e Kafka usa e getta e i dati di esempio
cd backend
LIQUIBASE_CONTEXTS=demo ./mvnw spring-boot:test-run
```

```bash
# Frontend su http://localhost:5173, inoltra /api al backend
cd frontend
npm ci
npm run dev
```

Dopo una modifica all'API:

```bash
cd backend && ./mvnw test -Dtest=OpenApiSpecTest -Dopenapi.update=true   # aggiorna docs/openapi.json
cd ../frontend && npm run api:generate                                   # aggiorna i tipi TypeScript
```

## Limiti noti e cosa farei dopo

- **Sessioni in memoria.** Funziona con una sola istanza del backend. Per averne di più aggiungerei Spring Session su JDBC o Redis.
- **Email simulate.** Vengono salvate e mostrate alla segreteria. Il passo successivo è un vero invio dietro la stessa interfaccia.
- **Nessun limite ai tentativi.** Chi prova molti codici di prenotazione o molte password non viene rallentato. Metterei un limite per indirizzo IP.
- **Chiusure e orari non toccano le visite già prenotate.** Se si chiude un giorno, le visite già in agenda restano e vanno annullate a mano.
- **Outbox senza pulizia.** Le righe pubblicate restano in tabella. Servirebbe un lavoro periodico che le archivia.
- **Un evento che non si riesce a elaborare viene scartato dopo dieci tentativi ravvicinati.** Va bene per un messaggio illeggibile; se invece il database resta fermo più a lungo, quell'email si perde. Aggiungerei tentativi distanziati nel tempo e un topic per i messaggi non elaborabili.
- **Kafka a un solo nodo e HTTP in chiaro.** Va bene per una demo, non per la produzione.
- **Prossime funzioni:** promemoria 24 ore prima della visita, chart Helm.

## Licenza

[MIT](LICENSE)
