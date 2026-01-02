# Contributing to Copenhagen Budget App

## Development Setup

### Prerequisites

- Node.js 18+
- npm
- A Supabase account and project

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd copenhagen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials. See `.env.example` for required variables.

4. **Set up the database**
   - Create a new Supabase project
   - Run the schema from `supabase/schema.sql` in the SQL Editor
   - Run migrations from `supabase/migrations/` in order

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
/app                      # Next.js App Router pages
  /api/auth/              # Authentication API routes
  /budget/                # Budget management
  /transactions/          # Transaction list and management
  /reports/               # Spending reports and insights
  /insights/              # Merchant insights
  /settings/              # User settings

/components/              # React components
  /ui/                    # shadcn/ui base components
  /csv-import-steps/      # Multi-step CSV import wizard

/lib/
  /actions/               # Server actions (data mutations)
  /utils/                 # Utility functions
  auth.ts                 # JWT session management
  supabase.ts             # Client-side Supabase client
  supabase-server.ts      # Server-side Supabase client (admin)
  database.types.ts       # Generated Supabase types

/supabase/
  schema.sql              # Main database schema
  /migrations/            # Database migrations
```

## Code Standards

### TypeScript

- Strict mode is enabled
- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use `unknown` instead of `any` when type is truly unknown

### React Patterns

- Use Server Components by default, Client Components only when needed
- Mark client components with `'use client'` directive
- Use Server Actions for data mutations (in `/lib/actions/`)
- Wrap mutations with `startTransition` for optimistic updates

### Naming Conventions

- **Files**: kebab-case (`transaction-form.tsx`)
- **Components**: PascalCase (`TransactionForm`)
- **Functions/variables**: camelCase (`getTransactions`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_AMOUNT`)
- **Types/Interfaces**: PascalCase (`Transaction`, `BudgetData`)

### Component Structure

```typescript
'use client'

import { useState } from 'react'
// external imports

import { Button } from '@/components/ui/button'
// internal imports

import type { Transaction } from '@/lib/types'
// type imports

interface ComponentProps {
  // props interface
}

export function Component({ prop }: ComponentProps) {
  // hooks first
  // event handlers
  // render
}
```

## Testing

### Running Tests

```bash
npm test              # Run tests in watch mode
npm test -- --run     # Run tests once
```

### Writing Tests

- Tests live in `__tests__` directories adjacent to source files
- Use Vitest and React Testing Library
- Focus on utility function tests and component behavior
- Name test files `*.test.ts` or `*.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { functionToTest } from '../function-to-test'

describe('functionToTest', () => {
  it('should handle normal input', () => {
    expect(functionToTest('input')).toBe('expected')
  })

  it('should handle edge cases', () => {
    expect(functionToTest('')).toBe('default')
  })
})
```

## Git Workflow

### Pre-commit Hooks

Pre-commit hooks run automatically via Husky:
- ESLint with auto-fix on staged `.ts` and `.tsx` files

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Use conventional commit format:
```
type: brief description

[optional body with more details]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure tests pass and lint is clean
4. Write a clear PR description explaining:
   - What changed
   - Why it changed
   - How to test it
5. Request review

## Common Tasks

### Adding a New Server Action

1. Create or update a file in `/lib/actions/`
2. Mark with `'use server'` directive
3. Add Zod schema for input validation
4. Get household_id from session
5. Use `supabaseAdmin` for database operations

```typescript
'use server'

import { z } from 'zod'
import { getHouseholdId } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const InputSchema = z.object({
  // define shape
})

export async function myAction(input: z.infer<typeof InputSchema>) {
  const parsed = InputSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error('Invalid input')
  }

  const householdId = await getHouseholdId()
  if (!householdId) {
    throw new Error('Not authenticated')
  }

  // perform database operation
  const { data, error } = await supabaseAdmin
    .from('table')
    .select()
    .eq('household_id', householdId)

  if (error) throw error
  return data
}
```

### Adding a New Component

1. Create file in `/components/` with kebab-case name
2. Add `'use client'` if it needs client-side interactivity
3. Define props interface
4. Export named function component

### Updating Database Schema

1. Create a new migration file in `/supabase/migrations/`
2. Name it with timestamp: `YYYYMMDD_description.sql`
3. Test migration locally first
4. Document any breaking changes
