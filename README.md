# Styl Rideshare

A full-stack rideshare platform built from scratch with three production-ready apps: a **Driver** mobile app, a **Rider** mobile app, and a real-time **Admin** dashboard. Drivers keep 100% of their fares. Revenue is generated through driver subscriptions instead of per-ride commission.

Built as a monorepo with shared types and constants across all three apps.

<br/>

## Why I Built This

Most rideshare platforms take 25-40% of every fare. I wanted to build something that flips that model. Styl charges zero commission on rides. Drivers keep everything they earn (minus Stripe processing). The platform sustains itself through a flat weekly or monthly subscription. That one constraint shaped every technical decision: how payments flow, how earnings are tracked, how subscriptions are collected incrementally from ride payouts so drivers never have to pay upfront.

<br/>

## Technical Highlights

### Real-Time Driver Matching Engine
The `match-driver` edge function runs a multi-step pipeline to find the best driver for each ride request:
- Queries all online drivers from `driver_locations` (GPS updated every 3 seconds)
- Filters by **haversine distance** within a configurable search radius (admin-adjustable, default 24km)
- Cross-references `vehicles` table for matching ride type (Standard, XL, Luxury, Electric)
- Checks `drivers` table for approval status and online status
- Excludes busy drivers (currently on active rides)
- Prioritizes the rider's **favorite drivers** before falling back to nearest available
- Retries up to 3 times with 5-second delays if no drivers are found
- Resets the driver's consecutive ignore counter on successful match

### Multi-Stop Ride System
Riders can add up to 2 stops mid-trip. Each stop goes through a driver approval flow:
- Rider requests a stop from the `AddStopScreen` with fare calculated from the current dropoff to the new stop
- Stop is inserted with `status: 'pending_driver'`
- Driver's `InProgressScreen` listens via Supabase Realtime and plays a ringtone alert
- Driver can accept (fare added to ride total) or decline
- Wait timer tracks time at each stop. If the driver waits 5+ minutes, they become eligible for full fare on cancellation. Under 5 minutes, fare is prorated based on completed legs

### Anti-Abuse System
GPS-validated swipe actions prevent drivers from gaming the system:
- **Arrival verification**: Driver must be within 200m of the pickup to swipe "arrived." If outside the radius, the swipe is blocked and a `ride_flag` is logged with GPS coordinates and distance
- **Pickup verification**: Same 200m check before confirming passenger pickup
- **Dropoff verification**: Must be within 200m of the destination to complete the ride
- **Short ride detection**: `process-payment` flags rides under 2 minutes or 0.5km as suspicious
- **Ignore tracking**: After 4 consecutive declined ride requests, the driver is automatically taken offline and alerted

All flags are stored in the `ride_flags` table with GPS data, timestamps, and resolution tracking for admin review.

### Payment Pipeline
The `process-payment` edge function handles the full financial flow after each ride:
1. Calculates fare using the `final_fare` or falls back to `estimated_fare`
2. Computes Stripe processing fee (2.9% + $0.30) and dispute protection ($0.30)
3. Checks if the driver is in subscription collection mode. If so, skims up to 60% of net earnings toward their subscription balance
4. Creates a Stripe PaymentIntent, charges the rider's saved card
5. Records the payment in the `payments` table and earnings in `driver_earnings`
6. Transfers the driver's net payout to their Stripe Connect Express account
7. Awards rider reward points (1 per mile, 2x on weekends)
8. Sends push notifications to both parties and triggers an email receipt

### Tipping System
Riders can tip during or after a ride:
- Preset percentages (5%, 10%, 15%, 20%) calculated from the fare, or a custom dollar amount
- 100% of tips go to the driver with zero platform cut
- Tips are processed through a dedicated `process-tip` edge function that charges the rider, updates `driver_earnings`, and transfers to the driver's Stripe Connect account
- Driver receives a push notification on every tip

### Cancellation Logic
The `handle-cancellation` function handles five cancellation scenarios:
- **Pre-pickup (under 3 min)**: No fee
- **Pre-pickup (3-6 min)**: $2 fee
- **Pre-pickup (6+ min)**: $4 fee
- **At a stop (under 5 min wait)**: Partial fare based on completed legs
- **At a stop (5+ min wait)**: Full estimated fare charged to rider

### Subscription Collection
Instead of taking a cut of every ride, the platform collects subscriptions incrementally:
- When a driver starts their subscription period, their status is set to `collecting`
- Each ride skims a configurable percentage (default 60%) of the driver's net payout
- Once the target amount is collected ($100/week or $360/month), the driver's status flips to `active`
- Drivers never need to pay upfront. The subscription is deducted automatically from their earnings

