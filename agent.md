# Event Management Hub — Agent Guide

## Project Overview

A unified tool for managing all information and workflows needed to run a hackathon or similar event. It consolidates everything from registration and internal planning to real-time participant resources, scoring, results, and cost tracking — all in one place.

## Core Modules

### 1. Registration & Personal Information
- Participant registration form (collects name, contact, team info, etc.)
- Stores and manages submitted data securely
- Supports export for attendance sheets or communications

### 2. Internal Decision-Making
- A space for organizers to track internal decisions (e.g., BGM/EDM playlist selection, venue setup choices)
- Log decisions with context and responsible owner

### 3. Participant Resources
- Manage and surface resources provided to participants during the event
- Examples: WiFi credentials, paid service trial codes/accounts, tool access links
- Resources can be toggled visible/hidden based on event phase

### 4. Live Event Data Entry
- Input and manage data generated during the event
- Primary use case: hackathon scoring (teams, judges, criteria, scores)
- Supports real-time updates as judging progresses

### 5. Results & Archive
- Announce final results (rankings, winners, awards)
- Archive event outcomes for future reference
- Exportable summary for post-event reporting

### 6. Cost Management
- Record all event-related expenses and income
- Simple income/expense ledger for budget tracking
- Exportable report for reimbursement or accounting

## Design Principles

- **Single source of truth**: all event data lives in one place, no scattered spreadsheets
- **Role-aware**: distinguish between organizer-only views (internal decisions, costs) and participant-facing views (resources, results)
- **Event lifecycle aware**: features activate/surface based on the current phase (pre-event, during, post-event)
- **Minimal friction**: data entry during a live event must be fast and simple

## Glossary

| Term | Meaning |
|------|---------|
| Participant | Hackathon attendee / team member |
| Organizer | Event staff with full access |
| Resource | Info/credentials provided to participants (WiFi, trial accounts, etc.) |
| Scoring entry | Judge's score for a team against defined criteria |
| Archive | Read-only post-event record of results and decisions |
