# Product Requirements Document
## Event Management Hub

**Version:** 0.1  
**Status:** Draft  
**Last updated:** 2026-06-19

---

## 1. Overview

Event Management Hub is a web-based tool that consolidates all information and workflows required to run a hackathon or similar event. It replaces scattered spreadsheets, chat threads, and paper slips with a single source of truth accessible to organizers, judges, and participants — each seeing only what is relevant to their role.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Eliminate fragmented tooling | All 6 core workflows run inside the hub with no external spreadsheet required |
| Reduce organizer overhead during the event | Score entry, check-in, and resource reveal each take < 30 seconds on mobile |
| Accurate cost reconciliation | Post-event ledger export matches actual receipts with zero manual re-entry |
| Smooth participant experience | Participants can access all resources and view results without organizer assistance |
| Scalable foundation | Initial target: 50 participants per event; architecture supports 500+ without redesign |

---

## 3. User Personas

### Organizer
Event staff with full administrative access. Sets up the event, manages registrations, logs decisions, controls resource visibility, oversees scoring, publishes results, and tracks costs. Must be able to perform most actions from a mobile browser on the day of the event.

### Judge
Evaluates teams against defined criteria during the event. Needs a minimal, fast scoring interface. Cannot see other judges' scores or organizer-only data.

### Participant
Registers before the event and accesses resources and results during/after the event. Authenticates via magic link sent to their registered email. No password required.

---

## 4. Authentication

- **Method:** Magic link (email-based, passwordless)
- Organizers and judges are invited by email; participants register via the public form
- A magic link is valid for a single use and expires after 24 hours
- Sessions persist on the device until explicitly signed out or the event is archived

---

## 5. Multi-Event Support

- The hub manages multiple events independently
- All data (registrations, resources, scores, costs) is strictly scoped to a single event
- An organizer account may be associated with multiple events
- Event list view shows upcoming and past events with phase status

---

## 6. Functional Requirements

### 6.1 Registration & Personal Information

**In scope (v1):**
- Public registration form with configurable fields: name, email, phone number, team name, and free-form custom fields defined per event
- Auto-send confirmation email upon successful registration
- Duplicate detection: reject or flag registrations sharing an email address
- Team auto-grouping: registrants providing the same team code are grouped automatically
- Organizer registration dashboard: searchable and filterable list of all submissions
- Per-registrant status: `Pending` → `Confirmed` → `Checked In` (organizer-managed)
- On-site check-in: search by name or scan a QR code included in the confirmation email
- Export: CSV with all registrant data and current status

**Out of scope (v1):**
- Payment / ticket purchase
- Waitlist automation

---

### 6.2 Internal Decision-Making

**In scope (v1):**
- Private organizer-only decision board
- Each entry contains: topic, options considered, final decision, responsible owner, date decided
- Decisions are append-only with versioning — past decisions cannot be silently overwritten
- Decision status: `Proposal` | `Decided`
- Organizers can comment on proposals before they are finalised
- Category tags (e.g., Venue, A/V, Food, Schedule, Other) for filtering
- BGM/EDM playlist sub-feature: an ordered list of track names and optional links, playable in order or shuffle (reference only — does not play audio)

**Out of scope (v1):**
- Voting / approval workflows
- Integration with music streaming services

---

### 6.3 Participant Resources

**In scope (v1):**
- Organizer creates resource entries with: title, type, content, and visibility state
- Supported resource types:

  | Type | Content fields |
  |------|---------------|
  | WiFi | Network name (SSID), password |
  | Trial account | Service name, username/email, password or promo code |
  | Link | Display label, URL |
  | Text | Free-form text block |

- Visibility states: `Hidden` (organizer only) | `Visible` (all authenticated users)
- Organizer can toggle visibility at any time
- Scheduled reveal: optionally set a date/time at which a resource automatically becomes visible
- Auto-hide: optionally set an expiry date/time after which the resource reverts to hidden
- Participant resource board: clean card-based view of all currently visible resources
- QR code generated per resource (encodes the resource content or URL) for easy scanning

**Out of scope (v1):**
- Per-participant or per-team resource targeting

---

### 6.4 Scoring

