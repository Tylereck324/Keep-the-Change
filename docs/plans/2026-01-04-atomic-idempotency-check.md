# Atomic Idempotency Check Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make idempotency key checks atomic to prevent duplicate transactions under concurrency.

**Architecture:** Enforce a composite unique constraint on `(household_id, key)` and update the `check_idempotency_key` function to use `INSERT ... ON CONFLICT DO NOTHING`, returning `TRUE` only when an insert occurs. Update `createTransaction` to stop on RPC errors.

**Tech Stack:** Supabase Postgres, Next.js Server Actions, TypeScript, Vitest.

### Task 1: Add atomic idempotency migration

**Files:**
- Create: `supabase/migrations/atomic_idempotency_keys.sql`

**Step 1: Write the migration**

```sql
-- Remove duplicate keys per household before adding constraint
WITH ranked AS (
  SELECT id,
         household_id,
         key,
         ROW_NUMBER() OVER (PARTITION BY household_id, key ORDER BY created_at ASC) AS rn
  FROM idempotency_keys
)
DELETE FROM idempotency_keys
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop global unique if present and add per-household unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'idempotency_keys_key_key'
  ) THEN
    ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_key_key;
  END IF;
END $$;

ALTER TABLE idempotency_keys
  ADD CONSTRAINT idempotency_keys_household_key_unique UNIQUE (household_id, key);

-- Update function to be atomic
CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key TEXT,
  p_household_id UUID,
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();

  INSERT INTO idempotency_keys (key, household_id, expires_at)
  VALUES (p_key, p_household_id, NOW() + (p_ttl_hours || ' hours')::INTERVAL)
  ON CONFLICT (household_id, key) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Commit**

```bash
git add supabase/migrations/atomic_idempotency_keys.sql
git commit -m "feat: make idempotency check atomic"
```

### Task 2: Add createTransaction idempotency tests

**Files:**
- Create: `tests/transactions-idempotency.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }))
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}))

import { createTransaction } from '@/lib/actions/transactions'

describe('createTransaction idempotency', () => {
  it('returns early when idempotency key already used', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.rpc.mockResolvedValue({ data: false, error: null })

    await expect(createTransaction({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: 10,
      description: 'Test',
      date: '2026-01-04',
      type: 'expense',
      idempotencyKey: 'abc',
    })).resolves.toBeUndefined()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('throws when idempotency RPC fails', async () => {
    mocks.getSession.mockResolvedValue('household-1')
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })

    await expect(createTransaction({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: 10,
      description: 'Test',
      date: '2026-01-04',
      type: 'expense',
      idempotencyKey: 'abc',
    })).rejects.toThrow('rpc failed')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/transactions-idempotency.test.ts`
Expected: FAIL because error handling is missing.

### Task 3: Implement atomic idempotency handling

**Files:**
- Modify: `lib/actions/transactions.ts`

**Step 1: Update createTransaction error handling**

```ts
if (validated.idempotencyKey) {
  const { data: isNew, error: rpcError } = await supabaseAdmin.rpc('check_idempotency_key', {
    p_key: validated.idempotencyKey,
    p_household_id: householdId
  })

  if (rpcError) {
    throw new Error(`Failed to check idempotency key: ${rpcError.message}`)
  }

  if (isNew === false) {
    return
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npm test -- --run tests/transactions-idempotency.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add lib/actions/transactions.ts tests/transactions-idempotency.test.ts
git commit -m "feat: handle idempotency check errors"
```

### Task 4: Final verification

**Step 1: Run targeted tests**

Run:
```bash
npm test -- --run tests/transactions-idempotency.test.ts
```
Expected: PASS

**Step 2: Commit any remaining changes**

```bash
git status -sb
```
