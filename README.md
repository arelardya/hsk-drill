# HSK Drill

Single-file vocab drill (`index.html`). Open it in a browser; no build step.

## Global leaderboard (optional, Supabase)

1. Create a free project at supabase.com.
2. Run this in the SQL editor:

```sql
create table public.scores (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text     not null,
  level      smallint not null,
  mode       text     not null,
  lessons    text     not null,
  total      smallint not null,
  correct    smallint not null,
  pct        smallint not null,

  -- The anon key is public, so the database is the only real validation.
  constraint name_len     check (char_length(name) between 1 and 24),
  constraint level_range  check (level between 1 and 6),
  constraint mode_valid   check (mode in ('flash','write','quiz')),
  constraint lessons_len  check (char_length(lessons) between 1 and 120),
  constraint total_range  check (total between 5 and 500),
  constraint correct_range check (correct between 0 and total),
  constraint pct_matches  check (pct = round(correct * 100.0 / total))
);

create index scores_board_idx on public.scores (level, pct desc, total desc, created_at desc);

alter table public.scores enable row level security;

-- Anyone can read the board and add a score. Nobody can update or delete via the API.
create policy "scores are public to read" on public.scores for select to anon using (true);
create policy "anyone can add a score"    on public.scores for insert to anon with check (true);
```

3. In `index.html`, set `SUPABASE.url` (Project URL, `https://<ref>.supabase.co`) and
   `SUPABASE.key` (the **anon public** key; never the `service_role` key).

Until both are set the app treats the global board as unconfigured: no "Save to global"
button, and the Global tab shows a setup message. The "This device" tab always works offline.

### Caveat

Scores are self-reported by the browser, so anyone can post a fake 100%. The constraints above only
keep rows well-formed. If that matters, put the insert behind an Edge Function with rate limiting.
