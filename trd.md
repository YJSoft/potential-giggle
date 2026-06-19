# Technical Requirements Document
## Event Management Hub

**Version:** 0.1  
**Status:** Draft  
**Last updated:** 2026-06-19

---

## 1. System Architecture

### 1.1 Overview

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│  Next.js App (SSR + Client Components)      │
└───────────────────┬─────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────┐
│           Next.js API Routes                │
│  (Authentication · Business Logic · RBAC)   │
│         Azure App Service / Container Apps  │
└──────┬────────────┬────────────┬────────────┘
       │            │            │
┌──────▼──────┐ ┌───▼────────┐ ┌▼────────────────────┐
│  Azure DB   │ │  Azure     │ │  Azure Blob Storage  │
│ for Postgres│ │  Cache for │ │  (receipt images)    │
│ (Flexible   │ │  Redis     │ │                      │
│  Server)    │ │            │ │                      │
└─────────────┘ └────────────┘ └──────────────────────┘
                    │
            ┌───────▼──────────────┐
            │  Azure Communication  │
            │  Services — Email     │
            │  (magic links,        │
            │   confirmations)      │
            └──────────────────────┘
```

### 1.2 Rendering Strategy

| Route type | Strategy | Reason |
|------------|----------|--------|
| Participant resource board | SSR + polling | Fresh data on each refresh; no stale cache |
| Organizer leaderboard | Client-side polling (10 s) | Real-time feel without WebSocket complexity |
| Registration form | SSR | SEO-friendly public page |
| Results page | SSR + static revalidation | Public, shareable, cacheable |
| Admin dashboards | CSR | Frequent mutations, no SEO needed |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 14+ (App Router)** | Full-stack React; SSR, API routes, and static pages in one deployment |
| Language | **TypeScript** | Type safety across front and back end |
| Database | **PostgreSQL** | Relational data (registrations, scores, costs) with strong integrity guarantees |
| ORM | **Prisma** | Type-safe queries; schema-first migrations; multi-round data model extensibility |
| Session / cache | **Azure Cache for Redis** | Magic link token storage with TTL; session token store |
| Auth | **Custom magic link** | Passwordless; tokens stored in Azure Cache for Redis with 24 h TTL |
| Email | **Azure Communication Services — Email** | Native Azure service; reliable deliverability; no third-party dependency |
| File storage | **Azure Blob Storage** | Receipt image uploads; scalable; integrates natively with Azure RBAC |
| QR code generation | **qrcode** (npm) | Server-side QR PNG generation for resources and check-in |
| Styling | **Tailwind CSS** | Utility-first; rapid mobile-first UI development |
| Hosting | **Azure App Service** (or **Azure Container Apps**) | Managed hosting on Azure; supports Node.js natively; scales horizontally |

---

## 3. Data Model

### 3.1 Entity Relationship Overview

```
User ──< EventMembership >── Event
                              │
              ┌───────────────┼──────────────────┐
              │               │                  │
        Registration     Resource           Decision
              │               │                  │
           Team          ResourceType        DecisionVersion
              │
         ScoreEntry ── ScoringRound ── Criterion
              │
           Award
              │
         CostEntry / IncomeEntry
```

### 3.2 Schema Definitions

```sql
-- Users (all roles share one table; role is per-event)
User {
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  email       TEXT UNIQUE NOT NULL
  name        TEXT
  created_at  TIMESTAMPTZ DEFAULT now()
}

-- Events
Event {
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  slug         TEXT UNIQUE NOT NULL          -- URL-safe identifier
  name         TEXT NOT NULL
  description  TEXT
  phase        EventPhase NOT NULL DEFAULT 'SETUP'
  starts_at    TIMESTAMPTZ
  ends_at      TIMESTAMPTZ
  created_at   TIMESTAMPTZ DEFAULT now()
  updated_at   TIMESTAMPTZ DEFAULT now()
}

EventPhase ENUM (
  SETUP, REGISTRATION_OPEN, EVENT_DAY, JUDGING, CLOSING,
  RESULTS_PUBLISHED, ARCHIVED
)

