Supabase Deployment & Migration Notes
===================================

Overview
--------
This project currently uses MongoDB Atlas and an Express backend. The files in this folder provide a starting point to integrate Supabase (Postgres + Auth + Storage).

Goals
-----
- Host your database and auth in Supabase (Postgres + Supabase Auth)
- Continue using the Express backend (host elsewhere) or port endpoints to Supabase Edge Functions

Quick checklist
---------------
1. Create a Supabase project at https://app.supabase.com
2. In the project settings copy the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side secret) and `SUPABASE_ANON_KEY` (client-safe). Add these to your backend `.env`:

```
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
```

3. Choose migration strategy:
   - Full migration: convert MongoDB collections to Postgres tables (recommended long-term)
   - Hybrid: keep MongoDB for existing data, use Supabase Auth for user management now

Schema mapping (example)
-------------------------
Map key collections to relational tables. Example for `users`/`staff`:

- users table:
  - id (uuid, primary key)
  - email (text, unique)
  - name (text)
  - role (text)
  - created_at (timestamp)

- tasks table:
  - id (uuid)
  - title (text)
  - description (text)
  - assigned_to (uuid) references users(id)
  - status (text)

Data migration
--------------
Export from MongoDB Atlas (mongoexport) and import to Postgres via CSV or write a small Node script that reads from Mongo and inserts into Postgres using `pg` or `supabase-js`.

Example export/import (high level)

1. Export Mongo collection to JSON/CSV:

```
mongoexport --uri="<MONGODB_URI>" --collection=users --out=users.json
```

2. Convert JSON to CSV (if needed) and import to Postgres, or write a Node migration script using `supabase` client.

Server integration options
-------------------------
- Keep Express backend as-is and switch data layer to Supabase client (use `server/supabaseClient.js`). Deploy Express on Render/Railway/Vercel (as a server) and set env vars there.
- Or rewrite endpoints as Supabase Edge Functions (Deno) and use Supabase for hosting functions + DB.

Frontend changes
----------------
- Use Supabase client in frontend for Auth flows. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the frontend env and use `@supabase/supabase-js`.
- Replace hardcoded `http://localhost:3001` API base with `VITE_API_BASE_URL` and set it to your deployed backend or Supabase Edge Function URL.

Next steps I can do for you
--------------------------
1. Add migration scripts to export/import data (node script)
2. Port one route (auth) to use Supabase Auth as an example
3. Update frontend example to authenticate with Supabase and call the backend with the Supabase JWT

Tell me which next step you'd like me to run now (1, 2, or 3), or provide Supabase project keys if you want me to finish server config here.
