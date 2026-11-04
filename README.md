# MoveMate Host Edition

Quick start for people who know Docker (about 6 commands):

```
git clone https://github.com/Le-n-n-ox/movemate.git
cd movemate
docker compose up --build
# open http://localhost:3000  -> Load demo data (dev)
# phone: set VITE_API_URL=http://YOUR_IP:8000 in .env, rebuild, open http://YOUR_IP:3000
```

Contents: [1 What this is](#1-what-this-is) · [2 What you need first](#2-what-you-need-first) · [3 Get the code](#3-get-the-code) · [4 Configure](#4-configure) · [5 Start it on your computer](#5-start-it-on-your-computer) · [6 Try it on the computer](#6-try-it-on-the-computer) · [7 Use it on your phone](#7-use-it-on-your-phone) · [8 Roles and links](#8-roles-and-links) · [9 Using real vision models](#9-using-real-vision-models) · [10 Troubleshooting](#10-troubleshooting) · [11 Project docs and contribution](#11-project-docs-and-contribution)

---

## 1. What this is

Goal: record a rental once, then run turnovers from that record.

MoveMate has host pages (properties, rooms, scans, inspections, readiness report), cleaner pages (checklist, cases), and guest pages (photo help via `/g/<token>` link). Scans create suggested items with boxes/crops; inspections confirm them; readiness shows if the home is ready. The AI video check only suggests — the host always confirms loss, dismisses, or completes.

Check it worked: you can open Properties at `http://localhost:3000` after Step 5.

---

## 2. What you need first

Goal: have Git, Docker with Compose, an editor, a phone, and a computer on the same Wi-Fi.

| Tool | Download | Verify |
|---|---|---|
| Git | https://git-scm.com/downloads | `git --version` |
| Docker Desktop | https://www.docker.com/products/docker-desktop | `docker --version` then `docker compose version` |
| VS Code | https://code.visualstudio.com | `code --version` |
| Phone + computer | same Wi-Fi, not guest network | — |
| API keys (optional) | Meta / NVIDIA provider | only if you set `MOCK_MODELS=false` (Step 4) |

Check it worked: all three verify commands print a version.
If it fails: install, restart terminal/Docker Desktop, run again. Docker must be running (whale icon steady).

---

## 3. Get the code

Goal: clone the repo and know the folders.

1. Clone:
```
git clone https://github.com/Le-n-n-ox/movemate.git
cd movemate
```
You should see: `docker-compose.yml`, `backend/`, `frontend/`, `docs/`, `data/`.
2. Tour:
   - `backend/` — FastAPI + Postgres, pipelines, migrations. Start: `backend/app/main.py`.
   - `frontend/` — Vite + React app. API calls only in `frontend/src/lib/api.ts`.
   - `docs/` — `API_CONTRACT.md`, `MODELS.md`, `BACKEND_GUIDE.md`, `FRONTEND_GUIDE.md`.
   - `data/` — uploads, crops, frames (git-ignored, do not commit).
3. Pull updates: `git pull`
4. Push your changes: `git add .`, `git commit -m "message"`, `git push`

Check it worked: `ls` shows the folders above.
If it fails: check the clone URL/repo access; use `git status` to see your branch.

---

## 4. Configure

Goal: create `.env` so mock mode (no keys) or real models work.

1. Copy the example:
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
2. You should see `.env` created. Never commit it.

| Variable | What it does | Example | Required |
|---|---|---|---|
| `APP_ENV` | dev/prod | `dev` | optional |
| `PUBLIC_BASE_URL` | backend public URL | `http://localhost:8000` | for phone: use YOUR_IP |
| `FRONTEND_ORIGIN` | allowed frontend origin (CORS) | `http://localhost:3000` | for phone: use YOUR_IP |
| `VITE_API_URL` | frontend calls this API URL (see Step 7c) | `http://localhost:8000` | for phone: use YOUR_IP |
| `NEXT_PUBLIC_API_URL` | legacy alias in example, Vite uses `VITE_API_URL` | `http://localhost:8000` | optional |
| `VITE_APP_URL` / `NEXT_PUBLIC_APP_URL` | frontend/app URL for links | `http://localhost:3000` | optional |
| `MOCK_MODELS` | `true`=fake answers no keys, `false`=real models | `true` | optional |
| `META_API_BASE` | Meta-compatible endpoint base | `https://api.meta.ai/v1` | only if `MOCK_MODELS=false` |
| `META_API_KEY` | provider key | `YOUR_KEY_HERE` | only if real |
| `META_SEGMENT_MODEL` | segmentation model | `sam-3.1` | optional |
| `META_LABEL_MODEL` | label model | `muse-image` | optional |
| `META_REASON_MODEL` | reasoning/guide/judge model | `muse-spark` | optional |
| `META_VERIFY_MODEL` | verify-only model (empty = reason model) | `` | optional |
| `VISION_LLM_URL` / `VISION_LLM_KEY` | Baseten/Modal VLM for audit judge | `` | optional |
| `FRAMES_PER_SECOND` | ffmpeg fps | `2` | optional |
| `MAX_FRAMES_PER_ROOM` | frame cap | `40` | optional |
| `MODEL_TIMEOUT` | per model call seconds | `30` | optional |
| `MODEL_MAX_SIDE` / `MODEL_JPEG_QUALITY` | resize before model call | `1024` / `80` | optional |
| `BASELINE_CONCURRENCY` | parallel segment/verify | `4` | optional |

Real models: set `MOCK_MODELS=false`, fill `META_API_BASE`/`META_API_KEY`, keep model names from `.env.example` unless your provider uses different IDs. The repo supports a Meta-compatible `/responses` endpoint and an OpenAI-compatible VLM via `VISION_LLM_URL` (Baseten/Modal); it does not have a separate NVIDIA NIM setting in `.env.example` — use your NIM endpoint as `META_API_BASE` if it exposes `/responses`, otherwise it will not work. See `docs/MODELS.md`.

Check it worked: `cat .env` (Windows: `Get-Content .env`) shows your values, no secrets in git: `git status` should not list `.env`.
If it fails: variable name wrong or file not saved — Docker reads `.env` at `docker compose up` time, restart after changing.

---

## 5. Start it on your computer

Goal: run db + backend + frontend with one command.

1. Start:
```
docker compose up --build
```
First build takes 2–5 minutes (pulls Postgres, pip, npm). You should see `VITE ready` and backend `Application startup complete` (alembic migrations run on startup).
2. Open:
   - App: http://localhost:3000
   - API docs: http://localhost:8000/docs
   - Health: http://localhost:8000/api/health — should return `{"status":"ok",...,"active_jobs":0}`
3. First-run demo: on Properties click **Load demo data (dev)**. You should see a seeded property with rooms/items.
4. Logs: `docker compose logs -f backend`, `docker compose logs -f frontend`, `docker stats`
5. Stop: `docker compose down` (keeps data). Reset database (deletes all local data): `docker compose down -v` then `docker compose up --build`

Check it worked: `/api/health` returns ok, Properties page loads.
If it fails: port in use (change host port or stop other app), Docker not running, or open `docker compose logs` for the failing service name.

---

## 6. Try it on the computer

Goal: complete one scan + inspection.

1. Properties → open demo property.
2. Open a room (e.g. Living room).
3. Scan: **Item photo** (single item) or **10-second sweep** video. Wait for background job progress ("Choosing frames", "Finding items in frame 3 of 8", "Listing items", "Locating items…") going to 100%.
4. Review: "Item 1 of N" — check crop/name/quantity, **Confirm** (or Not an item / Skip). Flagged items show **Check this one** (never hidden). "Seen in X of Y frames" shows video evidence.
5. Draw box if needed: drag on photo → Save (PATCH bbox, crop regenerates).
6. Run inspection: start inspection on property, walk checklist, add photo for high-value items.
7. Readiness: open readiness report — room-by-room ready / with exceptions / not ready.
8. Guest (optional): copy guest link `/g/<token>`, upload a photo, see matched guide.

Check it worked: items move suggested → confirmed, readiness updates.
If it fails: scan failed with error — see Troubleshooting; mock mode needs no keys.

---

## 7. Use it on your phone

Goal: same app on phone over LAN.

### a. Same Wi-Fi
Phone and computer on same network, not guest Wi-Fi (guest isolates devices). Check it worked: you can ping the PC IP from phone browser (see e).

### b. Find computer IP
- Windows: `ipconfig` → IPv4 Address (e.g. `192.168.1.8`)
- macOS: System Settings → Wi-Fi → Details, or `ipconfig getifaddr en0`
- Linux: `hostname -I` or `ip a`

You should see an address like `192.168.x.x`.

### c. Set IP variables and rebuild
In `.env` set:
```
PUBLIC_BASE_URL=http://YOUR_IP:8000
FRONTEND_ORIGIN=http://YOUR_IP:3000
VITE_API_URL=http://YOUR_IP:8000
```
Replace YOUR_IP with Step b IP. Restart with `docker compose up --build` (frontend env is baked at dev-server start; `NEXT_PUBLIC_`/`VITE_` changes need rebuild — the repo uses `VITE_API_URL` for Vite, `NEXT_PUBLIC_API_URL` is a legacy alias in the example).
Check it worked: `docker compose exec frontend env | grep VITE_API_URL` shows YOUR_IP.

### d. Firewall
Allow TCP 3000 and 8000 inbound.
- Windows: allow prompt on first run, or Defender Firewall → Allow app → Docker, plus manual rule for ports 3000/8000 (Private profile).
- macOS: allow incoming connections prompt for Docker/Python.
Check it worked: `curl http://YOUR_IP:8000/api/health` from PC returns ok.

### e. Open on phone
Open `http://YOUR_IP:3000` on phone. App should load. Test images: open a crop/source image URL from an item — it should show, not 404. Plain HTTP loads images because they are served as `<img>` from the backend `/media` path, not via the page origin check.

### f. Camera
File picker photos over plain HTTP work on phones (choose from gallery/camera app). Live `getUserMedia` camera in browser needs HTTPS on most phones — this repo does not require live camera (it uses file picker uploads). Simplest HTTPS option if you need it: tunnel the frontend with ngrok/Cloudflare Tunnel (e.g. `ngrok http 3000`), update `FRONTEND_ORIGIN`/public URLs to the tunnel URL, rebuild/restart. Risks: public URL is internet-exposed — stop tunnel when done, do not share with strangers.

### g. Add to home screen
- Android Chrome: ⋮ → "Add to Home screen" / "Install app"
- iPhone Safari: Share → "Add to Home Screen"
Check it worked: icon appears on home screen, opens full-screen. Not built yet: full PWA offline — this just creates a shortcut.

### h. Test phone flow
Scan a photo, do a 10-second sweep, review items, draw a box, run an inspection, open guest link from another phone. Check it worked: progress banner persists if you leave/return (server job + `GET /rooms/:id/captures`).

---

## 8. Roles and links

Goal: know who can do what.

- **Host**: creates property/rooms, confirms items, confirms loss/dismiss, completes inspection, sees readiness.
- **Cleaner**: walks checklist, marks found, adds notes/photos, opens cases. Created via role in URL (`?role=cleaner`).
- **Guest**: opens `/g/<token>` link (created per property stay), uploads photo, gets guide. No account.

The role switcher in the UI and `?role=` links are a **stand-in, not real security** — anyone with the link can switch role. Do not use for real tenants without adding auth.

Check it worked: changing role changes visible actions (host-only buttons appear for host).

---

## 9. Using real vision models

Goal: understand mock vs real.

- `MOCK_MODELS=true` (default): deterministic fake segment/label/judge, near-instant, no keys, no cost. Demo and tests use this.
- `MOCK_MODELS=false`: real calls to `META_API_BASE` with `META_API_KEY`. Costs/limits are provider-side (check your provider dashboard). Rate limits: client logs `429` and retries once with backoff; other 5xx become readable errors. Test with 2–3 photos first.
- Speed/quality settings: `FRAMES_PER_SECOND`, `MAX_FRAMES_PER_ROOM` (kept ~8 sharp frames), `MODEL_MAX_SIDE=1024`, `MODEL_JPEG_QUALITY=80`, `BASELINE_CONCURRENCY=4`, `MODEL_TIMEOUT=30`, `SEGMENT_MIN_SCORE`, `AUDIT_MODE`. See `docs/MODELS.md` for per-stage models and smoke test (`python scripts/try_models.py --image ...`).

Check it worked: `/api/health` shows `mock_models:false`, logs show `model call /responses size=KB status=200 …s`.
If it fails: invalid key (401), no credits (402/429), wrong model ID (404), region block — see Troubleshooting.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Phone blank / endless skeletons | API URL still `localhost` on phone, or backend down | Set Step 7c IP vars, rebuild, hard-refresh; check `/api/health` |
| Images do not load on phone | `PUBLIC_BASE_URL` still localhost | Set to YOUR_IP:8000, restart backend |
| CORS error in console | `FRONTEND_ORIGIN` wrong/missing | Set to `http://YOUR_IP:3000`, restart backend |
| Docker not running / port in use | Docker Desktop stopped or 3000/8000 taken | Start Docker, `docker compose ps`, stop other app or change host port |
| Containers keep restarting | code change with `--reload`, or DB migration lock | `docker compose logs backend`, wait, check alembic; non-dev: remove `--reload` |
| Changing `.env` has no effect | frontend env baked at start | `docker compose up --build` again |
| DB errors after update | schema changed, volume old | `docker compose down -v` (deletes data) or add migration in `backend/alembic/versions/` |
| Scan very slow / timeout | real model latency, many frames | lower `FRAMES_PER_SECOND`, test mock first, check timing log line |
| Model returns errors / nothing | bad key, no credits, rate limit, region | verify key/model in provider dashboard, check logs for 401/429 |
| "Failed to create API key" | provider UI/region, not this repo | create key in provider dashboard, copy exactly, restart |
| IP changed after Wi-Fi reconnect | DHCP gave new IP | update Step 7c vars, rebuild, reopen phone |

---

## 11. Project docs and contribution

Docs: `docs/API_CONTRACT.md` (shared endpoint list), `docs/FRONTEND_GUIDE.md`, `docs/BACKEND_GUIDE.md` (PDFs), `docs/MODELS.md` (model verification), `docs/DESIGN_BRIEF.md`.

Working in parallel: frontend only touches `frontend/`, backend only `backend/`. Contract change rule: update `backend/app/schemas.py`, `frontend/src/lib/types.ts`, and `docs/API_CONTRACT.md` in the same pull request, both approve.

Tests (real commands):
```
docker compose run --rm backend pytest -q
cd frontend && npm run test:layout
cd frontend && npm run build
```
Also: Playwright bbox alignment at `frontend/e2e/bbox.spec.ts`.

Known limitations (prototype): no real auth (role in URL), no bookings/notifications/offline, guest link is unauthenticated, live-provider accuracy and costs not yet measured, single uvicorn worker (code change restarts and interrupts scans).

---

## Quick reference

```
git clone https://github.com/Le-n-n-ox/movemate.git
cd movemate
docker compose up --build
# PC:   http://localhost:3000
# Phone: set VITE_API_URL/PUBLIC_BASE_URL/FRONTEND_ORIGIN to http://YOUR_IP:8000 / :3000 in .env, rebuild, open http://YOUR_IP:3000
```
