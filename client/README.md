# QuickPoll Client

This is the Vite-powered React frontend for QuickPoll. It talks to the Node/Express API (`server/`) instead of Supabase directly. Authenticated users can create polls while everyone can browse and vote.

## Environment variables

Copy `.env.example` to `.env` and point the client at your API:

```bash
cp .env.example .env
```

| Variable             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `VITE_API_BASE_URL` | URL of the backend API (e.g. `http://localhost:4000`). |

## Development

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` by default. Make sure the backend is running (`cd ../server && npm run dev`).

## Production build

```bash
npm run build
npm run preview   # optional local preview of the production bundle
```

## Tests & linting

```bash
npm run lint
npm run test
```

See the repository root `README.md` for Supabase schema requirements and end-to-end workflow details.
