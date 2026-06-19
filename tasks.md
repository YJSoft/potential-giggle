# Tasks
## Event Management Hub

**Last updated:** 2026-06-19

Tasks are grouped by phase. Within each phase, items are ordered by dependency. Check off tasks as they are completed.

---

## Phase 0 — Project Setup

### Local development environment (no Azure cost)
- [ ] Initialize Next.js 14 project with TypeScript and App Router
- [ ] Configure Tailwind CSS and install Lucide Icons
- [ ] Set up Prisma with initial schema (all entities from TRD §3.2)
- [ ] Create `docker-compose.yml` with PostgreSQL, Redis, Azurite, and MailHog (see TRD §8.2)
- [ ] Copy `.env.local.example` → `.env.local` and fill in local values (see TRD §8.3)
- [ ] Run `docker compose up -d` and verify all local services are reachable
- [ ] Run initial Prisma migration (`prisma migrate dev`) and seed script (sample event + organizer)
- [ ] Write `scripts/tick.js` — local replacement for Azure Functions Timer Trigger (applies resource `reveal_at` / `hide_at`)
- [ ] Verify local email delivery via MailHog web UI at `localhost:8025`
- [ ] Verify local blob upload via Azurite at `localhost:10000`

### Production Azure provisioning (do when ready to deploy)
- [ ] Provision Azure Database for PostgreSQL Flexible Server
- [ ] Provision Azure Cache for Redis
- [ ] Provision Azure Blob Storage account and private container
- [ ] Provision Azure Communication Services and verify sender domain
- [ ] Configure Azure Key Vault and store all secrets
- [ ] Set up Azure App Service and connect to repo for CI/CD
- [ ] Set up Azure Functions app (Consumption plan) for Timer Trigger
- [ ] Configure GitHub Actions workflow: lint → type-check → migrate → deploy

---

## Phase 1 — Authentication & Shell

- [ ] Implement magic link request endpoint (`POST /api/v1/auth/request-link`)
  - Rate limit: 5 requests per email per hour (Redis counter)
  - Send email via Azure Communication Services
- [ ] Implement magic link verify endpoint (`GET /api/v1/auth/verify`)
  - Single-use token deletion from Redis
  - Upsert `User` on first login
  - Set signed JWT session cookie (HttpOnly, Secure, SameSite=Strict)
- [ ] Implement session middleware: validate JWT on every API route, attach claims
- [ ] Implement RBAC middleware: enforce role per route
- [ ] Build magic link request page (`/auth/request-link`) — email input form
- [ ] Build magic link verify landing page (`/auth/verify`) — loading → redirect
- [ ] Build app shell: top nav, desktop sidebar, mobile bottom tab bar
- [ ] Build event list page (`/`) — event cards with phase badge and role badge
- [ ] Build event home / role-aware dashboard (`/events/[slug]/`)

---

## Phase 2 — Event Management

- [ ] API: `POST /api/v1/events` — create event (organizer)
- [ ] API: `GET /api/v1/events` — list events for current user
- [ ] API: `GET /api/v1/events/:slug` — get event detail
- [ ] API: `PATCH /api/v1/events/:slug/phase` — advance event phase (organizer)
- [ ] Build event creation form
- [ ] Build event settings page (`/events/[slug]/settings`)
  - Phase advance card with confirmation dialog (type event name to confirm irreversible transitions)
  - Event name, dates, description fields
- [ ] Build organizer dashboard stats (registered count, pending check-ins, spend summary)
- [ ] Build recent activity feed on organizer dashboard

---

## Phase 3 — Registration

- [ ] API: `POST /api/v1/events/:slug/register` — public registration (no auth)
  - Validate against `form_schema`
  - Duplicate email detection
  - Team auto-grouping by team code
  - Send confirmation email with check-in QR
