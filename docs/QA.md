# Acceptance tests (T1–T20) and the demo script

All device tests run on a physical phone before any release. T2's deliverable is a screenshot: airplane-mode icon, empty network log and a working app in one frame. Tests marked *later* need the server milestone.

| # | Test | Procedure | Pass criteria | Status |
|---|---|---|---|---|
| T1 | Cold start offline | Open once → force-quit → airplane mode → launch | Next tab renders the saved roadmap in < 1 s; no spinner; OFFLINE banner | runnable now |
| T2 | Zero network calls | Airplane mode, visit every tab and sub-screen with a proxy recording | Request log is empty (screenshot) | runnable now |
| T3 | Offline writes survive | Airplane mode → finish a step (self), RSVP, send a chat message → force-quit → reboot → launch | All three are still there, labelled "sends when online" | runnable now |
| T4 | Replay once | Reconnect | Each queued write is accepted exactly once (points not doubled) | later |
| T5 | Fresh install offline | Install → airplane mode → launch | Onboarding works; roadmap generates from bundled content | runnable now |
| T6 | Slow network | 3G + 20 % loss | Cache renders first; nothing blocks | later |
| T7 | Wrong deadline never passes | Device clock Mar 3 → Cal Grant overdue; device time zone Asia/Seoul → same dates and days-left | Dates identical to California | runnable now |
| T8 | Verified vs self-reported | Finish one step by self-attest and one with a screenshot | Badge tiles and rows look different; verified screen says which | runnable now (upload path lands with the server) |
| T9 | Guard both ways | Type a phone number, an address, "meet alone", a Venmo request | Composer refuses before send with the notice; nothing stored | runnable now |
| T10 | Report freezes | Report from the chat header | Conversation frozen in the same request; coordinator paged | later |
| T11 | SLA re-page | Leave an urgent report unacknowledged 15 min | Next on-call and admins paged on the channel that fired | later |
| T12 | Onboarding ≤ 4 min | Stopwatch with a real student | Lands on one step | runnable now |
| T13 | Family link | Open the link on a parent's phone, no install | Dates in Spanish, glossary, interpreter request lands with the coordinator | later (in-app preview runnable now) |
| T14 | Circle check-in | Enter the lead mentor's code | +25 points once; second entry refused | runnable now (demo code) |
| T15 | VoiceOver / TalkBack | Next, Step, Chat, Circle, Mentor requests, Onboarding | Every control announced with a sentence label | runnable now |
| T16 | 200 % Dynamic Type | Next, Step, Chat | Nothing clipped; buttons stack | runnable now |
| T17 | Mentor confirms | From the mentor's Requests tab | Student's badge updates | later |
| T18 | Crisis phrase | Type "I want to die" | Resources appear in-thread immediately; counselor paged | later (guard class detected now) |
| T19 | Guardian gate | Under-18 match confirmed with no notice | Nothing announced until the family view is opened | later |
| T20 | Sign-in | Magic link to a pilot-school mailbox; vouch code | Link delivered; code works once | later |

## State matrix — every screen must handle all of these

| State | Expected | Forbidden |
|---|---|---|
| Online · cache present | Render cache → refresh quietly | Spinner |
| Offline · cache present | Render cache + OFFLINE banner + time stamps | Error dialog, blank screen |
| Offline · no cache | Bundled content, onboarding works | "Check your connection" and nothing else |
| Not verified yet | Browse tracks and circles; matching, chat and uploads say "verify to unlock" | Silent failure |
| No mentor yet | Next shows "Find a mentor" cell | Blank mentor card |
| Match pending guardian notice | Callout with "share your family link"; chat not opened | Chat opens early |
| Match frozen | Composer replaced by the freeze callout + rematch offer | Composer |
| Low storage | Downloaded content and message caches dropped first; Offline data says so | Crash, silent loss |

## Demo script (3 minutes, spec §20.2)

1. Profile → Offline data → **Spring**. Home: ONE step — the California Dream Act application, 23 days left, "2 mentors at your school did this".
2. Open the step: why it matters, the document list (the 2024 1040, the ITIN note), the official source "verified Feb 5 by the coordinator". Tap **I finished this step** → choose "Ask my mentor to confirm" → the verified screen says what the school sees and does not.
3. Mentor tab → Daniela's thread: the rules stated in the thread, the ITIN answer, the scope note. Type a phone number: the composer refuses it before send. Type a question: it is stored, labelled "sends when online", and counts as a question asked.
4. Family view: the same deadlines in Spanish, the glossary, three requests, no account. Show the QR.
5. Airplane mode → force-quit → relaunch: every tab still opens. This is the whole claim.
6. Say out loud: logged chat, no 1:1 meetings, mentors 18+, and we never ask for immigration status. Then say what is real and what is mock (README).
