# Design Document
## Event Management Hub

**Version:** 0.1  
**Status:** Draft  
**Last updated:** 2026-06-19

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Mobile first** | All critical flows (check-in, scoring, resource access) must work flawlessly on a 390 px screen |
| **Role clarity** | Each role (Organizer, Judge, Participant) sees only what is relevant — no cognitive overload from irrelevant controls |
| **Speed over polish during the event** | On-day workflows (score entry, check-in) prioritize tap target size and minimal steps over visual richness |
| **Progressive disclosure** | Advanced options (scheduled reveal, budget caps, blind scoring) are tucked behind secondary controls; core actions are always prominent |
| **Calm information density** | Dashboards show summaries by default; drill-down on demand |

---

## 2. Visual Language

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#2563EB` | Primary actions, links, active states |
| `--color-primary-dark` | `#1D4ED8` | Hover/pressed state for primary |
| `--color-success` | `#16A34A` | Confirmed, checked-in, published |
| `--color-warning` | `#D97706` | Budget warnings, tie flags, pending decisions |
| `--color-danger` | `#DC2626` | Destructive actions, over-budget, locked |
| `--color-neutral-50` | `#F8FAFC` | Page background |
| `--color-neutral-100` | `#F1F5F9` | Card backgrounds, table rows |
| `--color-neutral-300` | `#CBD5E1` | Borders, dividers |
| `--color-neutral-700` | `#334155` | Body text |
| `--color-neutral-900` | `#0F172A` | Headings |
| `--color-phase-*` | See §2.3 | Phase badge colors |

### 2.2 Typography

| Role | Font | Size / Weight |
|------|------|--------------|
| Display heading | Inter | 28 px / 700 |
| Section heading | Inter | 20 px / 600 |
| Card title | Inter | 16 px / 600 |
| Body | Inter | 14 px / 400 |
| Caption / label | Inter | 12 px / 500 |
| Monospace (codes, credentials) | JetBrains Mono | 13 px / 400 |

### 2.3 Phase Badge Colors

| Phase | Badge color |
|-------|-------------|
| Setup | Neutral |
| Registration Open | Blue |
| Event Day | Indigo |
| Judging | Amber |
| Closing | Orange |
| Results Published | Green |
| Archived | Gray |

### 2.4 Spacing & Layout

- Base unit: `4 px`
- Standard card padding: `16 px` (mobile) / `24 px` (desktop)
- Page max-width: `1200 px`, centered
- Sidebar width (desktop): `240 px`
- Minimum tap target: `44 × 44 px`

### 2.5 Iconography

- Icon set: **Lucide Icons** (consistent stroke width; tree-shakable)
- Always pair icons with a visible label on primary actions
- Icon-only controls require a tooltip and an `aria-label`

---

## 3. Information Architecture

### 3.1 Navigation Structure

```
/                               ← Event list (all roles)
/events/[slug]/                 ← Event home (role-aware dashboard)
│
├── Organizer-only
│   ├── /registrations          ← Registration management
│   ├── /decisions              ← Internal decision board
│   ├── /costs                  ← Cost management
│   └── /settings               ← Event settings & phase control
│
├── Organizer + Judge
│   └── /scoring                ← Score entry + leaderboard
│
└── All roles
    ├── /resources              ← Participant resource board
    └── /results                ← Published results & awards

/events/[slug]/results?pub=<token>  ← Public results (no login)
/register/[slug]                    ← Public registration form (no login)
/auth/verify                        ← Magic link landing
```

### 3.2 Role-Based Navigation Tabs

| Tab | Participant | Judge | Organizer |
|-----|:-----------:|:-----:|:---------:|
| Resources | ✅ | ✅ | ✅ |
| Results | ✅ (after publish) | ✅ | ✅ |
| Scoring | ❌ | ✅ | ✅ |
| Registrations | ❌ | ❌ | ✅ |
| Decisions | ❌ | ❌ | ✅ |
| Costs | ❌ | ❌ | ✅ |
| Settings | ❌ | ❌ | ✅ |

---

## 4. Layout Patterns

### 4.1 Shell

```
┌──────────────────────────────────────────────────────┐
│  ☰  Event Management Hub        [Event name] [Avatar] │  ← Top nav (mobile)
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │  Page content                             │
│ (desktop)│                                           │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
│  Resources │ Scoring │ Results │ ···  │               │  ← Bottom nav (mobile)
└──────────────────────────────────────────────────────┘
```

- **Desktop:** fixed left sidebar with nav links and event phase badge
- **Mobile:** collapsible top bar + bottom tab bar (max 4 visible tabs; overflow in "···" sheet)

### 4.2 Standard Page Template

