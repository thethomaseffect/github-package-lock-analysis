# Hackathon submission — Frontier Engineering Challenge 2026

Submission for the [micro1 Frontier Engineering Challenge 2026](https://www.hackerearth.com/community/challenges/hackathon/micro1-frontier-engineering-challenge-2026/) on HackerEarth.

| Item | Value |
| --- | --- |
| **Repository** | https://github.com/thethomaseffect/github-package-lock-analysis |
| **Live demo (Pages index)** | https://thethomaseffect.github.io/github-package-lock-analysis/ |
| **Example report** | https://thethomaseffect.github.io/github-package-lock-analysis/reports/33384664174/ |
| **Action (consumers)** | `thethomaseffect/github-package-lock-analysis@v1` |

---

## Problem and user

**Who:** A team merging dependency updates on GitHub — reviewers who are not npm supply-chain specialists.

**Bottleneck:** When `package-lock.json` changes, nested packages can move without appearing in `package.json`. Most scanners focus on app code or direct deps. Reviewers need a **readable list of every nested version bump**, with CVE context and links, before merge.

**What we built:** A GitHub Action that diffs lockfiles, enriches changes with OSV/NVD data and changelog links, and publishes a static HTML report (artifact, GitHub Pages, or custom host).

---

## Baseline vs advanced solution

The hackathon requires both. We implement them as two runnable paths on the same fixture.

| | **Baseline** | **Advanced** |
| --- | --- | --- |
| **Scope** | Parse + diff lockfile; list changed packages as breadcrumbs; all rows yellow; no outbound API calls | Full pipeline: OSV CVE lookup, npm/changelog links, red/yellow classification, PR comments, Pages history, manifest-based diff baseline, large-diff manual-review mode, optional HEAD lockfile audit |
| **Run locally** | `npm run test:baseline` | `npm run test:fixtures` |
| **Output** | `fixtures/sample-project/.output-baseline/index.html` | `fixtures/sample-project/.output/index.html` |
| **Red/yellow on fixture** | 0 red, 2 yellow (no CVE data) | 1 red (`lodash`), 1 yellow (`negotiator`) |
| **Typical CI use** | Not recommended for production | `uses: thethomaseffect/github-package-lock-analysis@v1` |

**Measured improvement:** Baseline proves *which* nested packages changed. Advanced answers *whether known CVEs apply* and gives reviewers npm/changelog links — the fixture’s nested `lodash@4.17.15` under `cheerio` is flagged red only in the advanced path.

---

## Reproduction guide (clean environment)

**Requirements:** Node.js 20+, git, network (advanced path calls OSV/npm).

```bash
git clone https://github.com/thethomaseffect/github-package-lock-analysis.git
cd github-package-lock-analysis
npm ci

# Unit tests (no network for most tests)
npm test

# Baseline — diff-only report (~1s, offline after clone)
npm run test:baseline
# Open fixtures/sample-project/.output-baseline/index.html

# Advanced — full enrichment + fixture assertions (calls OSV)
npm run test:fixtures
# Open fixtures/sample-project/.output/index.html

# Build compiled action bundle
npm run build
```

**Expected fixture results (advanced):** 2 changed packages, 1 red, 1 yellow. Breadcrumb `sample-project > cheerio > lodash` shows CVE links.

**GitHub Action smoke:** CI job `action-smoke` in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs the demo action against fixtures on every push.

**Pages demo:** [.github/workflows/publish-pages.yml](.github/workflows/publish-pages.yml) deploys the fixture report; each run appends to the public index.

---

## Improvement changelog (baseline → advanced)

Built during the Aug 28–31 hackathon window (see [PROMPTS.md](./PROMPTS.md) for decision log):

1. Lockfile parse/diff (npm v2/v3) with breadcrumb paths, shallow-first sort
2. OSV CVE enrichment + red/yellow badges
3. Changelog/npm/commit reference links
4. React static HTML report
5. Git auto-resolve of base/head lockfiles on PR/push
6. PR comments + job summary
7. Fail-on-red with always-available report link
8. Manual `audit-existing` mode for unchanged packages
9. Run-scoped GitHub Pages URLs + reports index + manifest retention
10. Live-site sync so history survives Actions Pages deploys
11. `enrichment-limit` for massive diffs (manual-review rows)
12. Removed Hacker News enrichment (stale/noisy for version-specific review)

---

## Agent use disclosure

**Required by the hackathon:** coding-agent use with disclosed trajectories.

| Tool | Role |
| --- | --- |
| **Cursor** (IDE + Agent) | Primary coding agent for implementation, refactors, CI/workflows, and docs |
| **Claude** (via Cursor) | Architecture decisions, code generation, test fixes |

**Trajectory evidence:**

- **[PROMPTS.md](./PROMPTS.md)** — summarized prompts and outcomes between commits (not verbatim chat)
- **Git history** — `git log --oneline` on `main` shows incremental delivery Aug 31, 2026
- **Cursor agent transcript** — available locally as session export if judges request full traces

Agent instructions that shaped the project: [CLAUDE.md](./CLAUDE.md) (repository context for assistants).

---

## Solution video (≤ 5 minutes) — outline

Record and upload separately on HackerEarth. Suggested flow:

1. **Problem** (30s) — nested lockfile changes vs `package.json`-only scanning
2. **Baseline** (45s) — run `npm run test:baseline`, show yellow-only report
3. **Advanced** (90s) — run `npm run test:fixtures` or open live demo; show red lodash under cheerio, CVE links, index with multiple runs
4. **CI** (45s) — point at workflow + PR comment / artifact
5. **Changelog** (30s) — one advanced feature that mattered most (e.g. nested path + CVE on transitive dep)
6. **Limitations** (30s) — npm lockfiles only; enrichment can be slow; OSV coverage gaps

---

## Known limitations (intentional scope)

- **npm `package-lock.json` only** — not Yarn Berry or pnpm
- **Report-only** — does not block merges unless `fail-on-red: true`
- **CVE data is best-effort** — OSV coverage varies; red means metadata exists, not confirmed exploit
- **Large diffs** — above `enrichment-limit`, CVE/changelog lookups skipped (manual review rows)
- **Fork PRs** — use standard GitHub Actions trust boundaries; no `npm install` on untrusted lockfiles
- **No Hacker News** — removed after testing showed version-specific queries rarely matched; would surface stale discussions if relaxed

---

## Submission checklist (HackerEarth)

Before **Aug 31, 18:00 UTC** ([challenge page](https://www.hackerearth.com/community/challenges/hackathon/micro1-frontier-engineering-challenge-2026/)):

- [ ] Register on HackerEarth (if not already)
- [ ] Submit **repository URL** (public)
- [ ] Confirm README + this file are on default branch
- [ ] Upload **solution video** (≤ 5 min)
- [ ] Attach **agent trajectories** (PROMPTS.md + export or summary)
- [ ] Verify `npm ci && npm test && npm run test:baseline && npm run test:fixtures` on a clean machine
- [ ] Optional: link live demo in submission notes

**Contact (organizers):** yeison@micro1.ai

---

## Mapping to evaluation criteria

| Criterion | Evidence |
| --- | --- |
| **Reproducibility** | Single-command setup (`npm ci`), scripted baseline/advanced runs, CI green, committed fixture lockfiles (no install) |
| **Agent solution & engineering** | Full Action + Pages + manifest; [PROMPTS.md](./PROMPTS.md) documents agent-driven iteration |
| **Measured improvement** | Baseline vs advanced on same fixture; red CVE only after enrichment |
| **End-to-end quality** | Live Pages demo, `@v1` tag, consumer README, 38 unit tests |

Good luck — and if something fails during judge reproduction, open an issue on the repo.
