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

**Summary:** Bootstrap a fresh GitHub Action project that diffs `package-lock.json` on CI, enriches every nested version change with CVE data (NVD) and optional Hacker News lookup, and publishes a static React/TypeScript report. Only updated packages appear, shown as directory-style paths (`root > parent > child`), with changelog links. Packages with likely security issues render red; all other updates render yellow. Motivation: recent nested supply-chain attacks that tools miss because they only scan app code or direct `package.json` deps. Include an in-repo fixture project for safe testing using historically vulnerable package versions (no real install against untrusted graphs). Requested docs: `CLAUDE.md` (logic for AI contributors), updated `README`, and this `PROMPTS.md` to track prompt summaries between commits — including this usage note in the first entry.

**Scope:** Repository scaffolding and documentation only (`CLAUDE.md`, `README.md`, `PROMPTS.md`).

**Outcome:** Documented architecture, data flow, UI rules, testing strategy, and tech stack (TypeScript, React static report, GitHub Actions-only). Application code, fixtures, and action metadata not yet implemented.

---

## 2026-08-31 — Scaffold TypeScript action & report pipeline

**Summary:** Scaffold the full GitHub Action: lockfile parse/diff, OSV CVE enrichment, optional Hacker News, React static HTML report, fixture project with lodash/negotiator scenarios, vitest unit tests, CI workflow, and local `test:fixtures` runner.

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

<!-- Template for future entries:

## YYYY-MM-DD — Short title

**Summary:** ...

**Scope:** ...

**Outcome:** ...

-->