```
┌─────────────────────────────────────┐
│  Page title            [Primary CTA] │
│  Subtitle / breadcrumb               │
├─────────────────────────────────────┤
│  Filter bar / search (if applicable) │
├─────────────────────────────────────┤
│                                     │
│  Content area                       │
│  (table · card grid · form)         │
│                                     │
└─────────────────────────────────────┘
```

### 4.3 Card

```
┌───────────────────────────────┐
│  [Icon]  Title          [Badge]│
│  Subtitle / meta              │
│  ─────────────────────────── │
│  Body content                 │
│                  [Action btn] │
└───────────────────────────────┘
```

---

## 5. Screen Designs

### 5.1 Event List (`/`)

- Grid of event cards, sorted by `starts_at` descending
- Each card: event name, date range, phase badge, role badge ("You are: Organizer")
- "Create event" button visible to users with organizer role on at least one event
- Empty state: illustration + "No events yet — create one or ask an organizer to invite you"

---

### 5.2 Event Home / Dashboard (`/events/[slug]/`)

Role-aware. Content changes by role and current phase.

**Organizer dashboard:**
```
┌──────────────────────────────────────────────────────┐
│  Hackathon 2026              Phase: [Event Day] [→ ]  │
├────────────┬───────────────┬──────────────────────────┤
│ 48         │ 3             │ ₩1,240,000               │
│ Registered │ Pending check │ Spent (₩2M budget)        │
├────────────┴───────────────┴──────────────────────────┤
│  Quick actions                                         │
│  [Check In]  [Reveal Resource]  [Lock Scoring]        │
├────────────────────────────────────────────────────────┤
│  Recent activity feed                                  │
│  · Judge Jiwon submitted scores for Team Alpha         │
│  · Resource "WiFi" revealed                            │
└────────────────────────────────────────────────────────┘
```

**Participant dashboard:**
```
┌──────────────────────────────────────────────────────┐
│  Hackathon 2026              Phase: [Event Day]       │
├──────────────────────────────────────────────────────┤
│  Welcome, Minji!  Team: Byte Busters                 │
├──────────────────────────────────────────────────────┤
│  📡 Resources available: 4       [View Resources →]   │
│  📊 Results: Not yet published                        │
└──────────────────────────────────────────────────────┘
```

---

### 5.3 Registration Form (`/register/[slug]`)

- Public page, no login required
- Rendered from `form_schema` JSONB; fields rendered in order
- Sticky "Register" button at the bottom on mobile
- On submit: spinner → success screen with QR code for check-in + instruction to check email
- Inline field validation (on blur); error messages below each field
- Duplicate email: friendly error — "This email is already registered. Check your inbox for the confirmation."

---

### 5.4 Registration Management (`/events/[slug]/registrations`)

**List view:**
```
┌────────────────────────────────────────────────────────────┐
│  Registrations (48)            [Export CSV]  [Check In ▼]  │
├──────────────────────────────────────────────────────────  ┤
│  🔍 Search by name or email     Filter: All ▼  Status: All ▼│
├────────┬──────────────────┬──────────┬──────────┬──────────┤
│  Name  │  Email           │  Team    │  Status  │  Actions │
├────────┼──────────────────┼──────────┼──────────┼──────────┤
│  Minji │  minji@...       │  Byte... │ ✅ In    │  [···]   │
│  Junho │  junho@...       │  Ctrl+Z  │ Confirmed│  [···]   │
└────────┴──────────────────┴──────────┴──────────┴──────────┘
```

- Row actions: Confirm, Mark as Checked In, Waitlist, View details
- "Check In" dropdown: switch to **check-in mode** (full-screen, large text, camera QR scanner)

**Check-in mode (full-screen on mobile):**
```
┌──────────────────────────────┐
│         CHECK-IN             │
│  ┌────────────────────────┐  │
│  │   [Camera viewfinder]  │  │
│  └────────────────────────┘  │
│         — or —               │
│  🔍 Search name / email      │
│                              │
│  ✅  Minji Kim checked in!   │
│      Team: Byte Busters      │
└──────────────────────────────┘
```

---

### 5.5 Participant Resources (`/events/[slug]/resources`)

