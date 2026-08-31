# PROMPTS.md

Hackathon log of **prompt summaries** between local commits. Entries are not verbatim prompts — they capture intent and scope so we can trace how the project evolved.

## How to use this file

After each meaningful local commit (or batch of commits before pushing), add a dated entry with:

1. **Summary** — What was asked for or decided
2. **Scope** — Files, features, or docs touched
3. **Outcome** — What landed (or what was deferred)

Keep entries concise. Link to commits when helpful (`abc1234`).

---

## 2026-08-31 — Initial project definition & documentation

**Summary:** Bootstrap a fresh GitHub Action project that diffs `package-lock.json` on CI, enriches nested version changes with CVE data (OSV/NVD), and publishes a static React/TypeScript report. Only updated packages appear, shown as directory-style paths (`root > parent > child`), with changelog links. Red/yellow classification. Motivation: nested supply-chain attacks. Include fixture project for safe testing. Docs: `CLAUDE.md`, `README`, `PROMPTS.md`. *(Hacker News enrichment was added early then removed in `0f4f3b0` — queries were too noisy/stale.)*

**Scope:** Repository scaffolding and documentation only (`CLAUDE.md`, `README.md`, `PROMPTS.md`).

**Outcome:** Documented architecture, data flow, UI rules, testing strategy, and tech stack (TypeScript, React static report, GitHub Actions-only). Application code, fixtures, and action metadata not yet implemented.

---

## 2026-08-31 — Scaffold TypeScript action & report pipeline

**Summary:** Scaffold the full GitHub Action: lockfile parse/diff, OSV CVE enrichment, React static HTML report, fixture project with lodash/negotiator scenarios, vitest unit tests, CI workflow, and local `test:fixtures` runner.

**Scope:** `src/`, `action.yml`, `fixtures/`, `tests/`, `.github/workflows/ci.yml`, `README.md`.

**Outcome:** Working build, tests, and fixture pipeline producing red/yellow classified HTML report.

---

## 2026-08-31 — Git auto-resolve, PR comments & workflows

**Summary:** Continue implementation with git-based base/head lockfile resolution for PR/push events, richer job summaries, optional PR comments, artifact-oriented reusable workflow, and demo lockfile-analysis workflow.

**Scope:** `src/git/`, `src/github/`, `src/index.ts`, `action.yml`, workflows, tests, `README.md`.

**Outcome:** Action supports automatic mode with `fetch-depth: 0` checkout, skip-if-unchanged, PR comment posting, and consumer-facing workflow examples.

---

## 2026-08-31 — v1 release, Pages deploy & root lockfile workflow

**Summary:** Publish `@v1` tag with committed `dist/`, wire lockfile-analysis workflow to root `package-lock.json` via git auto-resolve, add GitHub Pages deployment on main, optional `report-url` in PR comments, and document Pages setup.

**Scope:** Workflows, `action.yml`, `dist/`, `.gitignore`, README, tests.

**Outcome:** Consumers use `thethomaseffect/github-package-lock-analysis@v1`; main-branch lockfile changes deploy HTML report to GitHub Pages.

---

## 2026-08-31 — Nested fixture, changelog links & fail-on-red

**Summary:** Show lodash as a nested transitive dep under cheerio (not a direct dep). Improve reference links: npm version page, GitHub changelog discovery, version-specific markdown anchors, plus publish-commit link. Fail the action when CVEs are found but always surface a clickable report link. Add manual `workflow_dispatch` audit of unchanged packages in the current lockfile, shown in a separate “Existing vulnerabilities” section (slow; manual only).

**Scope:** `fixtures/`, `src/enrichment/changelog.ts`, `src/audit-existing.ts`, `src/run-mode.ts`, report components, `action.yml`, workflows, tests.

**Outcome:** `4501467`, `dde0251`, `28be5cc`, `bdf773d`, `cd1eea8`, `566caf1`. Fixture demonstrates nested red path; changelog links are best-effort; audit-existing is dispatch-only.

---

## 2026-08-31 — Run-scoped Pages URLs, manifest & reports index