### Row-Level Security
Every table has Supabase RLS policies so data access is scoped to the authenticated user:
- Riders can only see their own rides, payments, and rewards
- Drivers can only see rides assigned to them and their own earnings
- Favorite drivers are scoped to the rider who created them
- Ride flags are insert-only from edge functions (service role) and read/update-only for admins

<br/>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Apps | React Native, Expo, TypeScript |
| Admin Panel | Next.js 15 (App Router), CSS Modules, TypeScript |
| Database | Supabase PostgreSQL with Row-Level Security |
| Real-Time | Supabase Realtime (Postgres Changes) |
| Edge Functions | Supabase Deno Edge Functions (17 functions) |
| Payments | Stripe Connect Express, PaymentIntents, Transfers |
| Maps | Google Maps Platform (Directions, Places, Geocoding) |
| Push Notifications | Expo Push Notifications |
| Auth | Supabase Auth with OTP via Twilio |
| Deployment | Vercel (admin), Supabase (functions + database) |

<br/>

## Project Structure

```
styl-rideshare/
├── apps/
│   ├── driver/                    # React Native/Expo
│   │   └── src/
│   │       ├── screens/
│   │       │   ├── ride/          # EnRouteToPickup, ConfirmPickup, InProgress, DropOff, RideComplete
│   │       │   ├── earnings/      # Dashboard, InstantPayout, EarningsHistory
│   │       │   └── shared/        # Settings, RideHistory, Help, Inbox
│   │       ├── hooks/             # useRideRequests, useLocationBroadcast, useOnlineStatus, useStripeConnect
│   │       ├── components/        # SlideButton, RideCompleteModal, ContactModal, CancelRideModal
│   │       └── utils/             # geo.ts (haversine)
│   ├── rider/                     # React Native/Expo
│   │   └── src/
│   │       ├── screens/
│   │       │   ├── booking/       # LocationSearch, RideTypeSelect, Searching
│   │       │   ├── ride/          # DriverEnRoute, DriverArrived, InProgress, AddStop, RideComplete
│   │       │   └── shared/        # History, Rewards, Profile, Settings
│   │       ├── hooks/             # useRideStatus, useLiveDriverLocation, useGeolocation
│   │       └── components/        # TipModal, DriverInfoCard, FareBreakdown, EditRideActionSheet
│   └── admin/                     # Next.js 15
│       └── src/
│           ├── app/admin/         # Dashboard, Users, Drivers, Rides, Revenue, Settings, Subscribers
│           ├── components/        # Sidebar, DataTable, StatCard, Charts
│           └── lib/               # Supabase client (anon + service role)
├── packages/
│   └── shared/                    # TypeScript types, constants, utilities shared across all apps
│       └── src/
│           ├── types.ts           # Ride, Driver, RideStop, RideFlag, FavoriteDriver, DriverEarning
│           └── constants.ts       # Fare rates, thresholds, colors, status labels
├── supabase/
│   ├── migrations/                # 15 SQL migrations (schema, RLS policies, indexes)
│   └── functions/                 # 17 Deno edge functions
│       ├── match-driver/          # Driver matching pipeline
│       ├── process-payment/       # Post-ride payment + subscription skim + rewards
│       ├── process-tip/           # Tip processing (100% to driver)
│       ├── handle-cancellation/   # Multi-scenario cancellation with partial fare logic
│       ├── request-instant-payout/
│       ├── stripe-connect-*/      # Onboarding, status, dashboard
│       ├── stripe-setup-intent/   # Rider card management
│       └── send-rider-receipt/    # HTML email receipts
└── package.json                   # npm workspaces monorepo root
```

<br/>

## Database Schema (15 migrations)