**Participant view:**
```
┌──────────────────────────────────────────────┐
│  Resources                                   │
├──────────────┬───────────────────────────────┤
│  📶 WiFi     │  🎫 Trial Accounts  │  🔗 Links│
├──────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐   │
│ │ 📶  Conference WiFi                    │   │
│ │  Network:   HackathonGuest             │   │
│ │  Password:  ████████  [👁 Show]        │   │
│ │                           [📱 QR code] │   │
│ └────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────┐   │
│ │ 🎫  Azure Trial                        │   │
│ │  Code: AZ-TRIAL-XXXX   [Copy]          │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

- Credentials hidden by default; tap "Show" to reveal (prevents shoulder-surfing)
- QR modal opens full-screen for easy scanning
- "No resources available yet" empty state during pre-reveal

**Organizer view:** same cards + "Manage" button per card + "Add Resource" FAB

---

### 5.6 Internal Decisions (`/events/[slug]/decisions`)

```
┌──────────────────────────────────────────────┐
│  Decisions                   [+ New Decision] │
├──────────────────────────────────────────────┤
│  Filter: All ▼   Category: All ▼             │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ [Decided] A/V  ·  Assigned: Jiwon        │ │
│ │ BGM playlist for closing ceremony        │ │
│ │ → Play "Blinding Lights" → "Levitating"  │ │
│ │                            [View history]│ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ [Proposal] Food  ·  Assigned: Junho      │ │
│ │ Catering vendor selection                │ │
│ │ Option A: Kimbap Heaven  ₩350,000        │ │
│ │ Option B: Sandwich Co.   ₩280,000        │ │
│ │ 💬 2 comments              [Decide →]    │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

- History drawer shows all previous versions of a decision
- Comment thread collapses to "N comments" by default

---

### 5.7 Scoring (`/events/[slug]/scoring`)

**Judge view — score entry:**
```
┌──────────────────────────────────────────────┐
│  Scoring                 Round: Main Round   │
├──────────────────────────────────────────────┤
│  Teams: [Team Alpha ▼]                       │
├──────────────────────────────────────────────┤
│  Creativity          (weight ×2)             │
│  ●────────────○──────────── 7 / 10           │
│                                              │
│  Technical Depth     (weight ×3)             │
│  ●──────────────────────○── 9 / 10           │
│                                              │
│  Presentation        (weight ×1)             │
│  ●───────────────○───────── 8 / 10           │
│                                              │
│  Comment (optional)                          │
│  ┌────────────────────────────────────────┐  │
│  │ Strong technical execution...          │  │
│  └────────────────────────────────────────┘  │
│                          [Submit Scores →]   │
└──────────────────────────────────────────────┘
```

- Slider + numeric input for each criterion
- Team switcher at the top; completion indicator per team (✅ / ○)
- "Submit" is disabled until all criteria have a value
- After submission: next unscored team is auto-selected

**Organizer leaderboard view:**
```
┌──────────────────────────────────────────────┐
│  Leaderboard          🔴 Live  [Lock Scoring] │
├────┬──────────────┬──────────┬───────────────┤
│  # │  Team        │  Score   │  Judges done  │
├────┼──────────────┼──────────┼───────────────┤
│  1 │  Byte Busters│  87.4    │  3/3  ✅      │
│  2 │  Ctrl+Z      │  84.1    │  3/3  ✅      │
│  3 │  404 Found   │  84.1 ⚠ │  3/3  ✅      │  ← Tie flag
│  4 │  Hello World │  71.2    │  2/3           │
└────┴──────────────┴──────────┴───────────────┘
│  ⚠ Tie between rank 2 and 3 — resolve manually│
└──────────────────────────────────────────────┘
```

- Auto-refreshes every 10 s; last updated timestamp shown
- Tie rows highlighted in amber; banner prompts organizer to resolve

---

### 5.8 Results (`/events/[slug]/results`)

**Published results — all roles:**
```
┌──────────────────────────────────────────────┐
│  🏆 Hackathon 2026 Results                   │
│  Published 19 Jun 2026                       │
├──────────────────────────────────────────────┤
│  🥇  Byte Busters          87.4 pts          │
│       Project: EcoRoute                      │
│                                              │
│  🥈  Ctrl+Z                84.1 pts          │
│       Project: MemoCast                      │
│       🏷 Best Design                         │
│                                              │
│  🥉  404 Found             84.1 pts          │
│       Project: SpendLens                     │
│       🏷 Most Creative                       │
├──────────────────────────────────────────────┤
│            [Share Results 🔗]  [Export CSV]  │
└──────────────────────────────────────────────┘
```

- Awards badges rendered as colored chips below team name
- "Share Results" copies the public URL to clipboard
- Not-yet-published state shows a placeholder: "Results will be announced here"

---

### 5.9 Cost Management (`/events/[slug]/costs`)

