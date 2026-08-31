# CLAUDE.md

Project context for AI assistants working on **github-package-lock-analysis**.

## Why this exists

Supply-chain attacks often land in **nested transitive dependencies** — packages that never appear in a project's `package.json` but do change in `package-lock.json` after `npm install`. Most security tooling focuses on:

- First-party application code
- Direct dependencies declared in `package.json`

This GitHub Action closes that gap by diffing lockfile changes, enriching every version bump with CVE data, and publishing a static report so reviewers can see **exactly which nested packages changed** before merge.

## High-level flow

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ GitHub Action runs  │────▶│ Detect lockfile diff │────▶│ Resolve version     │
│ on PR / push        │     │ (old vs new)         │     │ changes (all nodes) │
└─────────────────────┘     └──────────────────────┘     └──────────┬──────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    ▼
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ Query CVE database  │────▶│ Changelog / npm refs │────▶│ Build static React  │
│ (OSV → NVD links)   │     │                      │     │ report page         │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

1. **Trigger** — Runs in GitHub Actions when `package-lock.json` changes (typically on pull requests).
2. **Diff** — Compare the previous lockfile (PR base, prior push commit, or manifest last-published commit) with the current one.
3. **Extract changes** — For every package whose resolved version changed, record: name, old version, new version, and dependency path from root.
4. **Enrich** — Look up CVEs via OSV and resolve npm/changelog/GitHub reference links (skipped above `enrichment-limit`).
5. **Report** — Generate static HTML (React SSR), optional PR comment + job summary, artifact and/or GitHub Pages.
6. **Safety** — Parsing is read-only JSON; no `npm install` on untrusted lockfiles in production flows.

## Core logic

### Lockfile diffing

- Input: two `package-lock.json` files (before/after).
- Support npm lockfile v2/v3 semantics (`packages` map with `node_modules/` paths).
- A **change** is any entry where the resolved `version` string differs between old and new lockfiles.
- Ignore unchanged packages in the diff report — output is intentionally minimal.
- `toUnenrichedChanges()` in `diff.ts` supports the hackathon **baseline** path (yellow-only, no HTTP).

### Dependency path presentation

Do **not** render a collapsible tree. Present paths like a filesystem breadcrumb:

```
my-app > cheerio > lodash
my-app > accepts > negotiator
```

Rules:

- Start from the project root; sort shallow paths before deep nested paths.
- Only show paths that contain at least one updated package.

### Security classification

| Signal | UI | Meaning |
|--------|-----|---------|
| CVE match (OSV/NVD) for affected version | **Red** | Known vulnerability metadata for this package/version |
| Version changed, no confirmed CVE | **Yellow** | Supply-chain surface changed; review changelogs |
| Above `enrichment-limit` changed packages | **❓ Manual review** | Diff only; npm link, no bulk CVE/changelog HTTP |
| Unchanged in diff | *(hidden)* | Not listed in changed-packages section |
| `audit-existing` on HEAD lockfile | **Existing vulnerabilities** section | Separate slow scan of unchanged installed packages |

Red does not mean "definitely exploited." Yellow and manual-review rows still warrant human review.

### Changelog links

Best-effort per changed package: npm version page, GitHub releases/tags/changelog anchors, commit blob links when inferrable from registry metadata.

## Architecture

