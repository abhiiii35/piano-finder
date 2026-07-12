@AGENTS.md

# Piano Finder — "Book A Piano Tuner"

Two-sided marketplace: customers find piano technicians (Google Maps radius search), book and pay (Stripe), message, review, and rebook; technicians manage travel-aware availability, jobs, PDF invoices, finances, and a blog (Tiptap). ZocDoc-style booking + Wyzant-style job board. Spec: `PRD.txt` (root); feature specs: `docs/build-prompts/`; design history: `docs/superpowers/`.

Stack: Next.js 16.2 App Router + React 19 + TypeScript + Tailwind 4 + shadcn (base-nova / `@base-ui`) · Prisma 7 + SQLite (`./dev.db` locally, Turso/libsql in production) · NextAuth v4 (credentials + Google) · Stripe · Resend · Cloudinary · Vitest + Playwright.

Repo: `github.com/abhiiii35/piano-finder` — a remote exists; push there, don't create a new repo.

## Commands (run from `piano-finder/`)

- `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` — **FIRST, before any npm/npx/git push**. No nvm on this machine; default Homebrew node is v24, whose `NODE_MODULE_VERSION` mismatches the `better-sqlite3` binary in node_modules (built for Node 20) — the build dies at sitemap prerender with `ERR_DLOPEN_FAILED`. Verified 2026-07-12: full suite + build pass on node@20 (v20.20.2).
- `npm run dev` — http://localhost:3000. Seed logins: `customer@example.com` / `tech@example.com` / `admin@example.com`, password `password123` (run `npm run db:seed` if they don't exist).
- `npm run db:migrate` / `npm run db:seed` / `npm run db:studio`
- `npm run test:run` — unit tests (Vitest, mocked Prisma — no DB needed). `npm run test:coverage` for coverage.
- `npm run test:e2e` — Playwright: seeds `test.db` and boots its own server on port **3001**; the dev server does not need to be running.
- `npm run build` — `prisma generate` + `next build`
- `npm run test:all` — the full gate: lint --quiet + unit + coverage + build + e2e
- `npm run lint` works here (eslint flat config installed — unlike some sibling projects).

## Push gate

Husky + `scripts/pre-deploy-check.sh` block `git push` when unit tests fail, statement coverage is under **90%**, or the build fails. A "blocked" push is the hook working — fix the failure; never bypass with `--no-verify`.

## Parallel subagents (lessons from 2026-07-12 outage)

- **Always run parallel subagents when possible** — split independent work (typecheck vs. tests vs. lint, separate features, research vs. implementation) across concurrent agents to improve efficiency. Only serialize when tasks share files or genuinely depend on each other.
- Implementation workers run on **Haiku**; expensive models orchestrate only. Four default-model agents in parallel exhausted the account session limit mid-build and all died at once. If Haiku cannot resolve a failure, escalate that task to Sonnet or Opus to review, test, verify, and fix.
- `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` **before anything else** — it's documented in Commands above; don't burn tokens rediscovering it.
- **Checkpoint-commit early and often**: commit each coherent unit as soon as it compiles. When the outage hit, 3 of 4 agents had zero commits — their work survived only because the worktrees happened to persist.
- Be token-frugal: grep for what you need, read only relevant files, never dump large files, never re-read what you've already seen.
- Workers never `git push` — the orchestrator reviews and merges worktree branches; the human owns the push (Definition of done #5 applies to the orchestrator/human, not workers).

## Environment / databases

- `.env` (template: `.env.example`): local dev is SQLite `DATABASE_URL=file:./dev.db`; production is Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) via the libsql adapter. Empty Turso vars = local mode — `src/lib/prisma.ts` does the switching.
- External services (Stripe, Resend, Cloudinary, Google Maps/OAuth) may have empty keys locally; code must lazy-init so the build never requires them (see Stripe below).

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
- All unit tests use mocked Prisma (`__tests__/helpers/mocks.ts`) — no real database.
- Mock `next-auth` via `vi.mock("next-auth", ...)` and `vi.mocked(getServerSession)`.
- Mock `next/cache` `revalidatePath` globally in `vitest.setup.ts`.
- Date/time tests: construct local dates explicitly — `new Date(2026, 3, 14, 9, 0)` — never `new Date("yyyy-mm-dd")` (parses as UTC midnight, which is the previous local day in US timezones). Availability code parses `"yyyy-mm-dd"` strings as local dates (`parseLocalDate` in `src/actions/booking.ts`) to match how bookings are stored.

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

## Definition of done (this project)

1. `npm run test:all` passes — same checks the push hook enforces.
2. Verified in the running app as **every role the feature touches** (customer and technician seed accounts), in light and dark mode, surviving reload and navigation.
3. Date/availability logic gets a boundary test — local-date parsing is this codebase's recurring trap (see Testing).
4. Date-stamped `CHANGELOG.md` entry (file doesn't exist yet — create it with your first change) and README kept current (it is still stock create-next-app boilerplate — replace it the first time you touch it).
5. Commit + push to `abhiiii35/piano-finder`; closing message states the commit hash, changed routes, and the run command: `export PATH="/opt/homebrew/opt/node@20/bin:$PATH" && npm run dev` → http://localhost:3000.
