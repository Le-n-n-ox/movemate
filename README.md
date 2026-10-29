# MoveMate Host Edition

Record a rental once. Help guests with a photo. Inspect every turnover with a checklist, track what is wrong, and know if the home is ready. An optional AI video check gives hints.

## Run everything (one command)

```bash
docker compose up --build
```

| What | Where |
|---|---|
| App (phone-friendly) | http://localhost:3000 |
| API docs (live contract) | http://localhost:8000/docs |
| Health | http://localhost:8000/api/health |

It works with **no `.env` file**: models run in mock mode (fake but consistent answers).
Click **Load demo data (dev)** on the properties page to get a ready-made property.

To use real models: `cp .env.example .env`, set `MOCK_MODELS=false` and add keys, then `docker compose up --build`.

Test on a real phone: put the phone on the same Wi-Fi, set `NEXT_PUBLIC_API_URL` and `PUBLIC_BASE_URL` in `.env`
to `http://<your-computer-ip>:8000` and `FRONTEND_ORIGIN` to `http://<your-computer-ip>:3000`, restart, open `http://<your-computer-ip>:3000`.

**Upgrading from the first version?** The data model changed. Run `docker compose down -v` once (this deletes local data), then `docker compose up --build`.

## What is built (hackathon slice)

Property details and rules, rooms with nested places, item kind/condition/availability/alternate places, condition history, printable room sheet, inspections with required checks and host-only exceptions, cases (assign, evidence, resolve), readiness report, AI video check as suggestions only.
Not built (later): real login, bookings, notifications, stock ledger, maintenance jobs, dashboards, offline, integrations. See `docs/FRONTEND_GUIDE.pdf` or `docs/BACKEND_GUIDE.pdf`, section A5.

**Nothing here has been run end to end by the author.** The first `docker compose up --build` is the real test: expect small fixes. Start with `docker compose run --rm backend pytest -q`.

## Layout

```
movemate/
  docker-compose.yml     db (Postgres) + backend (FastAPI) + frontend (Next.js)
  .env.example           copy to .env for real keys
  backend/               Python, owner: backend dev
    app/main.py          app entry
    app/schemas.py       API contract (shared!)
    app/routers/         HTTP endpoints
    app/pipeline/        baseline, guest, audit logic
    app/services/models/ mock.py (works now), meta.py (fill in)
    tests/               pytest
  frontend/              Next.js + Tailwind, owner: frontend dev
    app/                 pages
    lib/api.ts           the ONLY place that calls the backend
    lib/types.ts         API contract mirror (shared!)
  docs/
    API_CONTRACT.md      shared endpoint list (shared!)
    MODELS.md            backend fills in on day 1
    FRONTEND_GUIDE.pdf   guide for the frontend dev
    BACKEND_GUIDE.pdf    guide for the backend dev
  data/                  uploads, crops, frames (git-ignored)
```

## Rules for two people

1. Frontend dev only edits `frontend/`. Backend dev only edits `backend/`.
2. Shared files: `backend/app/schemas.py`, `frontend/lib/types.ts`, `docs/API_CONTRACT.md`. Change all three in one PR, both approve.
3. Merge to `main` at least once a day. `docker compose up --build` must always work on `main`.

## Who confirms what

The system only suggests. The cleaner can mark a finding **found** and add a note. Only the host can **confirm a loss** or **dismiss** it.
No login in v1: the role is in the link (`/audit/<id>?role=host` or `?role=cleaner`). Not secure, add auth before real users. Details in the guides, section A6.

## Moved items

An item moved inside its room, or to another room that was filmed in the same audit, is reported as `misplaced` (seen, but not where it belongs).
Film every room in each audit so cross-room moves can be found. Details: guides, Part C.

## Useful commands

```bash
docker compose up --build                 # everything
docker compose logs -f backend            # backend logs
docker compose run --rm backend pytest    # backend tests
docker compose down -v                    # stop and wipe the database
```