**Summary:** Key each published report by **workflow run ID** (not commit SHA). Retain all reports under `/reports/<run-id>/`. Add a root index listing run ID, commit(s), title, change count, and issue count. Diff baseline uses the last **reported** commit via `reports/manifest.json`, so multiple commits between publishes collapse into one cumulative diff. Each report links back to the index.

**Scope:** `src/report-manifest.ts`, `src/report-meta.ts`, `scripts/prepare-pages-site.ts`, `src/git/manifest.ts`, `action.yml`, workflows.

**Outcome:** `d429013`. Per-run URLs; manifest-driven diff base; static index HTML.

---

## 2026-08-31 — Pages UX, demo publish fixes & consumer docs

**Summary:** Keep GitHub Pages on fixture demo without root lockfile overwriting it. Allow demo publish when fixture CVEs are present (`fail-on-red: false`). Index commit/workflow links open in new tabs with external-link icon; commits column shows **base → head** with arrow. Fix non-clickable job summary links (HTML not markdown). Reduce noisy CVE annotations on expected demo runs. Document three consumer tiers (artifact only, GitHub Pages, custom host). Rename ambiguous “Publish commit” link label to “Git commit for {version}”. Upgrade official Actions to Node 24 runtime majors.

**Scope:** `.github/workflows/`, `src/github/format.ts`, `src/report-manifest.ts`, `src/enrichment/changelog.ts`, `README.md`, `action.yml`.

**Outcome:** `35bbfb6` through `bf05ae7`, `513e1e3`, `5adc01b`, `50245f3`, `18f6639`, `35919ec`, `d50b5d4`.

---

## 2026-08-31 — Index history, commit links & large-diff limits

**Summary:** Index must list **every workflow run**, including repeats for the same commit. Fix broken `HEAD~1` commit links on the index (resolve/store SHAs; don’t link symbolic refs). When changed packages exceed **`enrichment-limit`** (default 500), skip CVE/changelog HTTP calls and mark rows ❓ manual review with npm links only; bound concurrency below the limit; truncate PR/summary lists. Discussed performance at ~20k changes.

**Scope:** `src/analyze.ts`, `src/concurrency.ts`, `src/manual-review.ts`, report UI, `action.yml`, `README.md`, tests.

**Outcome:** `ee76dd7`, `c261668`, `35fcfca`, `9fcf418`. Manual-review mode for massive diffs; README documents limits and non-blocking CI patterns.

---

## 2026-08-31 — Retain Pages history & split demo action

**Summary:** Index showed only one run because Actions Pages deploys don’t maintain a `gh-pages` git branch — each run started from an empty site. Fix by syncing the **live deployed site** (manifest + report folders) before merging the new run. Split sample-project fixture publishing into **`demo/action.yml`** so consumer workflows stay on the root action only. Remove Hacker News enrichment (relaxed queries would show stale unrelated discussions).

**Scope:** `scripts/sync-pages-site-from-live.ts`, `demo/action.yml`, `.github/workflows/publish-pages.yml`, `lockfile-analysis.yml`, removed `src/enrichment/hackernews.ts`, docs.

**Outcome:** `1f47be5`, `deb2cb8`, `0f4f3b0`. History accumulates on each deploy; demo vs consumer action separated; HN removed.

---

## 2026-08-31 — Hackathon submission package

**Summary:** Prepare for [Frontier Engineering Challenge 2026](https://www.hackerearth.com/community/challenges/hackathon/micro1-frontier-engineering-challenge-2026/) submission: document baseline vs advanced solution, reproduction guide for judges, agent trajectory disclosure, and a runnable baseline path (`npm run test:baseline`) that diffs fixtures without OSV calls.

**Scope:** `SUBMISSION.md`, `docs/AGENT_TRAJECTORIES.md`, `scripts/run-baseline.ts`, `README.md` hackathon section, `package.json` `test:baseline`.

**Outcome:** Judges can run baseline (yellow-only, offline) vs advanced (`test:fixtures`, red lodash) on the same fixture.

---

<!-- Template for future entries:

## YYYY-MM-DD — Short title

**Summary:** ...

**Scope:** ...

**Outcome:** ...

-->