-- Event membership (ties a user to an event with a role)
EventMembership {
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id  UUID REFERENCES Event(id) ON DELETE CASCADE
  user_id   UUID REFERENCES User(id) ON DELETE CASCADE
  role      Role NOT NULL   -- ORGANIZER | JUDGE | PARTICIPANT
  UNIQUE (event_id, user_id)
}

Role ENUM (ORGANIZER, JUDGE, PARTICIPANT)

-- Registrations (public form submissions)
Registration {
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id    UUID REFERENCES Event(id) ON DELETE CASCADE
  user_id     UUID REFERENCES User(id)       -- set after magic link used
  team_id     UUID REFERENCES Team(id)
  fields      JSONB NOT NULL DEFAULT '{}'   -- configurable form fields
  status      RegistrationStatus DEFAULT 'PENDING'
  checked_in  BOOLEAN DEFAULT false
  checked_in_at TIMESTAMPTZ
  created_at  TIMESTAMPTZ DEFAULT now()
}

RegistrationStatus ENUM (PENDING, CONFIRMED, WAITLISTED)

-- Teams
Team {
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id  UUID REFERENCES Event(id) ON DELETE CASCADE
  name      TEXT NOT NULL
  code      TEXT                            -- join code for auto-grouping
  UNIQUE (event_id, code)
}

-- Resources
Resource {
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id     UUID REFERENCES Event(id) ON DELETE CASCADE
  type         ResourceType NOT NULL
  title        TEXT NOT NULL
  content      JSONB NOT NULL              -- type-specific fields
  visible      BOOLEAN DEFAULT false
  reveal_at    TIMESTAMPTZ                 -- scheduled reveal
  hide_at      TIMESTAMPTZ                 -- scheduled auto-hide
  sort_order   INT DEFAULT 0
  created_at   TIMESTAMPTZ DEFAULT now()
  updated_at   TIMESTAMPTZ DEFAULT now()
}

ResourceType ENUM (WIFI, TRIAL_ACCOUNT, LINK, TEXT)

-- Decisions
Decision {
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id    UUID REFERENCES Event(id) ON DELETE CASCADE
  topic       TEXT NOT NULL
  category    TEXT                         -- tag (Venue, A/V, etc.)
  status      DecisionStatus DEFAULT 'PROPOSAL'
  owner_id    UUID REFERENCES User(id)
  created_at  TIMESTAMPTZ DEFAULT now()
}

DecisionStatus ENUM (PROPOSAL, DECIDED)

DecisionVersion {
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  decision_id  UUID REFERENCES Decision(id) ON DELETE CASCADE
  options      TEXT
  final        TEXT
  note         TEXT
  created_by   UUID REFERENCES User(id)
  created_at   TIMESTAMPTZ DEFAULT now()
}

DecisionComment {
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  decision_id  UUID REFERENCES Decision(id) ON DELETE CASCADE
  author_id    UUID REFERENCES User(id)
  body         TEXT NOT NULL
  created_at   TIMESTAMPTZ DEFAULT now()
}

-- Scoring
ScoringRound {
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id    UUID REFERENCES Event(id) ON DELETE CASCADE
  name        TEXT NOT NULL DEFAULT 'Main Round'
  locked      BOOLEAN DEFAULT false
  locked_at   TIMESTAMPTZ
  sort_order  INT DEFAULT 0               -- supports future multi-round ordering
}

Criterion {
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  round_id    UUID REFERENCES ScoringRound(id) ON DELETE CASCADE
  name        TEXT NOT NULL
  description TEXT
  max_score   NUMERIC NOT NULL DEFAULT 10
  weight      NUMERIC NOT NULL DEFAULT 1
  sort_order  INT DEFAULT 0
}

ScoreEntry {
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  round_id      UUID REFERENCES ScoringRound(id) ON DELETE CASCADE
  criterion_id  UUID REFERENCES Criterion(id) ON DELETE CASCADE
  team_id       UUID REFERENCES Team(id) ON DELETE CASCADE
  judge_id      UUID REFERENCES User(id)
  score         NUMERIC NOT NULL
  comment       TEXT
  submitted_at  TIMESTAMPTZ DEFAULT now()
  UNIQUE (round_id, criterion_id, team_id, judge_id)
}

