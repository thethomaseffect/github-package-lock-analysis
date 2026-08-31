# github-package-lock-analysis

When `package-lock.json` changes on a pull request, this action shows you **every nested package that moved** — not just what's in `package.json`. It checks CVE databases, builds a static HTML report, and can comment on the PR.

Most supply-chain trouble hides in transitive deps. Your app code and direct dependencies might look fine while a deep nested package quietly updates. This closes that gap.

## What you get

On each run:

1. Diff the old and new lockfile (from git on PRs, or paths you provide)
2. List only packages whose **resolved version** changed
3. Look up CVEs via [OSV](https://osv.dev/) (links to [NVD](https://nvd.nist.gov/))
4. Write an HTML report and optionally post a PR summary

Paths in the report look like breadcrumbs:

```
my-app > cheerio > lodash
my-app > accepts > negotiator
```

Each row: old → new version, changelog/npm links, and a colour badge:

- **Red** — known CVE likely applies
- **Yellow** — changed; worth a look
- **❓ Manual review** — too many changes for automatic CVE lookup; use the npm link (see [Large lockfile diffs](#large-lockfile-diffs))

## Getting started

Add a workflow (e.g. `.github/workflows/lockfile-analysis.yml`):

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
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # needed so git can find the base lockfile

      - uses: thethomaseffect/github-package-lock-analysis@v1
        id: analysis
        with:
          lockfile-path: package-lock.json

      - uses: actions/upload-artifact@v6
        if: steps.analysis.outputs.report-path != ''
        with:
          name: lockfile-report
          path: report-output/
```

That's enough for most teams: PR comment + downloadable HTML artifact. The action skips the run if the lockfile didn't change (`skip-if-unchanged`, on by default).

**Monorepo?** Set `lockfile-path` to e.g. `apps/web/package-lock.json`.

**Want less YAML?** Call the [reusable workflow](.github/workflows/lockfile-analysis-reusable.yml):

```yaml
jobs:
  analyze:
    uses: thethomaseffect/github-package-lock-analysis/.github/workflows/lockfile-analysis-reusable.yml@v1
    permissions:
      contents: read
      pull-requests: write
```

## Where to host the report

The action always writes files to `report-output/`. What you do with them is up to you:

| Approach | Good for | What to add |
| --- | --- | --- |
| **Artifact only** | Simplest setup | Nothing — download from the workflow run |
| **GitHub Pages** | Public report history, shareable links | Enable Pages (Actions source), copy [`prepare-pages-site.ts`](scripts/prepare-pages-site.ts) + [`sync-pages-site-from-live.ts`](scripts/sync-pages-site-from-live.ts), follow [lockfile-analysis.yml](.github/workflows/lockfile-analysis.yml) |
| **Your own host** | S3, Netlify, internal CDN | Same merge scripts, then upload the site dir yourself |

For Pages, each run gets a URL like `https://you.github.io/your-repo/reports/<workflow-run-id>/`. The site root lists every past run. Set `pages-base-url` so PR comments link there.

**Manifest mode** (`use-report-manifest-base: true`): compare against the last *published* report, not every intermediate commit. Handy when several commits land between deploys.

Full reference workflows live in [`.github/workflows/`](.github/workflows/) — copy and trim rather than building from scratch here.

## Large lockfile diffs

A big `npm update` can touch thousands of nested packages. Each one triggers CVE and changelog lookups, so runtime grows with change count.

The key variable is **`enrichment-limit`** (default `500`). Below that, everything gets full enrichment. Above it, the report still lists every change, but rows are ❓ **manual review** with an npm link only — no bulk API calls.

```yaml
with:
  enrichment-limit: 2000      # raise for large monorepos
  enrichment-concurrency: 12  # parallel lookups under the limit
```

A few hundred changes usually finish in minutes. Thousands can take up to an hour — fine if lockfile changes are occasional.

If the lockfile changes constantly (Renovate, nightly bumps), don't block merges on it. Run analysis after your main CI with `needs: ci` and `fail-on-red: false`; review the report or Pages link when you're ready.

## Manual audit (optional)

On `workflow_dispatch` only, you can scan the **current** lockfile for known CVEs in packages that didn't change — useful peace of mind after past incidents. Enable with `audit-existing: true`. It's slow on huge lockfiles; not for every PR.

## Configuration reference

### Common inputs

| Input | Default | Notes |
| --- | --- | --- |
| `lockfile-path` | `package-lock.json` | |
| `post-pr-comment` | `true` | |
| `skip-if-unchanged` | `true` | |
| `fail-on-red` | `true` | Set `false` for informational runs |
| `enrichment-limit` | `500` | See [Large lockfile diffs](#large-lockfile-diffs) |
| `pages-base-url` | — | Enables public report URLs in comments |
| `use-report-manifest-base` | `false` | Diff vs last published report |

[action.yml](action.yml) lists every input and output.

### Permissions

- **PR comment + artifact:** `contents: read`, `pull-requests: write`
- **GitHub Pages:** also `pages: write`, `id-token: write`, Pages enabled on the repo

## Development

Node.js 20+.

```bash
npm install
npm run lint
npm test
npm run build
npm run test:fixtures   # hits OSV; writes fixtures/sample-project/.output/index.html
npm run test:baseline   # diff-only; writes fixtures/sample-project/.output-baseline/index.html
```

The fixture uses nested `lodash@4.17.15` (red) and `negotiator` (yellow). Lockfiles are committed JSON — no `npm install` in CI.

## Live demo

This repo publishes a fixture demo to GitHub Pages ([index](https://thethomaseffect.github.io/github-package-lock-analysis/)). Consumer repos use the root action (`@v1`); [`demo/action.yml`](demo/action.yml) is only for our sample-project fixtures.

## Hackathon submission

Built for the [micro1 Frontier Engineering Challenge 2026](https://www.hackerearth.com/community/challenges/hackathon/micro1-frontier-engineering-challenge-2026/).

| Path | Command | What it proves |
| --- | --- | --- |
| **Baseline** | `npm run test:baseline` | Diff-only report, no CVE lookups |
| **Advanced** | `npm run test:fixtures` | Full enrichment (red/yellow on fixture) |

Full judge package: [SUBMISSION.md](./SUBMISSION.md) · agent trajectories: [docs/AGENT_TRAJECTORIES.md](./docs/AGENT_TRAJECTORIES.md) · [PROMPTS.md](./PROMPTS.md)

## Docs

- [CLAUDE.md](./CLAUDE.md) — architecture for contributors
- [PROMPTS.md](./PROMPTS.md) — hackathon prompt log

## License

See [LICENSE](./LICENSE).
