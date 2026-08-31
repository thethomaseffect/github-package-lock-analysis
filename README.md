# github-package-lock-analysis

A GitHub Action that reviews **nested dependency changes** in `package-lock.json` — the updates most security tools never surface.

When a pull request changes the lockfile, this action diffs old vs new, looks up CVE data (and optionally Hacker News), and publishes a **static report** so reviewers can see exactly which transitive packages moved and whether known vulnerabilities apply.

## The problem

Supply-chain attacks often arrive through **deep transitive dependencies**. Your `package.json` may not change at all while `package-lock.json` picks up a compromised nested package. Typical scanners focus on:

- Your application source code
- Direct dependencies in `package.json`

They rarely give you a readable audit of **every lockfile version bump** on a PR.

## What it does

1. Detects changes to `package-lock.json` in CI
2. Compares the previous lockfile with the new one (from git on PR/push, or explicit paths)
3. Collects every package whose **resolved version** changed (including nested deps)
4. Queries CVE databases via [OSV](https://osv.dev/) (links to [NVD](https://nvd.nist.gov/) records)
5. Builds a static HTML report (React + TypeScript) listing **only updated packages**
6. Optionally posts a PR comment and uploads the HTML report as a workflow artifact

### Report layout

Paths read like a directory breadcrumb, not a tree widget:

```
sample-project > cheerio > lodash
sample-project > accepts > negotiator
```

Each entry includes:

- Old → new version
- Changelog link (best effort)
- CVE links when matches exist
- **Red** — known CVE likely applies to this version
- **Yellow** — version changed; review recommended

Unchanged packages are omitted.

## Project structure

```
├── action.yml                              # GitHub Action definition
├── src/
│   ├── index.ts                            # Action entrypoint
│   ├── analyze.ts                          # Diff + enrichment orchestration
│   ├── git/                                # Auto-resolve base/head lockfiles
│   ├── github/                             # PR comments & summary formatting
│   ├── lockfile/                           # Parse & diff package-lock.json
│   ├── enrichment/                         # CVE (OSV), Hacker News, URLs
│   └── report/                             # React static HTML report
├── fixtures/sample-project/                # Safe before/after lockfile pairs
├── scripts/run-fixtures.ts                 # End-to-end local fixture runner
├── .github/workflows/
│   ├── ci.yml                              # Build & test
│   ├── lockfile-analysis.yml               # Demo workflow for this repo
│   └── lockfile-analysis-reusable.yml      # Callable workflow for consumers
└── tests/
```

## Development

Requires Node.js 20+.

```bash
npm install
npm run lint      # Typecheck
npm test          # Unit tests
npm run build     # Compile to dist/
npm run test:fixtures   # Full pipeline against fixtures (hits OSV API)
```

The fixture project uses `cheerio` (direct dep) whose nested `lodash@4.17.15` has known CVEs → red, plus a nested `negotiator` downgrade under `accepts` → yellow. Lockfiles are committed as static JSON — **no `npm install` is run** in CI against fixture data.

After `npm run test:fixtures`, open `fixtures/sample-project/.output/index.html` to preview the report.

## Using the action

### Automatic mode (pull requests)

Checkout must use `fetch-depth: 0` so the action can read the base lockfile from git.

```yaml
permissions:
  contents: read
  pull-requests: write

jobs:
  lockfile-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: thethomaseffect/github-package-lock-analysis@v1
        id: analysis
        with:
          lockfile-path: package-lock.json
          post-pr-comment: true
        if: steps.analysis.outputs.report-path != ''
        with:
          name: lockfile-report
          path: report-output/index.html
```

On `pull_request` events the action resolves:

- **Base lockfile** — `pull_request.base.sha`
- **Head lockfile** — checked-out workspace file (or `pull_request.head.sha`)

Set `skip-if-unchanged: true` (default) to exit early when git reports no diff for the lockfile.

### Explicit lockfile paths (fixtures / testing)

```yaml
- uses: ./
  id: analysis
  with:
    old-lockfile-path: fixtures/sample-project/before/package-lock.json
    new-lockfile-path: fixtures/sample-project/after/package-lock.json
    output-dir: report-output
    project-name: my-app
    skip-if-unchanged: false
```

### Reusable workflow

```yaml
jobs:
  analyze-lockfile:
    uses: your-org/github-package-lock-analysis/.github/workflows/lockfile-analysis-reusable.yml@main
    permissions:
      contents: read
      pull-requests: write
```

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `lockfile-path` | `package-lock.json` | Lockfile path relative to repo root |
| `old-lockfile-path` | *(auto)* | Override base lockfile path |
| `new-lockfile-path` | *(auto)* | Override head lockfile path |
| `base-ref` / `head-ref` | *(auto)* | Git refs when resolving from history |
| `include-hackernews` | `false` | Add Hacker News links |
| `post-pr-comment` | `true` | Post/update PR summary comment |
| `skip-if-unchanged` | `true` | Skip when git diff is empty |
| `artifact-name` | `lockfile-report` | Name referenced in PR comments |

### Outputs

`report-path`, `changed-count`, `red-count`, `yellow-count`

## GitHub Pages

This repository's Pages site shows the **fixture demo report** (`sample-project` with lodash CVE + nested negotiator changes):

**https://thethomaseffect.github.io/github-package-lock-analysis/**

1. Enable **GitHub Pages** in repository settings with source **GitHub Actions**
2. The [publish-pages workflow](.github/workflows/publish-pages.yml) deploys the demo; [lockfile-analysis](.github/workflows/lockfile-analysis.yml) handles real PR analysis as workflow artifacts

## Release

Use the tagged action in workflows:

```yaml
- uses: thethomaseffect/github-package-lock-analysis@v1
```

## Docs

- [CLAUDE.md](./CLAUDE.md) — architecture and logic for contributors
- [PROMPTS.md](./PROMPTS.md) — hackathon prompt log

## License

See [LICENSE](./LICENSE).
