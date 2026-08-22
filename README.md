# CoachHub (working title)

A communication platform built for high school and college baseball
coaches — the source of truth for practice plans, announcements, and
travel logistics, in place of GroupMe.

**Status:** Pre-build · **Target MVP:** September 1, 2026

---

## Overview

Baseball programs at the HS/JUCO/NCAA level run team communication through
GroupMe or group texts. That works for casual chat, but breaks down for
everything coaches actually rely on day to day:

- Practice plans get buried in chat history within hours
- "Read receipts" are just players liking a message — no real confirmation
- Announcements and reminders scroll away and get missed
- Coaches re-send/re-photograph the same practice plan format every day
- Travel packing lists and itineraries are rebuilt from scratch every trip

GroupMe solved chat. It never solved "does my team know what to do today."
CoachHub is scoped to solve exactly that.

## Product Goals

Every feature in this repo serves one of three goals. Anything that
doesn't is out of scope for MVP.

1. **Coaches can communicate exactly what players need to do** — today and this week.
2. **Players know exactly what they need to do** — without digging through a feed.
3. **The interface is dead simple to navigate.**

## Features

| Feature                            | Description                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Daily practice plans               | Pinned, dated tab — not a chat feed                                                    |
| Reusable templates                 | Coaches build plans, itineraries, and packing lists from a desktop view and reuse them |
| Real read receipts                 | Auto-tracked on view, not simulated via message likes                                  |
| Announcements & reminders          | Same pinned, persistent pattern as practice plans                                      |
| Travel itineraries & packing lists | Templated and reusable across trips                                                    |
| Push notifications                 | Sent on publish, so players don't have to check speculatively                          |
| Team branding                      | Custom colors/logo per team                                                            |

**Explicitly out of scope for MVP:** coach-to-player chat, team group chat,
stat tracking, video/film sharing, parent accounts, multi-team org
management. GroupMe already covers casual chat well — CoachHub's value is
the source-of-truth layer, not a better chat client.

## Tech Stack

| Layer                           | Choice                                               |
| ------------------------------- | ---------------------------------------------------- |
| UI (mobile, coach desktop, web) | React Native + Expo                                  |
| Database / Auth / Realtime      | Supabase (Postgres)                                  |
| Frontend hosting                | Vercel                                               |
| Backend hosting                 | Supabase managed infrastructure                      |
| Push notifications              | Web Push API (Expo Push planned for native, Phase 2) |
| Distribution                    | Progressive Web App (PWA) for MVP                    |

**Why PWA first:** a single Expo codebase produces the mobile UI, the
coach desktop view, and the PWA web build. Shipping as a PWA removes the
App Store review timeline and Apple Developer account as launch
dependencies. Native distribution is a scoped Phase 2 step once the
product is validated.

**Why Supabase over Firebase:** the data model is inherently relational
(Team → PracticePlan → ReadReceipt), which Postgres fits better than a
NoSQL document store. Supabase also bundles auth, row-level security
(for team-scoped data), and realtime updates (live read-receipt counts)
out of the box.

## Project Structure

```
/app                      # Expo app — shared UI for mobile, desktop, and PWA
  /screens
    Today.tsx
    Week.tsx
    Travel.tsx
    Team.tsx
    Templates.tsx          # coach-facing, desktop
/supabase
  /migrations              # Postgres schema, version-controlled
  /functions                # edge functions (e.g. notify-on-publish)
```

## Getting Started

```bash
npm install
npx expo start --web
```

Requires a linked Supabase project (`supabase link`) and a `.env`
populated from `.env.example`. See
[`documentation/development-guide.md`](./documentation/development-guide.md)
for full local setup, including running migrations and seeding data.

## Documentation

See [`documentation/`](./documentation) for the full set:

- [`documentation/development-guide.md`](./documentation/development-guide.md) — setup, running the app, testing, coding practices
- [`documentation/architecture.md`](./documentation/architecture.md) — tech stack, project structure, data model
- [`documentation/goals.md`](./documentation/goals.md) — product scope and roadmap

## Roadmap

- **MVP (target Sep 1, 2026):** PWA, tested with two real high school
  coaching staffs before wider rollout.
- **Phase 2:** native App Store/Play Store distribution; existing PWA
  users retain their accounts (data lives in Supabase) but install the
  native app separately.