```
┌──────────────────────────────────────────────┐
│  Costs                          [+ Expense]  │
├─────────────────┬────────────────────────────┤
│  Income         │  ₩3,000,000               │
│  Expenses       │  ₩1,840,000               │
│  Net balance    │  ₩1,160,000 ✅            │
├──────────────────────────────────────────────┤
│  By category                                 │
│  Food & Bev  ██████████░░  ₩480K / ₩600K    │
│  Prizes      ██████████████ ₩700K / ₩700K ⚠ │  ← At cap
│  Venue       █████░░░░░░░░  ₩300K / ₩600K   │
├──────────────────────────────────────────────┤
│  Expenses                    [Export CSV]    │
│  ┌───────────────────────────────────────┐   │
│  │ Prizes · 19 Jun · Paid by Junho       │   │
│  │ Award trophies × 3      ₩210,000      │   │
│  │                      [Receipt 🖼] [···]│   │
│  └───────────────────────────────────────┘   │
│                                              │
│  Per-payer summary                           │
│  Junho   ₩560,000  (4 items)                 │
│  Jiwon   ₩340,000  (2 items)                 │
└──────────────────────────────────────────────┘
```

- Category progress bars turn amber at 80 %, red at 100 %
- Receipt thumbnail opens full-size in a modal
- "+ Expense" button opens a slide-up sheet on mobile

---

### 5.10 Settings & Phase Control (`/events/[slug]/settings`)

- **Phase control:** prominent card at the top; current phase shown, with a single "Advance to next phase" button and a description of what will change
- Irreversible phase transitions (e.g., Archive) show a confirmation dialog with the event name typed to confirm
- Form sections: event name/dates, registration form builder (drag-and-drop field ordering), judge management (invite by email), scoring round setup

---

## 6. Key User Flows

### 6.1 Participant Registration

```
Landing page → Registration form → Submit
  → Success screen (QR code + "Check your email")
  → Confirmation email received
  → (Event day) Click magic link in email → Authenticated
  → Resources page
```

### 6.2 Organizer Check-In

```
Registrations tab → "Check In" button → Check-in mode
  → Scan QR from participant's phone
    → ✅ Name + team shown for 2 s → Camera reactivates
  OR
  → Type name → Select from list → Tap "Check In"
    → ✅ Confirmed
```

### 6.3 Judge Scoring

```
Scoring tab → Select team
  → Adjust sliders for each criterion
  → Optionally add comment
  → Submit → Next unscored team auto-selected
  → Repeat until all teams scored
  → "All done" confirmation screen
```

### 6.4 Organizer Publishes Results

```
Settings → Advance phase to "Closing"
  → Scoring tab → "Lock Scoring" → Confirm
  → Resolve any ties manually
  → Results tab → "Publish Results" → Confirm
  → Results visible to all → Share URL copied
```

---

## 7. Component Library (Key Components)

| Component | Variants | Notes |
|-----------|----------|-------|
| `PhaseBadge` | One per phase | Color-coded; used in nav and event cards |
| `StatusBadge` | Pending / Confirmed / Checked In / Waitlisted | For registration rows |
| `ResourceCard` | WiFi / Trial / Link / Text | Credential masking + QR action |
| `ScoreSlider` | Default / Disabled (locked) | Large touch target; syncs with numeric input |
| `LeaderboardRow` | Normal / Tie | Amber highlight on tie |
| `AwardChip` | Any label | Colored chip; shown on results and team detail |
| `BudgetBar` | Normal / Warning / Over | Progress bar with threshold color change |
| `PhaseAdvanceCard` | Per phase transition | Describes consequences; confirmation required |
| `CheckInScanner` | Active / Success / Error | Full-screen camera overlay with status overlay |
| `MagicLinkForm` | Default / Sent / Error | Simple email input; disables after send |

---

## 8. Empty States

| Screen | Empty state message | Action |
|--------|---------------------|--------|
| Event list | "No events yet" | "Create your first event" button |
| Registrations | "No registrations yet" | Share registration link |
| Resources | "No resources available yet" | Organizer: "Add Resource"; Participant: "Check back soon" |
| Decisions | "No decisions logged yet" | "Log a decision" button |
| Leaderboard | "No scores submitted yet" | "Scoring hasn't started" |
| Results | "Results not published yet" | "Check back after judging closes" |
| Cost list | "No expenses recorded" | "Add first expense" |

---

## 9. Accessibility

- WCAG 2.1 AA target
- All interactive elements keyboard-navigable
- Focus ring visible at all times (`outline: 2px solid var(--color-primary)`)
- All form fields have associated `<label>` elements
- Color is never the sole indicator of state (always paired with icon or text label)
- Score sliders expose `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Modal dialogs trap focus and restore on close
- Confirmation dialogs for destructive actions use `role="alertdialog"`

---

## 10. Responsive Breakpoints

| Breakpoint | Min width | Layout change |
|------------|-----------|--------------|
| Mobile | 0 px | Single column; bottom tab bar; slide-up sheets |
| Tablet | 768 px | Two-column content area; sidebar overlay |
| Desktop | 1024 px | Fixed sidebar; multi-column dashboards |
| Wide | 1280 px | Increased content max-width; side-by-side panels |
