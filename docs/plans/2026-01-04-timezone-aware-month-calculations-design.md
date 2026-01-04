# Timezone-Aware Month Calculations Design

## Goal
Make budget month calculations timezone-aware so auto-rollover and budget warnings align with the household's local time. Default to UTC for backward compatibility and allow users to override the detected timezone in Settings.

## Data Model
Add a `timezone` column to `households` storing an IANA timezone string (e.g., `America/Los_Angeles`). Default to `UTC` so existing households behave the same until updated.

## Client UX
On the Settings page, show a timezone selector that auto-detects the browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and allows manual override. Save selection to the household record. If detection fails, keep `UTC`.

## Server Behavior
Introduce a helper `getCurrentMonth(timezone?: string)` that returns `YYYY-MM` using the provided timezone. If the timezone is missing or invalid, fall back to UTC. Use this helper in budget warnings and auto-rollover logic instead of `new Date().toISOString().slice(0, 7)`.

## Error Handling
- If the timezone value is invalid or missing, fall back to `UTC`.
- If saving the timezone fails, surface a Settings error and leave the previous value unchanged.

## Testing
- Unit tests for `getCurrentMonth` at timezone boundary conditions.
- Light server action tests to ensure the household timezone is applied for budget warnings and auto-rollover.

## Rollout
Additive change only: new column, new settings UI, and helper usage. Existing users see UTC behavior until they save a timezone.