-- Awards (manual, beyond numeric rank)
Award {
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id  UUID REFERENCES Event(id) ON DELETE CASCADE
  team_id   UUID REFERENCES Team(id) ON DELETE CASCADE
  name      TEXT NOT NULL               -- e.g. "Best Design"
  granted_by UUID REFERENCES User(id)
  created_at TIMESTAMPTZ DEFAULT now()
}

-- Costs
ExpenseCategory {
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id  UUID REFERENCES Event(id) ON DELETE CASCADE
  name      TEXT NOT NULL
  budget_cap NUMERIC                     -- NULL = no cap
}

Expense {
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id     UUID REFERENCES Event(id) ON DELETE CASCADE
  category_id  UUID REFERENCES ExpenseCategory(id)
  description  TEXT NOT NULL
  amount       NUMERIC NOT NULL
  currency     CHAR(3) NOT NULL DEFAULT 'KRW'
  payer_id     UUID REFERENCES User(id)
  receipt_url  TEXT                      -- object storage URL
  incurred_at  DATE NOT NULL
  created_at   TIMESTAMPTZ DEFAULT now()
}

Income {
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  event_id    UUID REFERENCES Event(id) ON DELETE CASCADE
  source      TEXT NOT NULL
  description TEXT
  amount      NUMERIC NOT NULL
  currency    CHAR(3) NOT NULL DEFAULT 'KRW'
  received_at DATE NOT NULL
  created_at  TIMESTAMPTZ DEFAULT now()
}

-- Magic link tokens (stored in Redis, not Postgres)
-- Key:   magic:<token_uuid>
-- Value: { email, redirect, purpose }   TTL: 86400 s (24 h)
```

---

## 4. Authentication Flow

### 4.1 Magic Link Sequence

```
Participant/Judge/Organizer         Server                   Redis          Email
        │                              │                       │              │
        │── POST /auth/request-link ──►│                       │              │
        │   { email, eventSlug }       │── SET magic:<token> ─►│              │
        │                              │   { email, redirect }  │              │
        │                              │── send magic link ────────────────────►
        │                              │                       │              │
        │◄── 200 OK ───────────────────│                       │              │
        │                              │                       │              │
        │ (clicks link in email)       │                       │              │
        │── GET /auth/verify?t=<tok> ─►│                       │              │
        │                              │── GET magic:<token> ─►│              │
        │                              │◄─ { email, redirect } ─│              │
        │                              │── DEL magic:<token> ─►│              │
        │                              │   (single-use)        │              │
        │                              │── upsert User(email)  │              │
        │                              │── set session cookie  │              │
        │◄── redirect to app ──────────│                       │              │
```

### 4.2 Session

- Session token stored as an HTTP-only, Secure, SameSite=Strict cookie
- Token is a signed JWT (HS256) containing: `userId`, `eventMemberships[]`, `iat`, `exp` (7 days)
- On each API request, middleware validates the JWT and attaches the decoded claims
- RBAC is enforced at the middleware layer before any route handler runs

### 4.3 Check-in QR Code

- QR encodes a one-time URL: `/checkin?r=<registrationId>&sig=<hmac>`
- HMAC signed with a server secret; prevents forged check-in attempts
- Scanning the QR marks the registration as `checked_in` and is idempotent

---

## 5. API Design

All routes are under `/api/v1/`. Authentication via session cookie. RBAC enforced per route.

### 5.1 Route Map (abbreviated)

```
Auth
  POST   /auth/request-link
  GET    /auth/verify

Events
  GET    /events                        (organizer: all; others: their events)
  POST   /events                        (organizer only)
  GET    /events/:slug
  PATCH  /events/:slug/phase            (organizer: advance phase)

Registrations
  POST   /events/:slug/register         (public)
  GET    /events/:slug/registrations    (organizer)
  PATCH  /events/:slug/registrations/:id/status  (organizer)
  POST   /events/:slug/checkin          (organizer)
  GET    /events/:slug/registrations/export      (organizer, returns CSV)

Resources
  GET    /events/:slug/resources        (visible only for non-organizers)
  POST   /events/:slug/resources        (organizer)
  PATCH  /events/:slug/resources/:id   (organizer)
  DELETE /events/:slug/resources/:id   (organizer)

