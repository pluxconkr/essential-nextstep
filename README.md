# NextStep

Near-peer mentors and step-by-step roadmaps for first-generation and immigrant high-school students in California. Congressional App Challenge · California.

**One claim.** Every deadline that decides a first-generation student's future is public information. It is useless without two things: knowing which step is next, and having someone one year ahead who already met it. NextStep is a roadmap of concrete, deadline-bearing steps, plus a near-peer mentor who has verified those same steps, plus a weekly local circle where the work gets done. The home screen shows exactly one step.

## What works today (local-first student loop)

| Screen | What it does | Offline |
|---|---|---|
| **Next** (home) | One next step with a countdown, "N mentors at your school did this", progress per track, up to four coming-up steps, your mentor, your circle, the family prompt | Yes |
| **Roadmap** | Every step grouped Overdue / Do now / Next / Later / Done, filtered by track, with "why your roadmap looks different" explained as form choices and goals, never as a status | Yes |
| Step detail | Why it matters, what you need (tickable), how to do it, the official source and resources each with "verified by X on DATE", correction ticket, finish | Yes |
| Finish a step | Four verification paths: mentor confirms, screenshot (private, 90 days), coordinator confirms, self-attest (visibly different) → verified screen, points, badge progress, next step unlocked | Yes (queued) |
| **Mentor** | Thread with your mentor; guarded composer that refuses phone numbers, addresses, handles, off-platform meetings and money before anything is sent; templates instead of a blank box; report flag in the header | Yes (queued) |
| Mentor discovery / profile | Fit as a word and bars (never a bare percentage), the six matching terms with their weights, can-help and will-refer-you lists from verified steps | Yes |
| **Circles** | Recurring meetups with logistics (transit, food, siblings, language, adult present), schematic venue map, RSVP, check-in code, request a circle | Yes |
| **Growth** | Effort points by source, this month, the nine badges (verified vs self-reported), the mentor ladder. No leaderboard. | Yes |
| Profile · Safety · Family view | Goals that regenerate the roadmap; report/block rules and the immigration-data stance; the family view in Spanish with glossary and interpreter / ride / callback requests, shareable as a link or QR | Yes |
| Offline data | What is saved, the queue of writes waiting to send, demo scenarios (labelled), simulate no signal, reset | Yes |

Onboarding asks grade, languages, English-learner status, 18 or older, up to three goals, and the aid-form question as a form choice ("Do you have a Social Security number you can use on aid forms?"). It never asks for status, birthday or a photo.

## What is real and what is not (read this before judging)

- **Real:** the roadmap engine (`src/domain/roadmap.ts`, `deadlines.ts`), the message guard (`guard.ts`), matching score and constraints (`matching.ts`), effort and badge rules (`effort.ts`, `badges.ts`), the content pipeline with its build gates, every screen, offline storage and the write queue, Spanish and English.
- **Content:** 22 steps (College 14, Language & family 7, one exploration step) with official sources and statewide dates (Cal Grant Mar 2, CSU Nov 30, UC Nov 30, decision day May 1). Every step is marked **pending counselor review** and the app says so on screen. District windows in `content/district_calendar.json` are placeholders labelled "demo date".
- **Demo data:** mentors, circles, the chat thread and the student "Ana M." are fabricated (`assets/data/demo/*`), labelled "demo" wherever they appear, and never uploaded. Valley High is fictional.
- **Not built yet:** the server (Supabase behind Expo API routes), sign-in, the coordinator console, mentor mode, staff paging, reminders by push/SMS, the web family page. The plan for all of it is in `.omc/plans/nextstep-v1-production-plan.md`.

## Where the AI is (and is not)

Nowhere in the student's decision path. The guard is a word and pattern list (`src/domain/guard.ts`); matching is six weighted terms you can read on screen; deadlines are rules resolved in `America/Los_Angeles`. The plan allows one optional server route later (chat translation with the original kept, off by default).

## Where the server is (and is not)

Nowhere yet. Everything runs on the phone from `assets/data/content.json` and SQLite. Writes (step done, RSVP, messages, corrections) are queued in `mutations:v1` and shown on the Offline data screen; the API that drains the queue is the next milestone.

## Stack

Expo SDK 57 · expo-router · React Native 0.86 · TypeScript strict · zod · jest-expo. Local storage is `expo-sqlite/kv-store` (synchronous reads, so the first frame renders from disk). No map SDK, no analytics, no API keys on the phone.

## Run it

```bash
npm install
npm run content:build     # content/*.json → assets/data/content.json, with gates
npx expo start            # i / a / w
```

In the app: Profile → Offline data & demo → **Spring** loads the demo student (Feb 7, 2027: Cal Grant in 23 days) with labelled demo data.

## Verify

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (domain/server import boundaries are lint rules)
npm test             # 136 tests: deadlines (DST, time zones), roadmap engine, guard corpus, matching constraints (1,000 random pairs), badges, content gates, i18n parity, token literals, screen smoke tests with zero network
```

## Content

`content/steps.json` is the source of truth (one row per step: owner, source URL, last verified, verify-by, verifier, English and Spanish text, deadline rule, prerequisites, grades). `npm run content:build` refuses a step missing any of those, a step older than 120 days, or English above a grade-6.5 reading level. `content/REVIEW.md` records who reviewed what; nothing is reviewed yet.

## Layout

```
content/            steps, tracks, resources, glossary, badges, crisis resources, district calendar, REVIEW.md
scripts/            build-content.ts (gates + readability)
assets/data/        content.json (built), demo/*
src/domain/         pure TypeScript: types, time, deadlines, content, roadmap, matching, guard, effort, badges, format, ids
src/data/           kv (SQLite), repos (local-first, storage guard)
src/store/          appStore (useSyncExternalStore), derived hooks
src/services/       demo scenarios, network watch
src/i18n/           en, es (parity test)
src/ui/             theme (the only place a colour or size is written), primitives, Screen, icons, widgets
src/app/            expo-router screens
__tests__/          domain, content, i18n, theme literals, screens
```
