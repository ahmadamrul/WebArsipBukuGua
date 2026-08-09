# Arsip Buku Gua Web

A React web application for managing book and comic collections. The application uses cloud accounts, so users must sign in before accessing the library. All data is scoped to the currently authenticated user.

## Features

- Cloud account registration and authentication.
- Create, edit, and delete comics.
- List and grid display modes.
- Comic covers from manual URLs or source-page metadata.
- Genres, collections, tags, and per-comic label relationships.
- Library search, filtering, and sorting.
- Multiple reading sources and links per comic.
- Reading progress and history.
- Local file import and library data import/export.
- Row Level Security to isolate each user's data.
- Responsive layout for desktop and mobile browsers.

## Tech Stack

- React 19
- TypeScript
- Vite
- Supabase Auth and Postgres
- JSZip and fast-xml-parser for file imports

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project with email/password authentication enabled

## Getting Started

1. Install the dependencies:

```bash
npm install
```

2. Copy the environment template:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

3. Add your project configuration to `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

Use the **Project URL** and **Publishable key** from your project's API settings. Never expose a secret key or service-role key in a browser application.

4. Open the SQL Editor in your project dashboard, run the complete [`supabase/schema.sql`](supabase/schema.sql) file, and verify that it finishes without errors.

5. Start the development server:

```bash
npm run dev
```

The application will be available at the address displayed by Vite, usually `http://localhost:5173`.

## Scripts

```bash
npm run dev           # Start the development server
npm run typecheck     # Check TypeScript without emitting files
npm run lint          # Run ESLint with zero warnings allowed
npm run format:check  # Verify Prettier formatting
npm run build         # Type-check and create a production build
npm run preview       # Preview the production build locally
```

## Project Structure

```text
src/
  app/                     Composition, providers, routes, and bootstrap
  features/                Feature-owned UI, services, types, and rules
  components/              Shared common and layout components
  lib/
    api/                   Supabase and persistence boundary
    domain/                Domain contracts and business rules
    constants/             Shared limits, keys, and regular expressions
    utils/                 Small reusable helpers
  styles/                  Theme, global, component, and layout styles
  main.tsx                 Browser entry point
supabase/
  schema.sql               Tables, compatibility migrations, RLS, and indexes
public/                     Public assets and favicon
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for ownership and dependency rules.

## Database and Security

- Every primary table uses a `user_id` linked to `auth.users`.
- Row Level Security allows authenticated users to access only their own data.
- The schema is designed to be safely rerun by using `if not exists` and replacing policies with their latest definitions.
- Compatibility migrations handle older Flutter databases where `device_id` may still be required for reading-progress rows.
- `.env` is excluded from Git. Only `.env.example`, containing placeholders, should be committed.

## Troubleshooting

### Cloud account is not configured

Make sure `.env` exists and both variables are set. Restart `npm run dev` after changing environment variables.

### Database requests return status 400

Run [`supabase/schema.sql`](supabase/schema.sql) again. This usually means an older table is missing a required column or default value.

### Inserts or updates are rejected by a policy

Make sure the user is signed in and that all RLS policies from [`supabase/schema.sql`](supabase/schema.sql) were created successfully.

### A cover cannot be detected from the source page

Some websites block metadata requests from browsers. Enter a cover URL manually in the create or edit comic form as a fallback.

## Notes

This web version is online-only and requires a connection to the cloud account service. The Flutter/Android application is maintained in a separate repository and is not modified by this project.
