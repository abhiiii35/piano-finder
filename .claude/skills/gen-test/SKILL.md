---
name: gen-test
description: Generate unit test scaffolding for a server action, validation schema, or API route
disable-model-invocation: true
---

# Generate Test

Create a Vitest unit test file for the specified source file.

## Usage

```
/gen-test src/actions/booking.ts
/gen-test src/lib/validations/auth.ts
/gen-test src/app/api/technicians/[id]/route.ts
```

## Instructions

1. Read the source file to understand exports, dependencies, and logic
2. Read `__tests__/helpers/mocks.ts` for the existing mock patterns and fixtures
3. Generate a test file at the corresponding `__tests__/` path:
   - `src/actions/foo.ts` → `__tests__/actions/foo.test.ts`
   - `src/lib/validations/foo.ts` → `__tests__/lib/validations/foo.test.ts`
   - `src/app/api/foo/route.ts` → `__tests__/app/api/foo.test.ts`

4. Follow these patterns:
   - Import from `vitest`: `describe`, `it`, `expect`, `vi`, `beforeEach`
   - Mock `@/lib/prisma` with `prismaMock` from helpers
   - Mock `next-auth` with `getServerSession` when auth is needed
   - Use `makeFormData()` helper for FormData inputs
   - Use fixtures from `__tests__/helpers/mocks.ts` for test data
   - Add new fixtures to mocks.ts if the model isn't covered yet
   - Call `vi.clearAllMocks()` in `beforeEach`

5. Cover:
   - Happy path (valid input, authenticated)
   - Auth failures (unauthenticated, wrong role)
   - Validation failures (missing/invalid fields)
   - Edge cases (duplicates, not found, already exists)

6. Run `npx vitest run` to verify all tests pass
