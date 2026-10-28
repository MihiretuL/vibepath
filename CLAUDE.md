# Pathzu (vibepath)

AI concierge that turns a mood + location into a 3-step local route. Monorepo, active branch: `v2`.

## Architecture

```
Browser (Next.js, Vercel)
   │  POST /api/route, /api/swap, GET /api/route/{id}, /api/events, /api/checkout
   ▼
FastAPI (Render: https://pathzu-backend.onrender.com)
   ├─ Supabase  → `profiles`, `itineraries` tables
   ├─ Gemini    → itinerary + swap generation (gemini-2.5-flash, JSON mode)
   ├─ Google Places → text search per step for photo, lat/lng, address
   ├─ Ticketmaster Discovery → live events injected into the Gemini prompt
   ├─ WeatherAPI → live weather injected into the prompt
   └─ Stripe → checkout + webhook (grants `is_pro` / `tourist_pass_expires_at`)
```

## Repo layout

- `frontend/` — Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `lucide-react` icons. Deployed on **Vercel**.
  - `src/app/page.tsx` — generator (controls, results, share, save to vault, swap)
  - `src/app/route/[id]/page.tsx` — public shared route view
  - `src/app/vault/page.tsx` — user's saved routes
  - `lib/supabase.ts` — browser Supabase client; `lib/pathzu.ts` — shared route types and helpers (city default, Uber/Maps links, share text)
  - Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `backend/` — Python FastAPI. Deployed on **Render**.
  - `app/main.py` — endpoints, paywall, Stripe, Supabase writes
  - `app/services/gemini_engine.py` — prompt building, weather, Places photo lookup, Ticketmaster, swap
  - `app/api/routes.py`, `app/services/logistics.py`, `app/core/config.py` — currently empty
  - Env (`backend/.env`, never commit or print): `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `TICKETMASTER_API_KEY`, `WEATHER_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Data contract

`POST /api/route` body (`VibeRequest`): `timing, transit, distance, party, budget, mood, prompt, time_context, location, city, user_id`.
Response: `{ reply: <JSON string>, id, route_id }`. `reply` parses to either `{ error }` (`PAYWALL_HIT` has `message`) or:

```
{ title, vibe, weather, outfit_tip, city,
  plan: [{ time, title, place, description, cost_estimate, action,
           image_url, lat, lng, formatted_address }] }
```

The whole object is stored in `itineraries.full_json` (plus `title`, `vibe`, `user_id`, `is_saved_to_vault`). The frontend attaches `itinerary.id` after generation.

Photos: `image_url` is `{backend}/api/photo?reference=...`, a FastAPI endpoint that answers with a **302 redirect** to the signed Google image URL, so the Places API key never reaches the browser.

## Critical coding rules

1. **Always use `next/image` with `unoptimized={true}` for `step.image_url`.** Images come from our FastAPI 302 redirect proxy to Google Places; Next's optimizer cannot follow that and breaks. Never use a raw `<img>` or drop `unoptimized`.
2. **Always keep backward compatibility with older saved routes** in Supabase `full_json`, which may lack `city`, `lat`, `lng`, or `formatted_address`. Default `city` to `"Chicago, IL"` when undefined (use `getCity()` from `lib/pathzu.ts`), and treat the coordinate and address fields as optional everywhere.

## Commands

- Frontend: `cd frontend && npm run dev` / `npm run build` (must pass with zero TS errors)
- Backend: `cd backend && uvicorn app.main:app --reload`; syntax check with `python -m py_compile app/main.py app/services/gemini_engine.py`
- Note: `frontend/AGENTS.md` warns this Next.js version has breaking changes; check `frontend/node_modules/next/dist/docs/` before using unfamiliar APIs.
