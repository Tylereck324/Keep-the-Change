# Codebase Improvements Design

**Date:** 2026-01-02
**Status:** Approved
**Scope:** Type safety, developer experience, testing, error handling, documentation

---

## Overview

Comprehensive improvements to the Copenhagen Budget App focusing on code quality, maintainability, and developer experience. The codebase is in good shape overall following a recent security audit, but has gaps in testing, documentation, and developer tooling.

---

## Phase 1: Type Safety

### 1.1 Fix CSV Parser Type

**File:** `lib/utils/csv-parser.ts`

**Current (line 44):**
```typescript
parseResult.data.forEach((row: any, index: number) => {
```

**Change to:**
```typescript
type RawCSVRow = Record<string, string | undefined>

parseResult.data.forEach((row: RawCSVRow, index: number) => {
```

### 1.2 Re-enable ESLint Rules

**File:** `eslint.config.mjs`

1. Change `'@typescript-eslint/no-unused-vars': 'off'` to `'warn'`
2. Change `'@typescript-eslint/no-explicit-any': 'off'` to `'warn'`
3. Run `pnpm lint` to find violations
4. Fix or add targeted suppressions for acceptable cases
5. Upgrade to `'error'` once clean

---

## Phase 2: Developer Experience

### 2.1 Environment Template

**New file:** `.env.example`

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication (Required)
JWT_SECRET=generate-a-secure-random-string-minimum-32-chars

# Development
# NODE_ENV=development
```

### 2.2 Pre-commit Hooks

**Install:**
```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

**New file:** `.husky/pre-commit`
```bash
pnpm exec lint-staged
```

**Add to `package.json`:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "bash -c 'pnpm tsc --noEmit'"
    ]
  }
}
```

### 2.3 Contributing Guide

**New file:** `CONTRIBUTING.md`

Contents:
- Development setup (prerequisites, env config, database)
- Project structure overview
- Code standards (TypeScript, ESLint, naming)
- Testing guidelines
- Pull request process

---

## Phase 3: Testing Foundation

### 3.1 New Test Files

| File | Tests For |
|------|-----------|
| `lib/utils/__tests__/csv-parser.test.ts` | `parseCSV()`, `detectDateFormat()`, `parseAmount()` |
| `lib/utils/__tests__/category-matcher.test.ts` | `matchCategory()`, `extractMerchantName()` |
| `lib/utils/__tests__/duplicate-detector.test.ts` | `findPotentialDuplicates()`, `calculateSimilarity()` |
| `lib/utils/__tests__/budget-warnings.test.ts` | `getBudgetWarnings()`, `calculateBudgetStatus()` |

### 3.2 Test Coverage Goals

Each test file should cover:
- Happy path scenarios
- Edge cases (empty inputs, boundary values)
- Error cases (malformed data)
- Performance for large inputs where applicable

---

## Phase 4: Error Handling

### 4.1 Client Components

Replace `console.error` with proper error state:

| File | Change |
|------|--------|
| `components/pin-modal.tsx:60` | Set error state for UI feedback |
| `components/auto-rollover-toggle.tsx:26` | Set error state for UI feedback |
| `components/csv-import-steps/step4-confirm.tsx:119` | Remove (already has error state) |

### 4.2 Server Components

| File | Change |
|------|--------|
| `app/reports/page.tsx:27` | Re-throw to trigger error boundary |

### 4.3 Silent Failures

| File | Change |
|------|--------|
| `lib/actions/budgets.ts:154-157` | Add development-only logging |

### 4.4 Keep As-Is

API routes (`app/api/auth/*`) - server-side console.error is appropriate for logging.

---

## Phase 5: Documentation

### 5.1 JSDoc Coverage

Add JSDoc to exported functions in:
- `lib/utils/csv-parser.ts`
- `lib/utils/category-matcher.ts`
- `lib/utils/duplicate-detector.ts`
- `lib/utils/budget-warnings.ts`
- `lib/utils/validators.ts` (document LIMITS rationale)

### 5.2 JSDoc Format

```typescript
/**
 * Brief description of function purpose.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws Description of error conditions (if applicable)
 *
 * @example
 * ```typescript
 * const result = functionName(input)
 * ```
 */
```

---

## Implementation Order

1. **Phase 1: Type Safety** - Quick wins, reduces risk
2. **Phase 2: Developer Experience** - Enables better workflow
3. **Phase 3: Testing** - Validates existing behavior before changes
4. **Phase 4: Error Handling** - Improves debugging
5. **Phase 5: Documentation** - Captures knowledge

---

## Success Criteria

- [ ] No `any` types in production code (except with explicit suppression + comment)
- [ ] ESLint rules re-enabled with no violations
- [ ] `.env.example` exists with all required variables
- [ ] Pre-commit hooks run lint and type-check
- [ ] CONTRIBUTING.md exists with setup instructions
- [ ] 4 new test files with comprehensive coverage
- [ ] No client-side `console.error` without error state handling
- [ ] JSDoc on all exported utility functions

---

## Files Changed Summary

| Type | Count | Files |
|------|-------|-------|
| Modified | ~12 | csv-parser.ts, eslint.config.mjs, package.json, error handling files, utility files |
| New | ~8 | .env.example, CONTRIBUTING.md, .husky/pre-commit, 4 test files |