- [ ] API: `GET /api/v1/events/:slug/registrations` — list (organizer)
- [ ] API: `PATCH /api/v1/events/:slug/registrations/:id/status` — update status
- [ ] API: `POST /api/v1/events/:slug/checkin` — mark attendance (organizer)
- [ ] API: `GET /api/v1/events/:slug/registrations/export` — CSV export
- [ ] Build registration form builder in settings (configurable `form_schema` fields, drag-to-reorder)
- [ ] Build public registration form page (`/register/[slug]`) — rendered from `form_schema`
  - Inline validation on blur
  - Success screen with check-in QR
- [ ] Build registration management table (`/events/[slug]/registrations`)
  - Search, filter by status
  - Per-row status actions
  - Export CSV button
- [ ] Build check-in mode: full-screen camera QR scanner + name search fallback
  - Generate HMAC-signed check-in QR (included in confirmation email)
  - Idempotent check-in endpoint
- [ ] Server-side: generate QR code PNG for check-in via `qrcode` npm package

---

## Phase 4 — Participant Resources

- [ ] API: `GET /api/v1/events/:slug/resources` — list (visible-only for non-organizers)
- [ ] API: `POST /api/v1/events/:slug/resources` — create (organizer)
- [ ] API: `PATCH /api/v1/events/:slug/resources/:id` — update / toggle visibility
- [ ] API: `DELETE /api/v1/events/:slug/resources/:id` — delete (organizer)
- [ ] Implement scheduled visibility: Azure Functions Timer Trigger (runs every minute) to apply `reveal_at` / `hide_at`; alternatively compute on read
- [ ] Server-side QR code generation per resource (WiFi URI format, plain URL, etc.)
- [ ] Build participant resource board (`/events/[slug]/resources`)
  - Tabbed by type (WiFi / Trial / Link / Text)
  - Credential masking with "Show" toggle
  - QR modal
- [ ] Build organizer resource management overlay
  - Add / edit resource slide-up sheet
  - Visibility toggle + scheduled reveal datetime pickers

---

## Phase 5 — Internal Decisions

- [ ] API: `GET /api/v1/events/:slug/decisions` — list (organizer)
- [ ] API: `POST /api/v1/events/:slug/decisions` — create (organizer)
- [ ] API: `POST /api/v1/events/:slug/decisions/:id/versions` — add new version (organizer)
- [ ] API: `POST /api/v1/events/:slug/decisions/:id/comments` — add comment (organizer)
- [ ] API: `PATCH /api/v1/events/:slug/decisions/:id/status` — mark as decided
- [ ] Build decision board page (`/events/[slug]/decisions`)
  - Card list with filter by category and status
  - History drawer (version list)
  - Comment thread (collapsible)
  - "New Decision" slide-up form
  - "Decide" action on proposals
- [ ] Build BGM playlist sub-feature: ordered list within a decision entry; add/remove/reorder tracks

---

## Phase 6 — Scoring

- [ ] API: `GET /api/v1/events/:slug/rounds` — list rounds (organizer)
- [ ] API: `POST /api/v1/events/:slug/rounds` — create round (organizer); auto-create one on event setup
- [ ] API: `POST /api/v1/events/:slug/rounds/:id/criteria` — add criterion
- [ ] API: `POST /api/v1/events/:slug/rounds/:id/lock` — lock scoring (organizer)
- [ ] API: `GET /api/v1/events/:slug/rounds/:id/scores` — get scores (organizer: all; judge: own)
- [ ] API: `POST /api/v1/events/:slug/rounds/:id/scores` — submit score entry (judge, organizer)
- [ ] API: `GET /api/v1/events/:slug/leaderboard` — aggregated results (organizer only)
  - Implement weighted total query (TRD §6.3)
  - Flag ties in response
- [ ] Build scoring setup in settings: define criteria (name, description, max score, weight), manage teams and members
- [ ] Build judge invitation flow: invite by email → magic link → role assigned
- [ ] Build judge score entry UI (`/events/[slug]/scoring`)
  - Team switcher with completion indicator per team
  - Slider + numeric input per criterion (large tap targets)
  - Optional comment field
  - Submit button (disabled until all criteria filled)
  - Auto-advance to next unscored team after submit
  - Blind mode enforcement: hide aggregated scores until judge has completed all assigned teams
