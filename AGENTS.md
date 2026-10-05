# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code that touches an Expo, EAS or React Native API. Install packages with `npx expo install <pkg>` so versions match the SDK.
Spec: ../docs/4_California.HTM. Plan: .omc/plans/nextstep-v1-production-plan.md. Work inside this repo and that spec only.
Rules: src/domain has no React/RN/Expo imports. src/server is imported only from src/app/api. Secrets never reach the client.
No in-memory state in API routes (worker runtime). Every non-student response goes through src/server/projections.ts.
Content comes from content/*.csv through scripts/build-content.ts — never type a deadline in code.
One step on the home screen. Every number is qualified. Demo data is labelled. No spinners. Offline is not an error.
Safety code paths (guard, freeze rules, onboarding gate, guardian gate, scope check, paging) are never deferred or flagged off.
Before touching src/server/translate.ts load the claude-api skill.
Run `npm run typecheck && npm run lint && npm test` before declaring any task done.
