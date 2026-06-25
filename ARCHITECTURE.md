# Architecture

## State Machine

The bot models every run as an explicit FSM declared in automation/src/stateMachine.ts. Every valid transition is listed once. An invalid transition throws with a descriptive error — no silent state corruption.

IDLE
 └── NAVIGATING
      └── CAPTCHA_SOLVING
           ├── CAPTCHA_FAILED (retry loop, max 3)
           └── OTP_AWAITED
                └── OTP_RECEIVED
                     └── SETTING_PASSWORD
                          └── SUCCESS

Terminal states: SUCCESS, FAILED, CANCELLED. No transitions out.

## Event Schema

One document per meaningful bot step, stored in a dedicated events collection.

jobId     — which run
seq       — monotonic integer per job, used as SSE Last-Event-ID
level     — info, warn, error, debug
phase     — state machine state at time of emit
step      — machine-readable label, e.g. CAPTCHA_SOLVED
message   — human-readable, secrets always masked
timestamp — ISO 8601
meta      — optional extra context, never contains PII

## Live Streaming and Replay

Bot pushes events to the service over an authenticated POST webhook with exponential backoff retry so no event is lost.

The service persists every event to MongoDB first, then broadcasts over SSE. MongoDB is the single source of truth.

Each SSE message carries an id equal to the event seq. When a browser reconnects it sends Last-Event-ID automatically. The server queries events where seq is greater than that value using the compound index on jobId and seq. Missed events are flushed first, then the live tail resumes. No gaps. No duplicates.

The SseManager holds a fixed-size ring buffer of 200 events per job for in-memory fan-out. Older events are always available from MongoDB.

## MongoDB Data Model

Two collections: jobs and events.

Events are stored in a separate collection rather than embedded in job documents for three reasons. List-all-runs queries only fetch the seven fields the table needs and never touch event data. Event appends are cheap single-document inserts with no read-before-write. Replay queries use a tight cursor on jobId and seq with no collection scan.

Indexes on the events collection:
  jobId + seq (unique) — replay cursor and SSE catchup
  jobId + timestamp   — fallback sort

Indexes on the jobs collection:
  updatedAt descending          — default admin list sort
  phase + updatedAt descending  — filter by phase
  outcome + updatedAt descending — filter by outcome

## Security

PAN is masked to ABCDE****F immediately in jobService.startJob. The raw value is never stored.
Credentials are AES-256 encrypted before the MongoDB write and never written to logs or events.
OTPs are held in process memory only with a 10-minute TTL and consumed once.
Bearer token guards all operator-facing routes.
Webhook secret guards bot-to-service event ingest. The two secrets are independent.

## Trade-offs

SSE over WebSocket: unidirectional flow, works through proxies without upgrade headers, simpler protocol. OTP uses a normal POST so full-duplex is not needed.

Webhook from bot to service: decouples the bot process lifecycle from the service. Retries on failure. Mirrors the production pattern at RegisterKaro.

Bot as child process: one crash never kills the service. Each run is isolated.

Separate events collection: cheap appends, cheap list queries, cursor-based replay. Embedding would make all three worse.

Ring buffer 200 events: bounds SSE fan-out memory. MongoDB covers replay beyond the buffer.