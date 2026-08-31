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
├── scripts/
│   ├── run-fixtures.ts                       # End-to-end local fixture runner
│   └── prepare-pages-site.ts                 # Merge reports into a static site (Pages / custom host)
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

After `npm run test:fixtures`, open `fixtures/sample-project/.output/index.html` to preview the report.

## Consumer setup

Pick one of three integration levels. All of them use the published action:

```yaml
- uses: thethomaseffect/github-package-lock-analysis@v1
```

**Requirements for every setup**

- `actions/checkout` with `fetch-depth: 0` when the action should resolve base/head lockfiles from git (PR and push flows).
- `permissions.contents: read` at minimum.
- `permissions.pull-requests: write` if you want PR comments (`post-pr-comment: true`, the default).

**Monorepo lockfiles** — set `lockfile-path` (or `old-lockfile-path` / `new-lockfile-path`) to the path inside the repo, e.g. `apps/web/package-lock.json`.

---

### Tier 1 — Artifact only (simplest)

No hosting setup. The action writes HTML to `report-output/`, posts an optional PR comment, and adds a job summary with a download link.

Create `.github/workflows/lockfile-analysis.yml` in your repository:

```yaml
name: Lockfile Analysis

on:
  pull_request:
    paths:
      - package-lock.json
      - package.json

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
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
          fail-on-red: true

      - uses: actions/upload-artifact@v4
        if: steps.analysis.outputs.report-path != ''
        with:
          name: lockfile-report
          path: report-output/
```

**Or** call the reusable workflow (same behaviour, less YAML to maintain):

```yaml
jobs:
  analyze-lockfile:
    uses: thethomaseffect/github-package-lock-analysis/.github/workflows/lockfile-analysis-reusable.yml@v1
    permissions:
      contents: read
      pull-requests: write
```

On `pull_request` events the action resolves:

- **Base lockfile** — `pull_request.base.sha` (or the last published report commit when manifest mode is enabled; see Tier 2)
- **Head lockfile** — the checked-out workspace file

Set `skip-if-unchanged: true` (default) to exit early when git reports no diff for the lockfile.

---

### Tier 2 — GitHub Pages (public retained reports)

Each workflow run publishes a unique report under **`/reports/<workflow-run-id>/`**. The site root lists **every** workflow run, including multiple runs for the same commit. Individual reports link back to the index.

**One-time repo setup**

1. Enable **GitHub Pages** in repository settings with source **GitHub Actions**.
2. Copy [`scripts/prepare-pages-site.ts`](scripts/prepare-pages-site.ts) into your repo (or vendor this file from `@v1`). It merges `report-output/` into a static site directory and updates `reports/manifest.json`.
3. Add a workflow based on the pattern below (see [lockfile-analysis.yml](.github/workflows/lockfile-analysis.yml) in this repo for a full reference).

```yaml
name: Lockfile Analysis

on:
  pull_request:
    paths:
      - package-lock.json
  push:
    branches: [main]
    paths:
      - package-lock.json

permissions:
  contents: read
  pull-requests: write
  pages: write
  id-token: write

concurrency:
  group: lockfile-pages
  cancel-in-progress: false

jobs:
  analyze:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fetch existing Pages site
        run: |
          if git ls-remote --exit-code --heads origin gh-pages > /dev/null 2>&1; then
            git fetch --depth=1 origin gh-pages
            git worktree add gh-pages-site FETCH_HEAD
          else
            mkdir -p gh-pages-site/reports
          fi

      - name: Resolve commit metadata
        id: report-commit
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            SHA="${{ github.event.pull_request.head.sha }}"
          else
            SHA="${{ github.sha }}"
          fi
          echo "sha=${SHA}" >> "$GITHUB_OUTPUT"
          {
            echo "title<<EOF"
            git log -1 --format=%s "${SHA}"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - uses: thethomaseffect/github-package-lock-analysis@v1
        id: analysis
        with:
          lockfile-path: package-lock.json
          post-pr-comment: ${{ github.event_name == 'pull_request' }}
          pages-base-url: https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}
          report-manifest-path: gh-pages-site/reports/manifest.json
          use-report-manifest-base: true
          report-commit: ${{ steps.report-commit.outputs.sha }}
          report-commit-title: ${{ steps.report-commit.outputs.title }}

      - uses: actions/upload-artifact@v4
        if: steps.analysis.outputs.report-path != ''
        with:
          name: lockfile-report
          path: report-output/

      - name: Merge report into Pages site
        if: steps.analysis.outputs.report-path != ''
        run: |
          npx tsx scripts/prepare-pages-site.ts \
            --site-dir gh-pages-site \
            --report-file report-output/index.html \
            --meta-file report-output/report-meta.json \
            --pages-base-url "https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}" \
            --repository-url "https://github.com/${{ github.repository }}"

      - uses: actions/upload-pages-artifact@v3
        if: steps.analysis.outputs.report-path != ''
        with:
          path: gh-pages-site

      - id: deployment
        if: steps.analysis.outputs.report-path != ''
        uses: actions/deploy-pages@v4
```

**Example URLs** (replace owner/repo):

- Index: `https://my-org.github.io/my-app/`
- Report: `https://my-org.github.io/my-app/reports/12345678901/`

**Custom Pages URL** — set `pages-base-url` to wherever the site is served:

