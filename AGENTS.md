# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

GetSoundOn is a French marketplace (Next.js 16 / App Router / TypeScript) for renting event venues and equipment. Single monolith — one Next.js app handles both frontend and API routes.

### Running the dev server

```bash
npm run dev          # starts on localhost:3000 (Turbopack)
```

- **Mock mode**: Set `MOCK_GS_LISTINGS=true` in `.env.local` to serve 11 fake catalogue listings without a real Supabase connection. This is the recommended mode for local/cloud development without external credentials.
- Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be set (even placeholder values) or the app crashes on import. The `.env.local` created during setup uses placeholders with mock mode enabled.

### Lint

`npm run lint` invokes `next lint`, which was **removed in Next.js 16**. The project still has an `.eslintrc.json` but the command currently errors. This is a pre-existing issue in the codebase, not an environment problem.

### Tests

```bash
npm test             # Jest — event-assistant NLP engine tests only (no external deps)
```

One test (`recommendation-engine-v2.test.ts › doit respecter quantités explicites`) fails pre-existing. All other 167 tests pass (93 pass, 74 skipped).

### Key routes (for manual testing)

| Route | Description |
|---|---|
| `/` | Landing page |
| `/catalogue` | Venue/equipment catalogue (mock data) |
| `/items` | Equipment listings |
| `/pricing` | Pricing page |
| `/comment-ca-marche` | How it works |
| `/login`, `/signup` | Auth (redirects without Supabase) |
| `/admin` | Admin dashboard (requires `ADMIN_EMAILS` env var) |

### External services (not needed for basic dev)

- **Supabase** (auth, DB, storage) — required for real data but mock mode works without it
- **Stripe** (payments, Connect) — required only for payment flows
- **Resend** (transactional emails) — optional, gracefully skipped
- **Telegram Bot** (admin notifications) — optional, gracefully skipped

### Caveats

- The `getsoundon-starter/` directory is an isolated template project with its own `docker-compose.yml`. It is **not** part of the main app and should be ignored during development.
- The project uses `package-lock.json` → use `npm install` (not pnpm/yarn).
