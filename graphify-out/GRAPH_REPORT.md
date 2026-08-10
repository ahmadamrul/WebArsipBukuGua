# Graph Report - .  (2026-08-10)

## Corpus Check
- 117 files · ~78,170 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 527 nodes · 1407 edges · 30 communities (19 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Comic Service & jszip
- Comic Form UI
- Comic Draft Actions
- Session Management
- Architecture Docs
- Import/Export Core
- Type References
- Library Actions
- Settings Components
- ESLint Config
- XML Parser Deps
- Build Scripts
- Package Config
- AppSidebar.tsx
- .prettierrc.json
- cover-proxy/index.ts
- eslint
- eslint-plugin-react-hooks
- prettier
- vite
- @vitejs/plugin-react
- app/ - Composition and Providers
- components/ - Shared Presentation Components
- Authentication and Profile Management
- Comic Detail Page
- Dashboard Statistics

## God Nodes (most connected - your core abstractions)
1. `detectMetadata()` - 29 edges
2. `App()` - 24 edges
3. `LibraryLabel` - 22 edges
4. `formatSupabaseError()` - 22 edges
5. `createSessionActions()` - 20 edges
6. `requireUser()` - 19 edges
7. `Comic` - 18 edges
8. `normalizeComparableText()` - 18 edges
9. `uniqueStrings()` - 17 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Hero Image - Layered Architecture Visualization` --conceptually_related_to--> `Feature-Based Clean Architecture`  [INFERRED]
  src/assets/hero.png → docs/ARCHITECTURE.md
- `App Icon - Book Collection Management` --conceptually_related_to--> `Comics Feature Module`  [INFERRED]
  public/app-icon.png → docs/ARCHITECTURE.md
- `HTML App Entry Point` --references--> `Arsip Buku Gua Web Application`  [EXTRACTED]
  index.html → README.md
- `Supabase Database Schema` --cites--> `Supabase Authentication`  [INFERRED]
  docs/AUDIT-FITUR-DAN-BUG.md → README.md
- `Supabase Database Schema` --cites--> `PostgreSQL Database`  [INFERRED]
  docs/AUDIT-FITUR-DAN-BUG.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Feature Modules in Clean Architecture** — docs_architecture_auth_feature, docs_architecture_comics_feature, docs_architecture_labels_feature, docs_architecture_sources_feature, docs_architecture_reading_progress_feature, docs_architecture_import_export_feature, docs_architecture_metadata_detection_feature, docs_architecture_settings_feature [EXTRACTED 1.00]
- **Core Modules Layer - Infrastructure Support** — docs_architecture_lib_api, docs_architecture_lib_domain, docs_architecture_lib_utils, docs_architecture_lib_constants [EXTRACTED 1.00]
- **Integrated Technology Stack** — readme_react_19, readme_typescript, readme_vite, readme_supabase_auth, readme_postgres [INFERRED 0.85]

## Communities (30 total, 11 thin omitted)

### Community 0 - "Comic Service & jszip"
Cohesion: 0.06
Nodes (92): jszip, jszip, addComic(), addComicLabel(), addComicSource(), addLabel(), cleanDetectedTitle(), collectAggressiveCandidates() (+84 more)

### Community 1 - "Comic Form UI"
Cohesion: 0.07
Nodes (57): AppComicFormModal(), AppComicFormModalProps, DetectedTitleOption, TFunction, AppComicPanel(), AppComicPanelProps, chapterNumberFromLabel(), AppDashboard() (+49 more)

### Community 2 - "Comic Draft Actions"
Cohesion: 0.06
Nodes (58): ComicDraftActionsDeps, createComicDraftActions(), SetState, App(), emptyComicForm, emptyLabelForm, emptySourceEditForm, emptySourceForm (+50 more)

### Community 3 - "Session Management"
Cohesion: 0.10
Nodes (38): createSessionActions(), SessionActionsDeps, SetState, SessionStateDeps, SetState, AuthLabels, AuthScreen(), AuthScreenProps (+30 more)

### Community 4 - "Architecture Docs"
Cohesion: 0.07
Nodes (38): Auth Feature Module, Comics Feature Module, Dependency Direction Rules, Feature-Based Clean Architecture, Import/Export Feature Module, Labels Feature Module, lib/libraryService.ts - Legacy Supabase Implementation, lib/api - Cloud and Persistence Boundary (+30 more)

### Community 5 - "Import/Export Core"
Cohesion: 0.12
Nodes (21): deleteReadingProgress(), formatSupabaseError(), requireUser(), setLastReadChapter(), formatSupabaseError(), loadLibrary(), requireUser(), cloudConfigMissing (+13 more)

### Community 6 - "Type References"
Cohesion: 0.09
Nodes (22): DOM, ES2023, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly (+14 more)

### Community 7 - "Library Actions"
Cohesion: 0.28
Nodes (17): createLibraryActions(), LibraryActionsDeps, SetState, createComicFormActions(), addComicSource(), deleteComicSource(), formatSupabaseError(), requireUser() (+9 more)

### Community 8 - "Settings Components"
Cohesion: 0.15
Nodes (12): AppSettingsPanels(), AppSettingsPanelsProps, TFunction, ConfirmState, MessageTone, NotificationToast(), NotificationToastProps, localeLabels (+4 more)

### Community 9 - "ESLint Config"
Cohesion: 0.13
Nodes (15): eslint-config-prettier, @eslint/js, eslint-plugin-react-refresh, devDependencies, eslint-config-prettier, @eslint/js, eslint-plugin-react-refresh, @types/react (+7 more)

### Community 10 - "XML Parser Deps"
Cohesion: 0.22
Nodes (9): fast-xml-parser, dependencies, fast-xml-parser, react, react-dom, @supabase/supabase-js, react, react-dom (+1 more)

### Community 11 - "Build Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, format:check, lint, lint:fix, preview (+1 more)

### Community 12 - "Package Config"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 13 - "AppSidebar.tsx"
Cohesion: 0.50
Nodes (3): AppSidebar(), AppSidebarProps, SidebarLabels

### Community 14 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

## Knowledge Gaps
- **144 isolated node(s):** `printWidth`, `singleQuote`, `trailingComma`, `name`, `private` (+139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `jszip` connect `Comic Service & jszip` to `XML Parser Deps`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `dependencies` connect `XML Parser Deps` to `Comic Service & jszip`, `Package Config`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `LibraryLabel` connect `Comic Form UI` to `Comic Service & jszip`, `Comic Draft Actions`, `Session Management`, `Import/Export Core`, `Library Actions`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `printWidth`, `singleQuote`, `trailingComma` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Comic Service & jszip` be split into smaller, more focused modules?**
  _Cohesion score 0.055451829723674385 - nodes in this community are weakly interconnected._
- **Should `Comic Form UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06683878370625358 - nodes in this community are weakly interconnected._
- **Should `Comic Draft Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.05707450444292549 - nodes in this community are weakly interconnected._