| Hosting | Example `pages-base-url` |
| --- | --- |
| Project site | `https://my-org.github.io/my-app` |
| User/org site repo | `https://my-org.github.io` |
| Custom domain | `https://lockfile-reports.example.com` |
| Subpath on a larger site | `https://example.com/security/lockfiles` |

**Diff baseline with manifest mode** — when `use-report-manifest-base: true`, the action compares the current lockfile against the **last published report commit**, not every intermediate commit. If ten commits landed between reports, one report covers the cumulative diff from the previous report to HEAD.

---

### Tier 3 — Custom host (S3, Netlify, internal server, …)

The action only generates files; you choose where to upload them.

1. Run the action (Tier 1 YAML is enough for the analysis step).
2. Run `prepare-pages-site.ts` to merge the new report into a site directory (same script as Tier 2).
3. Deploy that directory with your own tooling.

```yaml
      - uses: thethomaseffect/github-package-lock-analysis@v1
        id: analysis
        with:
          lockfile-path: package-lock.json
          pages-base-url: https://reports.example.com
          fail-on-red: true

      - name: Build static site
        if: steps.analysis.outputs.report-path != ''
        run: |
          npx tsx scripts/prepare-pages-site.ts \
            --site-dir ./site \
            --report-file report-output/index.html \
            --meta-file report-output/report-meta.json \
            --pages-base-url "https://reports.example.com" \
            --repository-url "https://github.com/${{ github.repository }}"

      # Example: upload to S3 (replace with Netlify, Azure Blob, rsync, etc.)
      - run: aws s3 sync ./site s3://my-reports-bucket/ --delete
```

Set `pages-base-url` to the **public base URL** where `./site` will be served so PR comments and the reports index link correctly. To override the link entirely, pass `report-url` instead.

If you already host reports elsewhere and only need a link in PR comments, skip `prepare-pages-site.ts` and set:

```yaml
report-url: https://your-cdn.example.com/path/to/this-report/
```

---

### Permissions reference

| Feature | Permissions |
| --- | --- |
| PR comments + artifact | `contents: read`, `pull-requests: write` |
| GitHub Pages deploy | above + `pages: write`, `id-token: write`, Pages enabled, `github-pages` environment |

---

### Explicit lockfile paths (fixtures / testing)

```yaml
- uses: thethomaseffect/github-package-lock-analysis@v1
  id: analysis
  with:
    old-lockfile-path: fixtures/sample-project/before/package-lock.json
    new-lockfile-path: fixtures/sample-project/after/package-lock.json
    output-dir: report-output
    project-name: my-app
    skip-if-unchanged: false
    fail-on-red: false
```

Use `fail-on-red: false` when the fixture intentionally includes CVEs (demo/CI smoke).

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `lockfile-path` | `package-lock.json` | Lockfile path relative to repo root |
| `old-lockfile-path` | *(auto)* | Override base lockfile path |
| `new-lockfile-path` | *(auto)* | Override head lockfile path |
| `base-ref` / `head-ref` | *(auto)* | Git refs when resolving from history |
| `output-dir` | `report-output` | Directory for HTML report and `report-meta.json` |
| `include-hackernews` | `false` | Add Hacker News links |
| `post-pr-comment` | `true` | Post/update PR summary comment |
| `skip-if-unchanged` | `true` | Skip when git diff is empty |
| `fail-on-red` | `true` | Fail the job when known CVEs are found |
| `audit-existing` | `false` | Manual `workflow_dispatch` only — scan HEAD lockfile for CVEs (no diff) |
| `artifact-name` | `lockfile-report` | Name referenced in PR comments |
| `report-url` | *(empty)* | Explicit public report URL (overrides `pages-base-url` for links) |
| `pages-base-url` | *(empty)* | Base URL for hosted reports; enables `report-url` output as `{base}/reports/{run-id}/` |
| `report-manifest-path` | *(empty)* | Path to `reports/manifest.json` from a checked-out site |
| `use-report-manifest-base` | `false` | Diff against last published report commit instead of PR base / push `before` |
| `report-commit` | *(auto)* | Head commit SHA stored in report metadata |
| `report-base-commit` | *(auto)* | Base commit SHA stored in report metadata (git-resolved when omitted) |
| `report-run-id` | *(auto)* | Workflow run ID used in report URL paths |
| `report-commit-title` | *(empty)* | Commit title shown on the reports index |

### Outputs

| Output | Description |
| --- | --- |
| `report-path` | Path to generated `index.html` (empty when skipped) |
| `report-url` | Public report URL when `pages-base-url` or `report-url` is set |
| `report-run-id` | Workflow run ID for this report |
| `report-commit` | Head commit SHA for this report |
| `changed-count` | Packages with version changes |
| `red-count` | Changed packages with known CVEs |
| `yellow-count` | Changed packages without confirmed CVEs |
| `existing-red-count` | Existing CVEs found during `audit-existing` audit |

## GitHub Pages (this repository)

This repo publishes a live demo via [publish-pages.yml](.github/workflows/publish-pages.yml):

- **Index:** https://thethomaseffect.github.io/github-package-lock-analysis/
- **Example report:** https://thethomaseffect.github.io/github-package-lock-analysis/reports/33381735935/

Real lockfile analysis on PR/push uses [lockfile-analysis.yml](.github/workflows/lockfile-analysis.yml).

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
