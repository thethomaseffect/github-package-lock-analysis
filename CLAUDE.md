# CLAUDE.md

Project context for AI assistants working on **github-package-lock-analysis**.

## Why this exists

Supply-chain attacks often land in **nested transitive dependencies** — packages that never appear in a project's `package.json` but do change in `package-lock.json` after `npm install`. Most security tooling focuses on:

- First-party application code
- Direct dependencies declared in `package.json`

This GitHub Action closes that gap by diffing lockfile changes, enriching every version bump with CVE and optional Hacker News signals, and publishing a static report so reviewers can see **exactly which nested packages changed** before merge.

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
│ Query CVE database  │────▶│ Optional HN lookup   │────▶│ Build static React  │
│ (e.g. NVD)          │     │                      │     │ report page         │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

1. **Trigger** — Runs in GitHub Actions when `package-lock.json` changes (typically on pull requests).
2. **Diff** — Compare the previous lockfile (base branch or prior commit) with the current one.
3. **Extract changes** — For every package whose resolved version changed, record: name, old version, new version, and dependency path from root.
4. **Enrich** — Look up CVEs for the package/version range and optionally search Hacker News for related discussion.
5. **Report** — Generate a static HTML page (React, built to static assets) and publish it as a workflow artifact or GitHub Pages deployment.
6. **Cleanup** — Temporary files and test fixtures are created dynamically and removed after the run; no `npm install` is executed against malicious lockfile data in production flows.

## Core logic

### Lockfile diffing

- Input: two `package-lock.json` files (before/after).
- Support npm lockfile v2/v3 semantics (`packages` map with `node_modules/` paths).
- A **change** is any entry where the resolved `version` string differs between old and new lockfiles.
- Ignore unchanged packages entirely in the output — the report is intentionally minimal.

### Dependency path presentation

Do **not** render a collapsible tree. Present paths like a filesystem breadcrumb:

```
my-app > lodash > some-nested-pkg
my-app > @scope/pkg > deep-dep
```

Rules:

- Start from the project root (top-level / direct deps first in sort order).
- Only show paths that contain at least one updated package.
- If multiple paths share a prefix, group visually but keep each changed leaf identifiable.

### Security classification

| Signal | UI colour | Meaning |
|--------|-----------|---------|
| CVE match (NVD or equivalent) for affected version range | **Red** | High likelihood of known security issues |
| Version changed, no confirmed CVE | **Yellow** | Changed and worth human review |
| Unchanged | *(hidden)* | Not shown in report |

CVE links should point to authoritative records, e.g. [CVE-2020-25268 on NVD](https://nvd.nist.gov/vuln/detail/CVE-2020-25268).

Red does not mean "definitely exploited" — it means "known vulnerability metadata exists for this package/version context." Yellow means "supply-chain surface changed; review changelogs."

### Changelog links

For each updated package, include a **best-effort changelog URL**:

- npm package page
- GitHub releases/tags for inferred repository
- Fallback: search link if canonical changelog unknown

Links are hints for reviewers, not guarantees.

### Optional Hacker News enrichment

When enabled, query Hacker News (Algolia HN API or similar) for package name + version or security-related keywords. Surface title, date, and link as supplementary context — never as sole evidence of compromise.

## Architecture (intended)

```
/
├── action.yml              # GitHub Action metadata & entrypoint
├── src/
│   ├── index.ts            # Action entry: orchestration
│   ├── lockfile/
│   │   ├── parse.ts        # Parse package-lock.json
│   │   ├── diff.ts         # Compute version changes + paths
│   │   └── types.ts
│   ├── enrichment/
│   │   ├── cve.ts          # NVD / OSV queries
│   │   └── hackernews.ts   # Optional HN search
│   └── report/
│       ├── build.tsx       # React report generator
│       └── components/     # Functional React components
├── fixtures/               # Local test lockfile pairs (safe, no install)
│   └── sample-project/     # Mini project for manual/CI testing
├── dist/                   # Compiled action + static report output (gitignored)
└── CLAUDE.md
```

### Technology choices

| Concern | Choice |
|---------|--------|
| Language | TypeScript |
| Runtime | Node.js (GitHub Actions `ubuntu-latest`) |
| Report UI | React (functional components), compiled to static HTML |
| Target platform | GitHub Actions only (not a general CLI product) |

### GitHub Action behaviour

- Inputs: paths to old/new lockfiles (or let action fetch base/head from git), flags for HN enrichment, output directory.
- Outputs: path to generated report, summary counts (changed packages, red/yellow counts).
- Permissions: `contents: read` minimum; optional `pages: write` if publishing.

## Report UI requirements

- Static site — no client-side server; works from artifact zip or GitHub Pages.
- List updated packages sorted with **top-level / shallow paths first**, then deeper nested paths.
- Each row: breadcrumb path, old → new version, colour badge, CVE links (if any), changelog link.
- Accessible contrast for red/yellow states; do not rely on colour alone (icons or labels).

## Local testing strategy

Because lockfiles and reports are **generated and discarded** without running installs against untrusted resolution graphs in CI:

1. **`fixtures/sample-project/`** — Small nested `package.json` + paired lockfiles (`before/` and `after/`) committed to the repo.
2. **Historically problematic versions** — Prefer packages with well-documented CVEs (e.g. older `lodash`, `minimist`, `node-forge`) in fixture data only; pin exact versions in fixture lockfiles manually or via one-time local generation that is then committed.
3. **Script** — `npm run test:fixtures` (or similar) runs diff + enrichment + report build against fixtures and asserts expected red/yellow classifications.
4. **Action dry-run** — `act` or a workflow_dispatch job that points at fixture paths.

Never commit live malware samples. Use known CVE-affected versions for red-path testing.

## Security & safety notes

- Parsing lockfiles is read-only JSON — low risk.
- CVE/HN calls are outbound HTTP — rate-limit and cache responses within a single workflow run.
- Do not execute postinstall scripts or `npm ci` on PR lockfiles in untrusted forks without explicit opt-in.
- Sanitize package names before embedding in HTML report.

## Out of scope (for now)

- Yarn Berry / pnpm lockfiles (npm `package-lock.json` first)
- Automatic PR blocking / policy gates (report-only)
- Private registry authentication beyond what GitHub Actions already provides

## Conventions for contributors

- Functional React components; no class components.
- Strict TypeScript; explicit types for lockfile and report models.
- Small, testable modules: parse → diff → enrich → render.
- User-facing docs in README; AI/session context in this file; hackathon prompt log in PROMPTS.md.
