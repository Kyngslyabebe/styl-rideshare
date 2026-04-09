# Styl Rideshare

A driver-first rideshare platform with three apps: a Driver app, a Rider app, and an Admin panel. Low-commission model where drivers keep the majority of their earnings.

## Tech Stack

**Mobile Apps:** React Native, Expo, TypeScript  
**Admin Panel:** Next.js 15 (App Router), TypeScript, CSS Modules  
**Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions, RLS)  
**Payments:** Stripe Connect Express (driver payouts, rider charges)  
**Maps:** Google Maps Platform (directions, geocoding, distance matrix)  
**Notifications:** Expo Push Notifications  
**Deployment:** Vercel (admin), Supabase (edge functions)

## Features

### Rider App
- **Ride Booking** — Set pickup/dropoff with Google Places autocomplete
- **Real-Time Tracking** — Live driver location on map during ride
- **Fare Estimates** — Upfront pricing by ride type (Standard, Comfort, XL)
- **Payments** — Card-only via Stripe, promo codes with automatic discounts
- **Ride History** — Past trips with receipts, ratings, and fare breakdowns
- **Rewards Program** — Earn points per mile, redeem for ride credits
- **Email Receipts** — Styled HTML receipt after every completed ride

### Driver App
- **Go Online** — Toggle availability with real-time location broadcasting
- **Ride Matching** — Automatic matching to nearest available driver within radius
- **Navigation** — Turn-by-turn directions to pickup and dropoff
- **Earnings Dashboard** — Daily/weekly/monthly breakdown with instant payout option
- **Instant Payouts** — Cash out to bank instantly via Stripe (1.5% fee)
- **Subscription Model** — Weekly subscription collected incrementally from ride earnings
- **Vehicle Management** — Register and manage vehicle details

### Admin Panel
- **Dashboard** — Real-time stats: active drivers, rides today, revenue, ratings
- **User Management** — View, search, and manage riders and drivers
- **Driver Approval** — Review and approve/reject driver applications
- **Ride Monitoring** — Live ride tracking and ride history
- **Revenue Analytics** — Earnings, platform fees, and payout tracking
- **Support Tickets** — Customer support queue with priority and status management
- **Settings** — Configure fare rates, commission, cancellation fees, subscription model
- **Promo Codes** — Create and manage promotional discount codes

## Project Structure

```
styl-rideshare/
├── apps/
│   ├── driver/           # React Native/Expo driver app
│   │   └── src/
│   │       ├── screens/  # Ride, Earnings, Profile, Vehicle screens
│   │       ├── hooks/    # useActiveRide, useOnlineStatus, useLocation
│   │       ├── components/
│   │       └── navigation/
│   ├── rider/            # React Native/Expo rider app
│   │   └── src/
│   │       ├── screens/  # Booking, Tracking, History, Rewards screens
│   │       ├── hooks/    # useActiveRide, useGeolocation
│   │       ├── components/
│   │       └── navigation/
│   └── admin/            # Next.js admin dashboard
│       └── src/
│           ├── app/admin/ # Dashboard, Users, Drivers, Rides, Settings pages
│           ├── components/
│           └── lib/       # Supabase client
├── packages/
│   └── shared/           # Shared types, constants, utilities
├── supabase/
│   ├── migrations/       # Database schema and RLS policies
│   └── functions/        # Edge functions (match-driver, process-payment, etc.)
└── package.json          # Monorepo workspace root
```

## Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `match-driver` | Find and assign nearest available driver to a ride request |
| `process-payment` | Charge rider, split earnings, handle subscription skimming |
| `handle-cancellation` | Process cancellation fees and refunds |
| `send-rider-receipt` | Send styled HTML email receipt after ride completion |
| `request-instant-payout` | Create Stripe instant payout to driver's bank |
| `collect-subscription` | Incremental subscription collection from ride earnings |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project
- Stripe account with Connect enabled
- Google Maps API key

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Kyngslyabebe/styl-rideshare.git
   cd styl-rideshare
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env.local
   # Fill in Supabase, Stripe, and Google Maps keys
   ```

4. Start development
   ```bash
   # Driver app
   cd apps/driver && npx expo start

   # Rider app (separate terminal)
   cd apps/rider && npx expo start

   # Admin panel (separate terminal)
   cd apps/admin && npm run dev
   ```

## License

Proprietary — Kingsley Abebe
