# Product Goals

**Status:** Pre-build · **Target MVP:** September 1, 2026

CoachHub is a communication platform for high school and college
baseball coaches — the source of truth for practice plans,
announcements, and travel logistics, replacing ad hoc use of GroupMe
and group texts for that purpose.

## Problem

Baseball programs at the HS/JUCO/NCAA level run team communication
through GroupMe or group texts. That works for casual chat, but breaks
down for everything coaches actually rely on day to day:

- Practice plans get buried in chat history within hours.
- "Read receipts" are just players liking a message — no real
  confirmation anyone saw it.
- Announcements and reminders scroll away and get missed.
- Coaches re-send/re-photograph the same practice plan format every day.
- Travel packing lists and itineraries are rebuilt from scratch every trip.

GroupMe solved chat. It never solved "does my team know what to do
today." CoachHub is scoped to solve exactly that — nothing more.

## The three goals every feature must serve

Every feature in this repo serves one of these. Anything that doesn't
is out of scope for MVP:

1. **Coaches can communicate exactly what players need to do** — today
   and this week.
2. **Players know exactly what they need to do** — without digging
   through a feed.
3. **The interface is dead simple to navigate.**

Use these as the filter for any new feature proposal or scope
discussion: if it doesn't clearly serve one of the three, it's a Phase 2
conversation, not an MVP one.

## In scope for MVP

| Feature                            | Description                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Daily practice plans                | Pinned, dated tab — not a chat feed                                                       |
| Reusable templates                  | Coaches build plans, itineraries, and packing lists from a desktop view and reuse them   |
| Real read receipts                  | Auto-tracked on view, not simulated via message likes                                    |
| Announcements & reminders           | Same pinned, persistent pattern as practice plans                                        |
| Travel itineraries & packing lists  | Templated and reusable across trips                                                      |
| Push notifications                  | Sent on publish, so players don't have to check speculatively                            |
| Team branding                       | Custom colors/logo per team                                                              |

## Explicitly out of scope for MVP

- Coach-to-player chat or team group chat
- Stat tracking
- Video/film sharing
- Parent accounts
- Multi-team org management

GroupMe already covers casual chat well — CoachHub's value is the
source-of-truth layer, not a better chat client. Resist pulling any of
these into MVP scope even if a coach requests it during testing; capture
it as a Phase 2 candidate instead.

## Roadmap

- **MVP (target September 1, 2026):** ship as a PWA, validated with two
  real high school coaching staffs before wider rollout.
- **Phase 2:** native App Store / Play Store distribution. Existing PWA
  users retain their accounts (data lives in Supabase) but install the
  native app separately. Native Expo Push notifications replace/augment
  Web Push at this stage.

## Success signal for MVP

The product is working if, during the pilot with two coaching staffs,
coaches stop re-posting practice plans in GroupMe and players stop
asking coaches "what are we doing today" in person or by text — i.e.
the tool actually replaces the daily information flow it targets, not
just adds a second place to check.
