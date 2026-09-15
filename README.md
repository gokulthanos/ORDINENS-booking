# Ordinens Tech — Booking Platform

Customer-facing booking app for Ordinens Tech, built as a **React Native + Expo** application using **TypeScript**, **Expo Router**, and **Supabase**.

## Quick start

```bash
cd customer-app
npm install
npx expo start        # dev server (Expo Go / emulator / web)
```

Other useful commands inside `customer-app/`:

```bash
npx tsc --noEmit       # TypeScript check
npx expo-doctor        # project health check
npm run lint           # ESLint
npx expo start --android
npx expo start --ios
```

## Project layout

```
customer-app/
├── app/                      # Expo Router screens
│   ├── (auth)/index.tsx      # Login / Register
│   ├── (tabs)/               # Home, Search, Bookings, Profile
│   ├── shop/[id].tsx         # Shop details + services
│   └── booking/              # Booking form + confirmation
├── src/
│   ├── components/           # ShopCard, ServiceCard, BookingCard, EmptyState, LoadingState
│   ├── constants/theme.ts    # Colors, spacing, shadows
│   ├── data/                 # Seed shops / services / staff
│   ├── hooks/useAuth.tsx     # Auth context (Supabase session)
│   ├── lib/supabase.ts       # Supabase client (AsyncStorage persistence)
│   ├── services/             # Supabase data layer with offline fallback
│   ├── types/                # TypeScript interfaces
│   └── utils/                # Booking slot engine, formatters, storage helpers
├── assets/                   # Icons, splash & branding
├── app.json                  # Expo config
├── .env                      # Supabase credentials (EXPO_PUBLIC_*)
```

## How the booking flow works

1. Customers log in with a phone number or email (`(auth)` screen).
2. Home/Search surfaces live shops; a shop page lists its services.
3. The booking screen enforces a **3-day window** and splits each day into
   **Morning / Afternoon / Evening** periods.
4. The slot engine (`src/utils/dataUtils.ts`) generates 30-minute slots inside
   working hours, honoring breaks, holidays, weekly off-days, service duration,
   and shop capacity. Unavailable periods are disabled.
5. Confirming a booking requires an **advance payment** (20% of the service price,
   currently a simulated flow — payment gateway integration pending).
6. The booking is written to Supabase with offline fallback, and appears under
   **My Bookings** with status.

## Data & persistence

- Live data comes from **Supabase** (shops, services, bookings).
- If Supabase is unreachable, the app falls back to seed data
  (`src/data/*.json`) and local storage (`@react-native-async-storage/async-storage`).

## Configuration

Copy `.env` values from the Supabase project. The client uses:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```