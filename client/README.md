# QuickPoll Client

This is the Vite-powered React frontend for QuickPoll. It talks directly to Supabase using the public anon key, so there is no custom backend server to run.

## Environment variables

Copy `.env.example` to `.env` and fill in the Supabase project details:

```bash
cp .env.example .env
```

| Variable                  | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL (e.g. `https://xyz.supabase.co`).    |
| `VITE_SUPABASE_ANON_KEY` | Public anon key. **Do not** use the service role key here. |

## Development

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` by default.

## Production build

```bash
npm run build
npm run preview   # optional local preview of the production bundle
```

## Supabase schema recap

Make sure the backend project has the tables, policies, and `vote_on_option` function created as shown in the root `README.md`. The React app expects:

- `polls` and `options` tables with open `SELECT`/`INSERT` policies for anonymous users.
- The `vote_on_option` RPC granted to the `anon` role, so votes can be recorded atomically.
