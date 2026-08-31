# Ordinens Tech — Booking App

A premium, dark-mode glassmorphic slot-booking web app for Ordinens Tech. Built with **Vite + vanilla JS & CSS** (no framework), using `localStorage` for demo persistence.

## Quick start

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # production build to dist/
npm run verify     # headless end-to-end check (Chrome)
```

## Routes

| Route              | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `#home`            | Landing page                                     |
| `#services`        | Services & pricing (filter by duration)           |
| `#staff`           | Barbers (pick one → jumps into the booking flow)  |
| `#booking`         | 4-step booking flow (login required)              |
| `#confirmation`    | Confirmation with animated check + iCal download  |
| `#login`           | Login by email or 10-digit phone                  |
| `#admin`           | Admin dashboard (password protected)              |
| `#admin/services`  | Service CRUD                                       |
| `#admin/staff`     | Barber CRUD                                        |
| `#admin/bookings`  | Bookings table with filters & status mgmt          |

**Admin key:** `pentane` (change `ADMIN_PASSWORD` in `src/auth.js`).

## How the booking flow works

1. `#booking` is guarded by login → redirects to `#login` (`pt_next` remembers where you came from).
2. Step-by-step: service → barber → date + time → details.
3. The slot engine (`src/data.js` → `generateSlots`) generates 30-min slots inside a barber's working hours, honoring each service's duration, the barber's weekly off-days, and a 15-min cleanup gap so two bookings never overlap.
4. On confirm the booking is written to `localStorage` (`pt_bookings`) and you land on `#confirmation` with an iCal file ready to download.

## Data & persistence

- Seed data lives in `src/data/services.json` and `src/data/staff.json`.
- Once rewritten (admin CRUD) the lists are stored in `localStorage` under `pt_services` / `pt_staff`.
- Bookings and session state use `pt_bookings`, `pt_session`, `pt_users`; theme preference uses `pt_theme`.

Because this is front-end only, nothing survives a storage clear — swap `src/data.js` + `src/auth.js` for a real API when ready.

## Theming

Dark glassmorphic is the default. The sun/moon button in the header toggles a light theme; the choice persists in localStorage. All colors are CSS variables in `src/styles.css`.

## Notes from the PRD

The PRD (`Pentane_Tech_Barber_Salon_PRD_V2 (1).docx`) marks per-barber selection as MVP out-of-scope — the message plan explicitly includes it, so this build ships the barber selection feature. Payment remains stubbed (open PRD decision).