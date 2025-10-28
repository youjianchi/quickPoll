# QuickPoll API Server

Express-based API that connects QuickPoll to Supabase. Responsibilities:

- Handles email/password authentication via Supabase Auth.
- Restricts poll creation to authenticated users.
- Exposes poll retrieval and voting endpoints for anonymous users.
- Uses the Supabase service role key for privileged writes while keeping RLS enabled for readers.

## Environment variables

The server reads the same `.env` file documented at the repository root:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `CLIENT_ORIGIN` (comma separated list of allowed frontend origins)
- `PORT` (optional, defaults to `4000`)

## Scripts

```bash
npm install        # install dependencies
npm run dev        # start Express with --watch (requires Node 20+)
npm run start      # start Express without file watching
npm run lint       # eslint
npm run test       # vitest + supertest suite
```

The Vitest suite mocks Supabase clients, so tests run without network access.