- [ ] Build organizer leaderboard view
  - Auto-poll every 10 s; show last-updated timestamp
  - Tie highlight (amber) + banner prompt to resolve
  - "Lock Scoring" button with confirmation
- [ ] Build tie resolution UI: drag-to-rank or manual rank override for tied teams

---

## Phase 7 — Results & Archive

- [ ] API: `POST /api/v1/events/:slug/results/publish` — publish results (organizer)
- [ ] API: `GET /api/v1/events/:slug/results` — results (authenticated + public token)
- [ ] API: `POST /api/v1/events/:slug/awards` — assign special award (organizer)
- [ ] Implement public results token: HMAC-signed, 7-day expiry, verified without DB lookup
- [ ] Build results page (`/events/[slug]/results`)
  - Ranked list with scores and award chips
  - "Not yet published" placeholder state
  - "Share Results" button (copy public URL to clipboard)
  - Export CSV button (organizer only)
- [ ] Build award management: organizer assigns named badges to teams independently of rank
- [ ] Implement archive mode: phase transition sets all participant/judge writes to read-only

---

## Phase 8 — Cost Management

- [ ] API: `GET /api/v1/events/:slug/expenses` — list expenses (organizer)
- [ ] API: `POST /api/v1/events/:slug/expenses` — add expense (organizer)
- [ ] API: `GET /api/v1/events/:slug/income` — list income (organizer)
- [ ] API: `POST /api/v1/events/:slug/income` — add income (organizer)
- [ ] API: `GET /api/v1/events/:slug/costs/summary` — totals + by-category breakdown
- [ ] API: `GET /api/v1/events/:slug/costs/export` — CSV export
- [ ] API: `POST /api/v1/upload/receipt` — upload receipt image to Azure Blob Storage; return SAS URL
- [ ] Build cost management page (`/events/[slug]/costs`)
  - Summary stats: income, expenses, net balance
  - Category progress bars (normal → amber at 80 % → red at 100 %)
  - Expense list with receipt thumbnail and row actions
  - Per-payer reimbursement summary section
  - "Add Expense" slide-up sheet (mobile) / modal (desktop)
  - Receipt image upload with preview
  - Export CSV button
- [ ] Build income list and "Add Income" form
- [ ] Build category management: add custom categories, set budget caps

---

## Phase 9 — Polish & Hardening

- [ ] Implement all empty states (per design.md §8)
- [ ] Implement all error states and API error envelope responses
- [ ] Add loading skeletons for all data-fetching pages
- [ ] Accessibility audit: keyboard navigation, focus trapping in modals, ARIA attributes on sliders and dialogs
- [ ] Mobile QA pass: test all flows at 390 px width
- [ ] Add rate limiting middleware (Redis-based) to all mutation endpoints
- [ ] Add request input validation (Zod schemas) on all API routes
- [ ] Security review: verify RBAC enforcement on every route, check SAS URL expiry, confirm HMAC signatures
- [ ] Performance: add Redis caching for leaderboard endpoint (invalidate on score submission or lock)
- [ ] Connection pooling: enable PgBouncer on Azure PostgreSQL Flexible Server
- [ ] Set up production Azure environment (mirror dev provisioning)
- [ ] Configure Azure Key Vault references in App Service production slot
- [ ] End-to-end smoke test on production: full event lifecycle from setup to archive

---

## Backlog (Post-v1)

- [ ] Multiple scoring rounds UI (data model already ready)
- [ ] Real-time leaderboard via WebSocket / SSE
- [ ] Waitlist automation (enum value already defined)
- [ ] PDF certificate generation per winner
- [ ] Multi-currency support (column already exists)
- [ ] Per-participant / per-team resource targeting
- [ ] Slack / webhook notifications on phase transitions
- [ ] i18n / multi-language support
