@AGENTS.md

# Project Rules

## Node.js
- This project requires **Node 20**. Run `nvm use 20` before any npm/npx command.
- The system default is Node 16 which will crash Prisma and Next.js.

## Next.js 16 Breaking Changes
- **No middleware.ts** — Next.js 16 renamed it to `proxy.ts` at the project root. Using `middleware.ts` triggers a deprecation warning and may break.
- Route handlers use `params: Promise<{ id: string }>` — params must be awaited: `const { id } = await params;`
- `searchParams` in page components is also a Promise — must be awaited.
- Always check `node_modules/next/dist/docs/` before using any Next.js API.

## Prisma 7
- Generator is `prisma-client` (not `prisma-client-js`). Output goes to `src/generated/prisma/`.
- **No barrel export** — import from `@/generated/prisma/client`, not `@/generated/prisma`.
- **Adapter required** — PrismaClient constructor requires `{ adapter }`, not `{ datasourceUrl }`. The `datasourceUrl` option does not exist in Prisma 7.
- Adapter class is `PrismaBetterSqlite3` (lowercase `qlite3`), not `PrismaBetterSQLite3`.
- The dev database lives at project root (`./dev.db`), not in the `prisma/` directory. The `.env` value `file:./dev.db` resolves relative to `prisma.config.ts`, which is at the root.
- Seed script must use absolute path to dev.db via `path.join(__dirname, "..", "dev.db")` since it runs from `prisma/`.
- `prisma migrate dev` uses a native engine separate from the adapter — the adapter is only for runtime queries.

## Zod v4
- Error access is `.issues[0].message`, not `.errors[0].message` (the `.errors` property does not exist).
- `z.coerce.boolean()` coerces any non-empty string to `true` — the string `"false"` becomes `true`. Use empty string `""` for false, or compare strings manually.

## shadcn/ui (base-nova style)
- Components use `@base-ui/react` primitives, **not** Radix. There is no `asChild` prop.
- `DropdownMenuTrigger` renders children directly — don't wrap in a Button with `asChild`.
- `DropdownMenuItem` has no `asChild` — use `onClick` with `router.push()` instead of wrapping `<Link>`.
- `Select` `onValueChange` passes `string | null`, not `string`. Guard with `(v) => v && setValue(v)`.
- When shadcn `init` runs, it overwrites `src/lib/utils.ts`. Re-add any custom utilities after init.

## Stripe
- Use lazy initialization (`getStripe()` function) instead of top-level `new Stripe()`. Eager init crashes the build when `STRIPE_SECRET_KEY` is empty.
- Import as `import { getStripe } from "@/lib/stripe"` and call `getStripe().checkout.sessions.create(...)`.

## Testing
- Framework: **Vitest** with jsdom environment.
- Run: `npm run test:run` (single run) or `npm test` (watch mode).
- All tests use mocked Prisma (`__tests__/helpers/mocks.ts`) — no real database.
- Mock `next-auth` via `vi.mock("next-auth", ...)` and `vi.mocked(getServerSession)`.
- Mock `next/cache` `revalidatePath` globally in `vitest.setup.ts`.
- Date/time tests: use `new Date(dateStr).setHours(h, m, 0, 0)` for local time, not UTC strings, to match how the app creates dates.

## File Organization
```
src/
  actions/           # "use server" server actions, one file per domain
  app/(auth)/        # Sign-in/sign-up (centered layout, no nav)
  app/(public)/      # Search, technician profiles (header/footer layout)
  app/(dashboard)/   # Authenticated pages (sidebar layout)
  app/api/           # Route handlers (next-auth, stripe webhooks, data APIs)
  components/ui/     # shadcn primitives (do not edit)
  components/layout/ # Header, footer
  components/*/      # Domain-specific components
  lib/validations/   # Zod schemas
  lib/queries/       # Prisma query functions
  generated/prisma/  # Auto-generated Prisma client (gitignored)
  types/             # Type augmentations (next-auth.d.ts)
proxy.ts             # Route protection (replaces middleware.ts)
__tests__/           # Vitest tests mirroring src/ structure
```
