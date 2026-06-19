# Event Management Hub — Ideation

## Problem Statement

Running a hackathon or event involves juggling many disconnected tools: registration spreadsheets, messaging threads for internal decisions, handwritten WiFi slips, scoring tables, results slides, and expense receipts. Information gets lost, access is inconsistent, and organizers waste time searching for the latest version of things.

**Goal:** A single web-based hub that covers the full lifecycle of an event — from pre-registration to post-event archive — for both organizers and participants.

---

## User Personas

### Organizer
- Sets up and manages all event data
- Makes internal decisions with the team
- Wants to quickly enter scores or costs on a phone during the event
- Needs to export data for reports or reimbursements

### Participant
- Registers before the event
- Accesses event resources (WiFi, tools) during the event
- Views their team's score and the final results

### Judge
- Assigned to evaluate teams against defined criteria
- Needs a simple, fast scoring interface during the event

---

## Feature Breakdown & Ideas

### 1. Registration & Personal Information
**Core flow:**
- Public-facing registration form with configurable fields (name, email, phone, team name, dietary needs, etc.)
- Organizer dashboard shows all submissions, with search and filter
- Status flags per registrant (e.g., confirmed, waitlisted, checked-in)
- Check-in flow: QR code or name search to mark attendance on the day
- CSV/Excel export for mailing lists, attendance, or name badges

**Ideas to explore:**
- Auto-send confirmation email on registration
- Team auto-grouping: if a registrant provides a team code, group them automatically
- Duplicate detection on email to avoid double registrations

---

### 2. Internal Decision-Making
**Core flow:**
- A private board (organizers only) to log decisions
- Each decision entry: topic, options considered, final decision, owner, date
- Decisions are versioned — no silent overwrites

**Ideas to explore:**
- "Proposal" state before a decision is finalised — anyone on the team can comment
- Tag decisions by category (venue, A/V, food, schedule, etc.) for easy filtering
- Link decisions to cost entries (e.g., "chose catering option B → see expense #12")
- BGM/EDM playlist: a simple ordered list of track names/links that can be played in sequence or shuffled

---

### 3. Participant Resources
**Core flow:**
- Organizer creates resource entries (title, type, content/credentials, visibility)
- Participants see a clean resource board during the event
- Resources have a visibility toggle: hidden before the event starts, revealed at the right moment

**Resource types to support:**
| Type | Example |
|------|---------|
| WiFi | SSID + password |
| Trial account | Service name + login credentials or promo code |
| Link | URL to shared docs, repo templates, APIs |
| Text | Any free-form info (emergency contact, schedule) |

**Ideas to explore:**
- QR code generated per resource so participants can scan instead of typing
- Expiry time on resources (auto-hide after event ends)
- Reveal scheduling: set a time for a resource to become visible automatically

---

### 4. Live Event Data Entry — Scoring
**Core flow:**
- Organizer defines teams and judging criteria (with weights)
- Judges are assigned to teams or score all teams
- Judge enters scores per criterion from a mobile-friendly form
- Real-time aggregation: weighted total calculated automatically
- Organizer sees a live leaderboard

**Scoring model:**
```
Total score = Σ (criterion score × criterion weight)
```

**Ideas to explore:**
- Lock scoring after a deadline to prevent late changes
- Blind scoring option: judges can't see other judges' scores until all submitted
- Flag for ties — prompt organizer to resolve manually
- Allow judges to leave a short comment per team for qualitative feedback

---

### 5. Results & Archive
**Core flow:**
- Organizer triggers "publish results" which makes rankings visible to participants
- Results page: ranked list with team name, project title, total score, awards
- Archive: after the event, the hub becomes read-only for participants but data persists

**Ideas to explore:**
- Award badges beyond rank (e.g., "Best Design", "Most Creative") that organizers assign manually
- Shareable result page with a public URL (no login required)
- Export: PDF certificate template per winner auto-populated with team/award info

---

### 6. Cost Management
**Core flow:**
- Organizer logs each expense: date, category, description, amount, payer, receipt attachment
- Income entries: sponsorship, ticket fees, etc.
- Dashboard shows running totals: total income, total expenses, net balance
- Export: itemised ledger as CSV or PDF for reimbursement submission

**Expense categories (default set):**
- Venue, Food & Beverage, A/V & Equipment, Prizes, Printing, Marketing, Miscellaneous

**Ideas to explore:**
- Per-person reimbursement summary: "Alex paid ₩150,000 across 3 items"
- Receipt photo upload stored alongside the expense entry
- Budget cap per category with a warning when approaching the limit

---

## Event Lifecycle & Phase Gating

| Phase | Active Features |
|-------|----------------|
| **Pre-event** | Registration form open; internal decisions; cost tracking |
| **Event day** | Check-in; resources revealed; scoring open; costs |
| **Judging** | Scoring; live leaderboard (organizer only) |
| **Closing** | Results published; resources may be hidden |
| **Post-event** | Archive read-only; cost report export; results public |

---

## Access Control (Roles)

| Feature | Participant | Judge | Organizer |
|---------|:-----------:|:-----:|:---------:|
| Register | ✅ | ✅ | ✅ |
| View resources | ✅ | ✅ | ✅ |
| Enter scores | ❌ | ✅ | ✅ |
| View live leaderboard | ❌ | ❌ | ✅ |
| View final results | ✅ | ✅ | ✅ |
| Internal decisions | ❌ | ❌ | ✅ |
| Cost management | ❌ | ❌ | ✅ |
| Manage registrations | ❌ | ❌ | ✅ |

---

## Decisions

| Question | Decision | Notes |
|----------|----------|-------|
| Auth model | **Magic link** (email-based) | No account creation; participants receive a login link via email |
| Event scope | **Multi-event** | The hub manages multiple events; data is scoped per event |
| Expected scale | **~50 participants** initially | Design and data model must handle 500+ without rework |
| Scoring rounds | **Single round** initially | Architecture should make adding multiple rounds a future option, not a rewrite |
| Leaderboard sync | **Polling** | Periodic polling is sufficient; no WebSocket needed for now |
