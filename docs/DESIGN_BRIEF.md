# MoveMate — Frontend Design Brief

**Mood:** calm, trustworthy, hotel check-in app feel. One accent colour: teal (`oklch(0.54 0.115 188)`). Font pair: **Bricolage Grotesque** (display/headings) + **Figtree** (body). Background is cool seafoam so white cards lift off the page.

**User:** a tired guest or a cleaner standing in a room. Big buttons (48px tap targets, `min-height: 3rem`), little text, high contrast, one primary action per screen, never word a finding as an accusation.

**Example apps to copy the feel from:**
- Airbnb host/guest app — calm property cards, big clear actions
- Hotel check-in apps — trustworthy, minimal, one thing at a time
- Headspace / Calm — soft teal, generous spacing, reassuring tone

**Stack already in place (do not change):**
- Vite + React + TypeScript + React Router (NOT Next.js — the README/guide says Next.js but the code is Vite)
- Tailwind CSS v4, shadcn/ui components (`Button`, `Card`, `Input`, `Dialog`, `Tabs`, `Select`, `Checkbox`, `Label`, `Textarea`, `Skeleton`, `Badge`)
- `lucide-react` icons, `motion` for transitions, `sonner` toasts
- `lib/api.ts` is the ONLY place that calls the backend — never change API calls
- `lib/types.ts` is the shared contract mirror — never rename or remove a field

**Screens (do one at a time, commit after each):**
1. Properties (`/properties`) — list + create + "Load demo data"
2. Property (`/properties/:id`) — details, rooms, start inspection/audit, cases link, guest link
3. Room (`/properties/:id/rooms/:roomId`) — scan, items, condition, places
4. Inspection (`/inspection/:id`) — per-room checklist, complete / exception
5. Readiness (`/inspection/:id/readiness`) — printable report
6. Cases (`/properties/:id/cases`, `/cases/:caseId`) — list + detail + resolve
7. Audit (`/audit/:auditId`) — AI video check, suggestions only
8. Guest (`/g/:token`) — house rules, snap a photo, read steps

**Every screen keeps all four states:** loading, empty, error, success. Phone-first at 375px wide. Verify each screen with Playwright screenshots at 375px before moving on. Never touch `lib/types.ts` or `lib/api.ts`.
