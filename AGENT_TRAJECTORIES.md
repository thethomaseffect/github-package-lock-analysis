# Agent trajectories

The [Frontier Engineering Challenge 2026](https://www.hackerearth.com/community/challenges/hackathon/micro1-frontier-engineering-challenge-2026/) requires disclosing coding-agent use and submitting agent trajectories.

## Tools used

| Tool | Purpose |
| --- | --- |
| **Cursor** (IDE + Agent mode) | Implementation, refactors, workflows, tests, docs |
| **Claude** (via Cursor) | Architecture, code generation, debugging |

Repository context for agents: [CLAUDE.md](./CLAUDE.md).

## Trajectory sources (for judges)

1. **[PROMPTS.md](./PROMPTS.md)** — Primary trajectory log. Summarized prompts and outcomes between commits (Aug 31, 2026).
2. **Git history** — `git log --oneline main` shows incremental delivery and commit messages.
3. **Cursor session export** — Full agent chat available from the developer’s Cursor session (request if needed for verbatim traces).

## How PROMPTS.md relates to full chat

`PROMPTS.md` is intentionally concise: intent, scope, and outcome per milestone — not a raw transcript. It maps hackathon decisions (Pages manifest, enrichment limits, HN removal, etc.) to shipped commits.

## Reproducing agent-assisted work

Judges can verify outputs without the agent:

```bash
npm ci
npm test                 # unit tests, offline
npm run test:baseline    # baseline fixture run, offline
npm run test:fixtures    # integration fixture run, network required
```

See [SUBMISSION.md](./SUBMISSION.md) for the full reproduction guide and baseline vs advanced comparison.
