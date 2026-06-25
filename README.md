# ITR Credential Engine

RegisterKaro — Engineering and Automation

A production-grade automated credential generation system for the Income Tax e-Filing portal. The system drives a real browser via Playwright, streams every automation step as live events to an operations dashboard, and persists a complete audit trail in MongoDB.

---

## Live Event Pipeline

Bot

└── POST /webhook/events

└── Service persists event to MongoDB

└── sseManager broadcasts to all connected SSE clients
SSE wire format:

id: 42

data: {"jobId":"job_abc","seq":42,"level":"info","step":"CAPTCHA_SOLVED"}
Replay on reconnect:

Browser sends Last-Event-ID header automatically

Server queries events where seq greater than lastId

Missed events are flushed first, then live tail resumes

No gaps. No duplicates. Not polling.

---

## Prerequisites

Node.js 20 or higher
MongoDB 6 or higher
npm 9 or higher

---

## Project Structure

registerkaro-itr/

├── shared/

│   └── types.ts                 Single source of truth for all types

├── automation/

│   └── src/

│       ├── stateMachine.ts      Explicit FSM with transition validation

│       ├── bot.ts               Playwright orchestrator

│       ├── config.ts            Environment config

│       ├── index.ts             CLI entry point

│       └── webhook/

│           └── client.ts        pushEvent with exponential backoff retry

├── service/

│   └── src/

│       ├── config/              Environment config, fails fast on missing vars

│       ├── repository/          MongoDB models, indexes, query layer

│       ├── domain/              Job lifecycle, OTP store, business logic

│       ├── middleware/          Auth, request ID, Zod validation

│       ├── routes/              Thin HTTP handlers, no business logic

│       ├── sse/                 Ring buffer and live fan-out

│       ├── utils/               Structured logger, AES encryption, PAN masking

│       ├── app.ts               Express app factory

│       └── index.ts             Server startup, graceful shutdown

└── ui/

└── app/

├── page.tsx             New run — PAN input form

├── run/[id]/page.tsx    Live console — SSE stream, OTP input, stepper

└── dashboard/page.tsx   Admin table, metrics strip, filters


---

## Setup

### 1. Install dependencies

```bash
cd automation && npm install && cd ..
cd service    && npm install && cd ..
cd ui         && npm install && cd ..
```

### 2. Environment variables

Create service/.env


PORT=4000

NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/itr_credentials

BEARER_TOKEN=dev_bearer_token_change_in_prod

WEBHOOK_SECRET=dev_webhook_secret_change_in_prod

ENCRYPTION_KEY=dev_32char_encryption_key_changeme

SSE_RING_BUFFER_SIZE=200

LOG_LEVEL=info



Create automation/.env

NEXT_PUBLIC_SERVICE_URL=http://localhost:4000

NEXT_PUBLIC_BEARER_TOKEN=dev_bearer_token_change_in_prod


Never commit .env files with real values. Test PAN must stay in local env only.

### 3. Start MongoDB

Local installation:

```bash
mongod
```

Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:6
```

MongoDB Atlas: create a free M0 cluster and paste the connection string into MONGO_URI.

### 4. Build automation

```bash
cd automation
npm run build
npx playwright install chromium
```

### 5. Run

Open two terminals.

Terminal 1 — Service:

```bash
cd service
npm run dev
```

Expected output:

MongoDB connected

Service started { port: 4000 }

Terminal 2 — UI:

```bash
cd ui
npm run dev
```

Open http://localhost:3000

The bot spawns automatically as a child process when a run is started. No third terminal needed.

---

## Triggering a Run

1. Open http://localhost:3000
2. Enter a PAN number you control, format ABCDE1234F
3. Click Start Run
4. Watch events stream live on the console page
5. When OTP_AWAITED appears, enter the OTP received on the registered mobile number
6. Watch the run complete and credentials get saved encrypted

---

## Admin Dashboard

http://localhost:3000/dashboard shows every run in a table with job ID, masked PAN, current phase, started time, duration, and outcome. Filters by phase and outcome. Live-updates every 5 seconds without manual refresh. Click any row to open that run's full event console and history.

---


## Running Tests

```bash
cd automation
npm test
```

Tests cover state machine transitions, valid and invalid paths, terminal state enforcement, history tracking, and transition completeness.

---

## Security

PAN numbers are masked to the format ABCDE****F immediately on receipt. The raw value is never stored in the database, never written to logs, and never appears in any event payload.

Credentials are encrypted at rest using AES-256 before being written to MongoDB. They are never written to logs or events.

OTPs are held in process memory only with a 10-minute TTL and are consumed once. They are never persisted to the database.

The service exposes two separate auth mechanisms: a bearer token for operator-facing routes and a webhook secret for bot-to-service event ingest. The health check endpoint is exempt from auth.

---

## CAPTCHA

The CAPTCHA solver currently returns null to demonstrate the retry and failure flow through the state machine. In production, replace the solveCaptcha function in automation/src/bot.ts with a call to a solving service such as 2captcha. The interface is intentionally minimal so any solver can be dropped in without touching the rest of the bot logic.

---

## Key Design Decisions

SSE over WebSocket: the data flow from server to browser is unidirectional. SSE works through proxies and CDNs without upgrade headers and is simpler to reason about. OTP submission uses a normal POST so there is no need for full-duplex.

Webhook from bot to service: mirrors the production pattern at RegisterKaro. Decouples the bot process from the service. The bot retries with exponential backoff so no event is lost even if the service is briefly unavailable.

Bot as child process: one crash never kills the service. Each run is isolated. Clean exit on failure or success.

Separate events collection: embedding events in the job document would make list-all-runs queries fetch massive documents just to render a table row. A separate collection keeps job documents small, makes event appends cheap, and lets replay queries use a tight cursor index on jobId and seq with no collection scan.

Ring buffer for SSE fan-out: bounds in-memory usage to a fixed number of recent events per job. MongoDB is the durable replay source for older events. 200 events is sufficient for a single run's live window.