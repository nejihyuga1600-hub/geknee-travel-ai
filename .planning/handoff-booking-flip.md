# Handoff — Travelpayouts conversion attribution + booking flip

Last session got partway through wiring per-trip `sub_id` into outbound
booking links so Travelpayouts postbacks carry `tripId`, and the
booked-flip UI in BookView.

## What shipped (committed)

`app/plan/summary/components/BookView.tsx`:

- `HotelCard.bookingHref` appends `label=trip-<id>&sub_id=trip-<id>`
  to the Booking.com search URL when `tripId` is present. (Booking.com
  uses `label`; Travelpayouts' rewriter honors `sub_id`.)
- `tripId` threaded through `FlightOptionsSection` →
  `FlightOptionCard` → `FlightOptionAggregator` props.
- `withSub(url)` helper inside `FlightOptionAggregator` appends
  `sub_id=trip-<id>&clickref=trip-<id>` (clickref is for Skyscanner-
  style partners; harmless on others).
- **Primary flight CTA** (carrier deep-link or Google Flights
  fallback) is wrapped in `withSub()`.

Commit: see `git log` for the `book(attribution)` commit.

## What's left

### 1. Wrap secondary aggregator URLs

Same file, `FlightOptionAggregator`, the `aggregators` array (~line
1715, just after `primary` is defined). Each entry has an `href`
built from a `build*Href()` helper (Skyscanner, Kayak, Google).
Wrap each with `withSub(...)` the same way `primary` is wrapped.

```ts
const aggregators = [
  { name: 'Skyscanner', href: withSub(buildSkyscannerHref(...)) },
  { name: 'Kayak',      href: withSub(buildKayakHref(...)) },
  { name: 'Google',     href: withSub(buildGoogleFlightsHref(...)) },
];
```

### 2. `GET /api/bookings?tripId=`

New route. Returns array of `Booking` rows for that trip. Use the
Prisma `Booking` model added in commit `7a05ce8`.

```ts
// app/api/bookings/route.ts
export async function GET(req: Request) {
  const tripId = new URL(req.url).searchParams.get('tripId');
  if (!tripId) return Response.json({ bookings: [] });
  const bookings = await prisma.booking.findMany({
    where: { tripId },
    orderBy: { confirmedAt: 'desc' },
  });
  return Response.json({ bookings });
}
```

(Confirm field names against `prisma/schema.prisma` — the model was
added in 7a05ce8.)

### 3. BookView booked-flip wiring

In `BookView.tsx`:

- On mount + on tab change to `flights`/`stays`, fetch
  `/api/bookings?tripId=${props.tripId}`.
- Build a `Set<string>` of booked items keyed by something stable
  (carrier+route for flights, hotel name+city for stays — match what
  the cron poller writes into `Booking.itemKey` or equivalent).
- In `HotelCard` and `FlightOptionCard`, if the item is in the booked
  set, swap the CTA for a "✓ Booked" pill (use existing tier color
  treatment for visual consistency) and disable the outbound link.

Hook the fetch behind `useSWR` if it's already in deps; otherwise a
plain `useEffect` + `fetch` is fine — this is a low-frequency read.

## Files to touch

- `app/plan/summary/components/BookView.tsx` — secondary
  aggregators + booked-flip render
- `app/api/bookings/route.ts` — new
- `prisma/schema.prisma` — read-only, confirm Booking field names

## Test plan

1. Click a primary flight CTA → URL contains
   `sub_id=trip-<id>&clickref=trip-<id>`. ✅ already works
2. Click any secondary aggregator → same query params present.
3. Manually insert a `Booking` row with current `tripId` → reload
   BookView → that hotel/flight card shows "✓ Booked" instead of CTA.
4. Cron poller (already shipped) writes real `Booking` rows from
   Travelpayouts within ~24h of a real test conversion.

## Reference

- Travelpayouts cron route: `app/api/cron/travelpayouts/`
- Booking model: `prisma/schema.prisma`
- `withSub()` helper pattern: `BookView.tsx` `FlightOptionAggregator`