```
/
├── action.yml                 # Consumer GitHub Action (node24)
├── demo/action.yml            # Composite wrapper for fixture demo only
├── src/
│   ├── index.ts               # Action orchestration
│   ├── analyze.ts             # Diff + enrich + enrichment-limit logic
│   ├── audit-existing.ts      # Optional HEAD lockfile CVE scan
│   ├── concurrency.ts         # Bounded parallel enrichment
│   ├── manual-review.ts       # Manual-review badge copy
│   ├── run-mode.ts            # Explicit paths vs git auto-resolve
│   ├── report-manifest.ts     # Pages index HTML + manifest merge
│   ├── report-meta.ts         # Per-run report metadata sidecar
│   ├── lockfile/              # parse, diff, types
│   ├── enrichment/            # cve (OSV), changelog, minimal-references, urls
│   ├── git/                   # resolve-lockfiles, manifest base commit
│   ├── github/                # PR comments, job summary formatting
│   └── report/
│       ├── build.tsx          # renderToStaticMarkup entry
│       ├── write.ts           # Write index.html to disk
│       └── components/        # Report, PackageRow, ExistingVulnerabilityRow
├── scripts/
│   ├── run-fixtures.ts        # Advanced integration run (network)
│   ├── run-baseline.ts        # Baseline diff-only run (offline)
│   ├── prepare-pages-site.ts  # Merge report into Pages site dir
│   └── sync-pages-site-from-live.ts  # Pull live Pages before deploy (history retention)
├── fixtures/sample-project/   # before/after lockfiles + expected.json
├── tests/                     # Vitest unit tests (HTTP mocked)
└── dist/bundle/               # ncc bundle committed for @v1 consumers
```

### Technology choices

| Concern | Choice |
|---------|--------|
| Language | TypeScript |
| Action runtime | Node 24 (`action.yml` `runs.using: node24`) |
| Dev / CI runtime | Node 20+ |
| Report UI | React functional components → static HTML via `renderToStaticMarkup` |
| Target platform | GitHub Actions (not a general CLI product) |

### GitHub Action behaviour

Key inputs beyond lockfile paths: `skip-if-unchanged`, `post-pr-comment`, `fail-on-red` (default true), `enrichment-limit` / `enrichment-concurrency`, `pages-base-url`, `use-report-manifest-base`, `report-manifest-path`, `audit-existing` (workflow_dispatch only), `summary-list-limit`.

Outputs: `report-path`, `report-url`, counts (`changed-count`, `red-count`, `yellow-count`, `existing-red-count`), `report-commit`, `report-run-id`.

Permissions: `contents: read` minimum; `pull-requests: write` for comments; `pages: write` + `id-token: write` for Pages publishing.

## Report UI requirements

- Static site — no client-side server; works from artifact zip or GitHub Pages.
- Changed packages sorted shallow-first; breadcrumb, version arrow, badge, CVE + reference links.
- Accessible contrast; badges use labels/icons, not colour alone.
- Reports index at site root lists every workflow run; each report links back to index.

## Local testing strategy

Committed fixture lockfiles only — no `npm install` in CI:

| Command | Type | Network |
|---------|------|---------|
| `npm test` | Unit tests (38); fetch/CVE mocked | Offline |
| `npm run test:baseline` | Baseline fixture run | Offline |
| `npm run test:fixtures` | Advanced fixture run + assertions | OSV/npm |

Fixture `sample-project`: nested `lodash@4.17.15` (red when enriched), `negotiator` (yellow). CI runs all three test paths plus `action-smoke` via `demo/action.yml`.

Never commit live malware samples. Use known CVE-affected versions in fixtures only.

## Security & safety notes

- Parsing lockfiles is read-only JSON — low risk.
- CVE and changelog calls are outbound HTTP — cache within a run; bound concurrency; skip entirely above `enrichment-limit`.
- Do not execute postinstall scripts or `npm ci` on PR lockfiles from untrusted forks without explicit opt-in.
- Sanitize package names before embedding in HTML report.

## Out of scope (for now)

- Yarn Berry / pnpm lockfiles (npm `package-lock.json` first)
- Private registry authentication beyond what GitHub Actions already provides
- Hacker News enrichment (removed — stale/noisy for version-specific review)

Policy gates are opt-in: `fail-on-red: false` for informational runs; default fails when CVEs are found.

## Conventions for contributors

- Functional React components; no class components.
- Strict TypeScript; explicit types for lockfile and report models.
- Small, testable modules: parse → diff → enrich → render.
- User-facing docs in README; hackathon judge package in SUBMISSION.md; prompt log in PROMPTS.md; AI context in this file.
