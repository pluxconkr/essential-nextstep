# Content review log

Every step ships with `reviewStatus: "pending"` until a named counselor or CBO staff member has checked its deadline, its source and its Spanish text. The app shows "pending review" on those steps. Nothing in this file is a judgment about the content — it is the record of who checked it and when.

| Track | Steps | Reviewer | Date | Notes |
|---|---|---|---|---|
| College path | 14 (+ exploration step) | — | — | Deadlines are the published statewide dates (Cal Grant Mar 2, CSU Nov 30, UC Nov 30, decision day May 1); district windows in `district_calendar.json` are placeholders marked "demo date". |
| Language & family | 7 | — | — | ELPAC window, Seal assessment window and conference dates must come from the district. |
| Glossary | 10 terms | — | — | Written for a grade-6 reading level; needs a bilingual counselor's pass. |
| Crisis resources | 4 | — | — | 988 and Crisis Text Line are national; the school-counselor entry must name the real process at the pilot school. **Must be signed off before any student can message.** |

Summer ownership (spec §19): the CBO partner named here covers verification when school staff are unavailable: ______.

August sweep: run `npm run content:build -- --check` and `scripts/sweep-report.ts` before the school year; every step's `verifyBy` must be after Aug 1.