**In scope (v1):**
- Organizer defines teams (name, members) and judging criteria (name, description, max score, weight)
- Scoring formula: `Total = Σ (score_i × weight_i)`
- Judges are assigned by the organizer (via email invitation)
- Each judge submits one score per criterion per team, with an optional short comment
- Blind scoring: a judge cannot see other judges' scores until they have submitted scores for all their assigned teams
- Organizer can lock scoring at a deadline; no edits after lock
- Organizer live leaderboard: shows aggregated weighted totals in real time (polling, ~10 s interval)
- Tie flagging: when two or more teams share the same total, organizer is prompted to resolve the tie manually
- Architecture note: data model must support multiple scoring rounds per event to allow this as a future extension without a schema migration

**Out of scope (v1):**
- Multiple scoring rounds (data model ready, UI deferred)
- Automated tie-breaking rules

---

### 6.5 Results & Archive

**In scope (v1):**
- Organizer action: "Publish Results" — makes the ranked results visible to all authenticated users
- Results page displays: rank, team name, project title, total score, and any assigned awards
- Special awards: organizer can assign named badges (e.g., "Best Design", "Most Creative") independently of numeric rank
- Shareable public results URL: accessible without login for external sharing
- After event ends, the hub transitions to **Archive** mode: all data is read-only for participants
- Export: results summary as CSV

**Out of scope (v1):**
- Auto-generated PDF certificates

---

### 6.6 Cost Management

**In scope (v1):**
- Expense entries: date, category, description, amount, currency, payer (organizer name), optional receipt image upload
- Default expense categories: Venue, Food & Beverage, A/V & Equipment, Prizes, Printing, Marketing, Miscellaneous; organizer may add custom categories
- Income entries: source, description, amount, date
- Dashboard: total income, total expenses, net balance; breakdown by category
- Per-payer reimbursement summary (e.g., "Alex: ₩150,000 across 3 items")
- Budget cap per category: organizer sets a cap; dashboard warns when 80 % is reached and blocks at 100 % (with override)
- Export: itemised ledger as CSV

**Out of scope (v1):**
- Multi-currency conversion
- Integration with accounting software

---

## 7. Event Lifecycle & Phase Gating

| Phase | Triggered by | Active features |
|-------|-------------|----------------|
| **Setup** | Event created | All organizer setup screens; internal decisions; cost tracking |
| **Registration open** | Organizer action | Public registration form; confirmation emails; cost tracking |
| **Event day** | Organizer action | Check-in; resource visibility controls; scoring setup |
| **Judging** | Organizer action | Score entry (judges); live leaderboard (organizer only) |
| **Closing** | Organizer locks scoring | Results publish action available; resources may be hidden |
| **Results published** | Organizer action | Results visible to all; shareable URL active |
| **Archived** | Organizer action or auto after N days | All data read-only for non-organizers; full export available |

---

## 8. Access Control

| Feature | Participant | Judge | Organizer |
|---------|:-----------:|:-----:|:---------:|
| Register for event | ✅ | ✅ | ✅ |
| View visible resources | ✅ | ✅ | ✅ |
| Manage resources | ❌ | ❌ | ✅ |
| Enter scores | ❌ | ✅ | ✅ |
| View live leaderboard | ❌ | ❌ | ✅ |
| View published results | ✅ | ✅ | ✅ |
| Publish results | ❌ | ❌ | ✅ |
| Internal decisions board | ❌ | ❌ | ✅ |
| Cost management | ❌ | ❌ | ✅ |
| Manage registrations / check-in | ❌ | ❌ | ✅ |
| Export any data | ❌ | ❌ | ✅ |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Scalability | Support 500+ concurrent participants without architectural changes |
| Mobile usability | All participant and judge flows must be fully usable on a 390 px wide screen |
| Availability | 99.5 % uptime during active event hours |
| Data retention | Event data retained for minimum 1 year after archive |
| Leaderboard refresh | Polling interval ≤ 10 seconds; no WebSocket required in v1 |
| Export formats | CSV for all tabular data |

---

## 10. Out of Scope (v1)

- Native mobile app (web-responsive only)
- Payment processing
- Automated PDF certificate generation
- Multiple scoring rounds UI (data model ready for future)
- Real-time WebSocket sync
- Third-party integrations (Slack, Google Sheets, Stripe, etc.)
- Multi-language / i18n

---

## 11. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication | Magic link (email-based) | No password management; low friction for one-time event participants |
| Event scope | Multi-event | Single hub manages all past and future events for an organization |
| Scoring rounds | Single round in v1 | Data model supports multiple rounds; UI deferred to avoid premature complexity |
| Leaderboard sync | Client-side polling | Sufficient for the scale and reduces infrastructure complexity |
| Initial scale target | 50 participants | Data model and infrastructure sized for 500+ from day one |