Decisions
  GET    /events/:slug/decisions        (organizer)
  POST   /events/:slug/decisions        (organizer)
  POST   /events/:slug/decisions/:id/versions   (organizer)
  POST   /events/:slug/decisions/:id/comments   (organizer)
  PATCH  /events/:slug/decisions/:id/status     (organizer)

Scoring
  GET    /events/:slug/rounds           (organizer)
  POST   /events/:slug/rounds           (organizer)
  POST   /events/:slug/rounds/:id/criteria      (organizer)
  POST   /events/:slug/rounds/:id/lock          (organizer)
  GET    /events/:slug/rounds/:id/scores        (organizer: all; judge: own)
  POST   /events/:slug/rounds/:id/scores        (judge, organizer)
  GET    /events/:slug/leaderboard      (organizer only)

Results
  POST   /events/:slug/results/publish  (organizer)
  GET    /events/:slug/results          (all authenticated + public token)
  POST   /events/:slug/awards           (organizer)

Costs
  GET    /events/:slug/expenses         (organizer)
  POST   /events/:slug/expenses         (organizer)
  GET    /events/:slug/income           (organizer)
  POST   /events/:slug/income           (organizer)
  GET    /events/:slug/costs/summary    (organizer)
  GET    /events/:slug/costs/export     (organizer, returns CSV)

File Upload
  POST   /upload/receipt                (organizer; returns object storage URL)
```

### 5.2 Response Envelope

```json
{
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "total": 42 }
}
```

Error shape:
```json
{
  "data": null,
  "error": { "code": "FORBIDDEN", "message": "You do not have access to this resource." }
}
```

---

## 6. Module-Specific Technical Notes

### 6.1 Registration Form — Configurable Fields

- Event schema stores `form_schema: JSONB` — an ordered array of field definitions:
  ```json
  [
    { "key": "name",    "label": "Full Name",  "type": "text",   "required": true },
    { "key": "diet",    "label": "Dietary",    "type": "select", "options": ["None","Vegan","Halal"] },
    { "key": "custom1", "label": "GitHub URL", "type": "url",    "required": false }
  ]
  ```
- Submissions stored as `fields: JSONB` on `Registration`, validated server-side against the schema

### 6.2 Resource Visibility Scheduling

- A cron job (Azure Functions Timer Trigger or pg_cron) runs every minute:
  ```sql
  UPDATE "Resource"
  SET visible = true
  WHERE reveal_at <= now() AND visible = false;

  UPDATE "Resource"
  SET visible = false
  WHERE hide_at <= now() AND visible = true;
  ```
- Alternatively, visibility is computed on read: `effective_visible = visible AND (reveal_at IS NULL OR reveal_at <= now()) AND (hide_at IS NULL OR hide_at > now())`

### 6.3 Scoring — Blind Mode

- `ScoreEntry` rows exist per judge; a judge's query filters `WHERE judge_id = currentUser`
- Aggregate leaderboard query (organizer only):
  ```sql
  SELECT
    t.id, t.name,
    SUM(se.score * c.weight) AS total,
    COUNT(DISTINCT se.judge_id) AS judge_count
  FROM "Team" t
  JOIN "ScoreEntry" se ON se.team_id = t.id
  JOIN "Criterion"  c  ON c.id = se.criterion_id
  WHERE se.round_id = $1
  GROUP BY t.id, t.name
  ORDER BY total DESC;
  ```
- Blind enforcement: before returning scores, check that all criteria for all assigned teams have been scored by the requesting judge

### 6.4 Multi-Round Extensibility

- `ScoringRound` is a first-class entity from day one
- v1 creates exactly one round per event (auto-created on event setup)
- Adding multiple-round UI requires only: a round selector in the scoring interface and a combined-score aggregation strategy — no schema changes

### 6.5 QR Code Generation

- Generated server-side via the `qrcode` package, returned as a PNG data URL
- Resource QR: encodes the resource content (WiFi credentials formatted as `WIFI:S:<ssid>;T:WPA;P:<pass>;;`, links as the URL, others as plain text)
- Check-in QR: encodes the signed check-in URL; embedded in the confirmation email as an inline image

### 6.6 Public Results URL

- Results page at `/events/:slug/results` is rendered server-side
- A short-lived signed token allows unauthenticated access: `GET /events/:slug/results?pub=<token>`
- Token is HMAC-signed, contains `eventId + exp`, verified without a database lookup

---

## 7. Security Requirements

| Area | Requirement |
|------|-------------|
| Transport | HTTPS only; HSTS enforced |
| Auth cookies | `HttpOnly`, `Secure`, `SameSite=Strict` |
| RBAC | Every API route checks role from JWT claims; no client-supplied role trusted |
| Magic link tokens | Single-use; deleted from Azure Cache for Redis on first use; 24 h TTL |
| Check-in QR | HMAC-signed; server verifies signature before marking attendance |
| File uploads | Validated MIME type and size (max 5 MB); stored in private Azure Blob Storage container; served via SAS (Shared Access Signature) URLs |
| JSONB inputs | Schema-validated before persistence; no raw SQL interpolation |
| Rate limiting | `/auth/request-link`: max 5 requests per email per hour |
| Organizer-only routes | Verified via `EventMembership.role = ORGANIZER`; 403 otherwise |
| Public results token | Short-lived (7 days), HMAC-signed; no database write on each access |

---

## 8. Infrastructure & Deployment

### 8.1 Production (Azure)

```
┌──────────────────────┐     ┌──────────────────────────┐
│  Azure App Service   │────►│  Azure DB for PostgreSQL  │
│  (Next.js)           │     │  (Flexible Server)        │
│                      │────►│                          │
└──────────────────────┘     └──────────────────────────┘
          │                           │
          │                  ┌────────▼──────────────┐
          │                  │  Azure Cache for Redis │
          │                  └────────────────────────┘
          │
          ▼
