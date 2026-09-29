# HSK Drill

Single-file vocab drill (`index.html`). Open it in a browser; no build step.

## Global leaderboard (optional, Cloudflare Worker + D1)

The API lives in [worker/](worker/). It validates every score server-side (level, mode,
`correct <= total`, `pct` matches, allowed lessons format), only accepts POSTs from the origins in
`ALLOWED_ORIGINS` (`worker/wrangler.toml`), and allows 5 saves per IP per 10 minutes.

```sh
cd worker
npm install
npx wrangler login
npx wrangler d1 create hsk-drill            # copy the database_id into wrangler.toml
npx wrangler d1 execute hsk-drill --remote --file=schema.sql
npx wrangler deploy                         # prints https://hsk-drill-api.<you>.workers.dev
```

Then set `API` near the top of the script in `index.html` to that URL, commit and push.
Until it's set, the app hides "Save to global" and the Global tab shows a short setup message.
The "This device" tab always works offline.

Local test: `npx wrangler d1 execute hsk-drill --local --file=schema.sql && npx wrangler dev --local`.

### Caveat

Scores are still self-reported by the browser. Validation and rate limiting stop malformed rows and
spam, but not someone who plays honestly-shaped fake rounds slowly.
