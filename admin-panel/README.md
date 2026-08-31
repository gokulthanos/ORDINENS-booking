# Ordinens Tech — Admin Panel

The **Admin Panel** is the internal control center of the Ordinens Tech platform. It is a **completely separate Vite application** — independent from the Customer App and Owner App.

```
BOOKING/
├── customer-app/   (unchanged)
├── owner-app/      (unchanged)
├── admin-panel/    ← you are here
├── backend/        (future common REST API)
└── database/       (future common MySQL)
```

## Run

```bash
npm install
npm run dev        # http://localhost:5175
npm run build
npm run preview    # http://localhost:4175
```

## What this app does

- **Admin login** with role-based access control (dedicated `admin_session`).
- **Dashboard** — today's platform activity, key statistics, recent bookings.
- **Customers** — search, filter, sort, detail view with booking history.
- **Shops** — platform-wide shop management, activate/deactivate with confirmation.
- **Barbers** — view and activate/deactivate.
- **Services** — platform-wide service visibility and status control.
- **Bookings** — filters, details, valid status transitions only.
- **Payments** — visibility of advance / platform fee / owner share (stubbed).
- **Issues** — future-ready support workflow; no fabricated issues.
- **Reports** — basic counters derived from actual data.
- **Settings** — admin profile, preferences, theme, security, logout.

## Architecture notes

- Three separate frontends will eventually talk to **ONE common backend** and **ONE common MySQL database**.
- The data layer (`src/data.js`) is thin and reads like a REST client so it can be replaced by `GET /api/admin/...` calls later.
- Prototype data is persisted to `localStorage` using `admin_*` keys to avoid collisions.
- The payment gateway, real analytics, and real-time notifications are **NOT implemented** in this phase.

## Demo admin credential

A demo admin password lives only inside the prototype authentication layer (`src/auth.js`). It is never shown in the UI and is not shared with customers or owners.