┌──────────────────────────────┐     ┌──────────────────────┐
│  Azure Communication Services│     │  Azure Blob Storage   │
│  Email (magic links,         │     │  (receipt images)     │
│  confirmations)              │     │                      │
└──────────────────────────────┘     └──────────────────────┘
```

All services are deployed within the same **Azure region** to minimise latency. Resources are grouped under a single **Azure Resource Group** per environment (dev / prod).

### 8.2 Local Development (No Azure Cost)

All Azure services have a free local alternative for development and testing. No Azure account or spend is needed to run the application locally.

```
┌──────────────────────┐     ┌──────────────────────────┐
│  next dev            │────►│  PostgreSQL (Docker)      │
│  (localhost:3000)    │     │  postgres:16-alpine       │
│                      │────►│  localhost:5432           │
└──────────────────────┘     └──────────────────────────┘
          │                           │
          │                  ┌────────▼──────────────┐
          │                  │  Redis (Docker)        │
          │                  │  redis:7-alpine        │
          │                  │  localhost:6379        │
          │                  └────────────────────────┘
          │
          ▼
┌──────────────────────────────┐     ┌──────────────────────┐
│  MailHog (Docker)            │     │  Azurite (Docker)     │
│  SMTP: localhost:1025        │     │  Blob: localhost:10000│
│  Web UI: localhost:8025      │     │  (official MS emulator│
└──────────────────────────────┘     └──────────────────────┘

Scheduled jobs → simple npm script (node scripts/tick.js) run manually or via nodemon
```

**Local service map:**

| Azure Service | Local Alternative | How to run |
|--------------|-------------------|-----------|
| Azure DB for PostgreSQL | PostgreSQL 16 | `docker compose up postgres` |
| Azure Cache for Redis | Redis 7 | `docker compose up redis` |
| Azure Blob Storage | **Azurite** (official MS emulator) | `docker compose up azurite` |
| Azure Communication Services Email | **MailHog** | `docker compose up mailhog` — view emails at `localhost:8025` |
| Azure Functions Timer Trigger | `node scripts/tick.js` | Run manually or `nodemon scripts/tick.js` |
| Azure Key Vault | `.env.local` file | Copy `.env.local.example` and fill in values |
| Azure App Service | `npm run dev` | `localhost:3000` |

**`docker-compose.yml` (local dev):**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: eventhub
      POSTGRES_USER: eventhub
      POSTGRES_PASSWORD: eventhub
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    ports:
      - "10000:10000"   # Blob
      - "10001:10001"   # Queue
    command: azurite --blobHost 0.0.0.0

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
```

**`.env.local` for local dev:**
```env
DATABASE_URL=postgresql://eventhub:eventhub@localhost:5432/eventhub
AZURE_REDIS_CONNECTION_STRING=redis://localhost:6379
JWT_SECRET=local-dev-secret-change-in-prod
HMAC_SECRET=local-dev-hmac-secret-change-in-prod
# Azure Communication Services → MailHog SMTP
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
# Azure Blob Storage → Azurite
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OGLjX+N6+RKV2PqCl3LZ9MrX+3EMh2S6g==;BlobEndpoint=http://localhost:10000/devstoreaccount1;
AZURE_STORAGE_CONTAINER_NAME=receipts
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **Note:** The Azurite connection string above uses the well-known default development credentials — these are public and safe to commit. Do not use production credentials in `.env.local`.

### 8.3 Environment Variables Reference

| Variable | Local value | Production source |
|----------|------------|-------------------|
| `DATABASE_URL` | Docker Postgres URL | Azure Key Vault |
| `AZURE_REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Azure Key Vault |
| `JWT_SECRET` | Any random string | Azure Key Vault |
| `HMAC_SECRET` | Any random string | Azure Key Vault |
| `EMAIL_PROVIDER` | `smtp` | `acs` (Azure Communication Services) |
| `SMTP_HOST` / `SMTP_PORT` | MailHog | — (not used in prod) |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | — (not used locally) | Azure Key Vault |
| `AZURE_COMMUNICATION_SENDER_ADDRESS` | — | Azure Key Vault |
| `AZURE_STORAGE_CONNECTION_STRING` | Azurite default string | Azure Key Vault |
| `AZURE_STORAGE_CONTAINER_NAME` | `receipts` | `receipts` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Production URL |

### 8.4 Azure Services Map (Production)

| Purpose | Azure Service | Tier (v1) |
|---------|--------------|-----------|
| App hosting | Azure App Service | B2 or P1v3 |
| Database | Azure Database for PostgreSQL — Flexible Server | Burstable B1ms → scale to General Purpose |
| Session / token cache | Azure Cache for Redis | C0 Basic → C1 Standard for prod |
| File storage | Azure Blob Storage | LRS, private container + SAS URLs |
| Email | Azure Communication Services — Email | Pay-as-you-go |
| Scheduled jobs | Azure Functions (Timer Trigger) | Consumption plan |
| Secrets management | Azure Key Vault | Standard |

### 8.5 Scaling Considerations

- Connection pooling via **PgBouncer** built into Azure Database for PostgreSQL Flexible Server — required at 500+ concurrent users; enable in the portal
- Azure Cache for Redis session store ensures horizontal scaling of the App Service (stateless API layer); enable multiple App Service instances behind the built-in load balancer
- Azure Blob Storage is inherently scalable; no action needed
- Leaderboard polling at 10 s interval: at 50 concurrent organizer sessions = 5 req/s — negligible; at 500 it remains manageable with Redis caching the leaderboard result

---

## 9. Performance Targets

| Operation | Target P95 latency |
|-----------|-------------------|
| Page load (SSR) | < 800 ms |
| API read (list views) | < 300 ms |
| Score submission | < 500 ms |
| Leaderboard poll | < 200 ms |
| CSV export (500 rows) | < 1 s |
| Receipt upload | < 3 s |

---

## 10. Future Extension Points

| Future feature | Preparation done in v1 |
|---------------|----------------------|
| Multiple scoring rounds | `ScoringRound` table exists; `sort_order` column reserved |
| Real-time leaderboard | Replace polling with WebSocket/SSE at the leaderboard endpoint; no data model change |
| Waitlist automation | `RegistrationStatus.WAITLISTED` enum value defined; promotion logic deferred |
| Multi-currency | `currency` column on all money tables; conversion layer deferred |
| PDF certificates | Results data already structured; template engine to be added |
| Per-participant resource targeting | `Resource.target_role` or junction table can be added without breaking existing rows |