| Table | Records | Purpose |
|-------|---------|---------|
| `profiles` | All users | Auth-linked profiles with role (rider/driver/admin), avatar, push token |
| `drivers` | Drivers | License, approval status, online toggle, lifetime earnings, rating, Stripe account, subscription state, consecutive ignores |
| `vehicles` | Per driver | Type (standard/xl/luxury/electric), make, model, color, plate, active flag |
| `rides` | Per ride | Full lifecycle: searching > accepted > driver_arriving > driver_arrived > in_progress > completed. Stores pickup/dropoff coords, fare, tip, payment status, driver earnings, subscription skim |
| `ride_stops` | Per stop | Mid-trip stops with approval flow (pending_driver/accepted/declined), wait tracking, additional fare |
| `driver_locations` | Real-time | GPS lat/lng, heading, speed, online flag. Upserted every 3 seconds via `useLocationBroadcast` |
| `payments` | Per transaction | Stripe PaymentIntent records for rides, cancellation fees, and tips |
| `driver_earnings` | Per ride | Ledger with gross amount, Stripe fee, dispute fee, subscription skim, tip, net payout, Stripe transfer ID |
| `driver_subscriptions` | Per period | Weekly/monthly subscription records with Stripe subscription IDs |
| `ratings` | Per ride | 1-5 star ratings from both rider and driver |
| `promo_codes` | Admin-created | Discount codes with percentage/fixed amount, usage limits, expiry dates |
| `notifications` | Per event | Push notification log for audit trail |
| `rider_rewards` | Per ride | Points earned per mile (2x weekends), redeemable for ride credits |
| `ride_flags` | Per incident | Anti-abuse flags with GPS evidence, distance calculations, admin resolution tracking |
| `favorite_drivers` | Per pair | Rider-driver favorites for priority matching |
| `platform_settings` | Singleton | Configurable search radius, subscription skim percentage, fare rates |

<br/>

## Edge Functions

| Function | Trigger | What It Does |
|----------|---------|-------------|
| `match-driver` | Ride request | Haversine search, vehicle type filter, favorite priority, availability check, retry loop |
| `process-payment` | Ride completion | Stripe charge, fee split, subscription skim, earnings ledger, Connect transfer, reward points, receipt |
| `process-tip` | Rider tips | Stripe charge, 100% to driver, earnings update, Connect transfer, push notification |
| `handle-cancellation` | Either party cancels | Time-based fee tiers, stop wait logic, partial fare calculation, Stripe charge, driver payout |
| `request-instant-payout` | Driver requests | Stripe instant payout to bank account (1.5% fee) |
| `subscription-cron` | Scheduled | Checks subscription periods, triggers collection |
| `stripe-charge-subscription` | Cron trigger | Direct subscription charge from accumulated earnings |
| `stripe-connect-onboard` | Driver signup | Generates Stripe Connect Express onboarding link |
| `stripe-connect-status` | Dashboard load | Checks if driver's Stripe account is fully set up |
| `stripe-connect-dashboard` | Driver request | Generates Stripe Express dashboard login link |
| `stripe-setup-intent` | Rider adds card | Creates Stripe SetupIntent for saving payment methods |
| `stripe-list-cards` | Rider views cards | Lists saved payment methods from Stripe |
| `stripe-set-default-card` | Rider selection | Updates default payment method |
| `stripe-delete-card` | Rider removes card | Detaches payment method from Stripe customer |
| `send-notification` | Various | Generic Expo push notification sender |
| `send-rider-receipt` | Ride completion | Styled HTML email receipt with fare breakdown |
| `send-driver-email` | Various | Email notifications to drivers |

<br/>

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project with Edge Functions enabled
- Stripe account with Connect Express enabled
- Google Maps API key (Directions, Places, Geocoding APIs)

### Setup

```bash
# Clone and install
git clone https://github.com/Kyngslyabebe/styl-rideshare.git
cd styl-rideshare
npm install

# Configure environment
cp .env.example .env.local
# Add your Supabase URL, anon key, service role key
# Add Stripe secret key and publishable key
# Add Google Maps API key

# Run migrations in Supabase SQL Editor
# (migrations are in supabase/migrations/, run in order 001-015)

# Deploy edge functions
supabase functions deploy --project-ref <your-project-ref>

# Start development
npm run driver    # Driver app on Expo
npm run rider     # Rider app on Expo
npm run admin     # Admin panel on localhost:3000
```

<br/>

## Ride Flow

```
Rider books ride
    |
    v
match-driver: search online drivers within radius
    |-- filter by vehicle type, approval, availability
    |-- prioritize favorite drivers
    |-- assign nearest match
    |
    v
Driver receives ride (real-time via Supabase channel)
    |-- Accept: status -> driver_arriving
    |-- Decline: re-trigger match-driver, increment ignore counter
    |
    v
Driver navigates to pickup (GPS-tracked)
    |-- Slide to arrive (GPS check: must be within 200m)
    |
    v
Confirm pickup (GPS check: must be within 200m)
    |-- status -> in_progress
    |
    v
Ride in progress
    |-- Rider can add stops (driver approval required)
    |-- Rider can send tips
    |-- Either party can cancel (fare prorated by completed legs)
    |
    v
Driver arrives at dropoff (GPS check: must be within 200m)
    |-- Slide to complete
    |
    v
process-payment: charge rider, calculate fees, skim subscription, transfer to driver
    |
    v
Both parties rate each other. Rider can tip. Email receipt sent.
```

<br/>

## License

Proprietary. Built by Kingsley Abebe.
