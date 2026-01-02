# Performance Optimization Design

**Date:** 2026-01-02
**Focus:** Improve initial load-time and perceived performance for both development and production.

## Goals
- Reduce initial JS payload on the heaviest routes (expected: `/reports`, `/insights`).
- Improve perceived performance by avoiding blocking client work and removing expensive render paths from initial load.
- Keep behavior, data correctness, and UI output identical.
- Maintain parity between dev and production performance strategies.

## Non-Goals
- No backend pagination or schema changes in the first pass.
- No major UI/UX redesigns.
- No new analytics/telemetry pipeline.

## Baseline Measurement Strategy
- Add opt-in bundle analysis (`ANALYZE=1 npm run build`) to measure per-route JS size and shared chunks.
- Run production build with placeholder env to collect baseline sizes.
- Use React DevTools profiling in dev to identify heavy client renders.
- Track any chart data transformation cost and ensure it is not repeated on every render.

## Recommended Approach (Option 1)
Focus on bundle size and render-path reduction first. This provides the largest ROI with minimal risk:
- Split heavy Recharts visualizations into separate dynamically imported chart islands.
- Delay chart mounting until in-viewport with `IntersectionObserver` and a lightweight skeleton.
- Keep Server Components in control of data fetch and layout; client components only render visuals.
- Ensure perceived performance is improved without data or behavior changes.

## Architecture and Component Changes
- Add a reusable client-only `LazyMount` component that mounts children on scroll proximity.
- Use `next/dynamic` to load chart components on demand and show a fixed-height placeholder during load.
- Move chart data shaping to server routes where possible, passing already prepared arrays into client charts.
- Avoid Recharts in the initial route JS to keep time-to-interactive low.

## Data Flow and Error Handling
- Data fetching remains server-first (Server Components). Charts do not fetch data.
- If data load fails, existing route error boundaries handle errors consistently.
- If chart chunk load fails, the client boundary surfaces a fallback error while leaving the rest of the page intact.

## Transactions Page Optimization
- Add a client-side cap (“load more”) to reduce DOM nodes and action buttons on initial render.
- Avoid introducing a new virtualization dependency in the first pass.
- If profiling shows the list is still slow, follow up with server pagination or virtualization.

## Testing and Verification
- Bundle size comparison via analyzer before/after changes.
- `npm run build` (with dummy envs) to ensure dynamic import boundaries are stable.
- Manual runtime validation:
  - `/reports` and `/insights` charts load on scroll with no layout shift.
  - `/transactions` initial render is fast; “load more” reveals additional items.
- Confirm totals and chart values match previous behavior.

## Open Questions
- Do we prefer the “load more” cap size (e.g., 100) to be configurable?
- Should we introduce a lightweight “above-the-fold” summary chart that is always loaded?

