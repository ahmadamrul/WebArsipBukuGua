# Architecture

The project uses a lightweight feature-based Clean Architecture. The goal is clear ownership without adding framework layers that the application does not need.

## Dependency Direction

```text
app -> features -> lib/api -> Supabase
            |       |
            +-----> lib/domain + lib/utils + lib/constants
components -> feature/domain types only
```

- `app/` composes providers, routes, bootstrap, and feature UI.
- `features/` owns user-facing behavior. Import a feature through its `index.ts` public API.
- `components/` contains reusable presentation that is not owned by one feature.
- `lib/api/` is the cloud and persistence boundary.
- `lib/domain/` contains data contracts and business rules without React or Supabase dependencies.
- `lib/utils/` contains small reusable pure helpers.
- `lib/constants/` is the single source for storage keys, limits, and regular expressions.

Do not import from another feature's private `components/`, `services/`, or `utils` directory. Add the required export to that feature's `index.ts` instead.

## Feature Ownership

| Feature              | Responsibility                                        |
| -------------------- | ----------------------------------------------------- |
| `auth`               | Session actions, login/reset UI, password rules       |
| `comics`             | Comic CRUD, cover sync, rating and title rules        |
| `labels`             | Genre, collection, and tag relationships              |
| `sources`            | Comic source links and URL normalization              |
| `reading-progress`   | Reading status and chapter progress                   |
| `import-export`      | Archive backup, restore, and local publication import |
| `metadata-detection` | Source-page title, cover, and genre detection         |
| `settings`           | Locale, adult-content preferences, localization       |

## Compatibility Boundary

`lib/libraryService.ts` still contains the legacy Supabase implementations. Files under `lib/api/` and `features/*/services/` are the stable boundaries consumed by new code. Move implementations out of `libraryService.ts` one domain at a time; callers should not need to change when that migration happens.

`styles.css` is the legacy component stylesheet and is loaded through `styles/components.css`. New global tokens belong in `styles/theme.css`, resets in `styles/globals.css`, and extracted page layout rules in `styles/layout.css`.

## Quality Gates

Run these before submitting a change:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Use `npm run lint:fix` and `npm run format` for automatic fixes. ESLint runs with zero warnings allowed.
