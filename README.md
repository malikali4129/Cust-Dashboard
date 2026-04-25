# University Dashboard

Static student/admin dashboard backed only by Supabase.

## What changed

- Admin authentication now uses Supabase Auth instead of a plaintext password row.
- Data fallback to `localStorage` has been removed.
- Public users can read dashboard content, but writes are restricted to authenticated users through RLS.
- Admin tables now use pagination, optimistic updates, import/export against Supabase, and better async failure handling.
- The shell can open offline through a service worker and shows a clear offline indicator, but cloud data and writes still require a connection.
- Dates are rendered in Pakistan time (`Asia/Karachi`).

## Setup

1. Create a Supabase project.
2. Run `schema.sql` in the SQL editor.
3. In Supabase Auth, create the admin user you want to sign in with.
4. Put your project URL and anon key in `config.js`.
5. Serve the project with any static server for service worker support.

## Important notes

- Opening the HTML files directly still renders the app, but offline install/caching works properly when served from `https://` or `http://localhost`.
- Public reads are intentionally enabled for the student dashboard. Authenticated sessions are required for create, update, delete, import, export reset, password change, and timezone updates.
- This version no longer stores dashboard content in the browser. Offline mode is read-shell only.
