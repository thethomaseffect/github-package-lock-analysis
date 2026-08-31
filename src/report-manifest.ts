export interface ReportManifestEntry {
  runId: string;
  commit: string;
  baseCommit?: string;
  commitTitle: string;
  changedCount: number;
  issueCount: number;
  generatedAt: string;
  url: string;
  workflowRunUrl?: string;
}

export interface ReportManifest {
  latestReportCommit: string;
  reports: ReportManifestEntry[];
}

export function createEmptyManifest(): ReportManifest {
  return {
    latestReportCommit: "",
    reports: [],
  };
}

export function parseReportManifest(raw: string): ReportManifest {
  const parsed = JSON.parse(raw) as Partial<ReportManifest>;
  return {
    latestReportCommit: parsed.latestReportCommit ?? "",
    reports: (parsed.reports ?? []).map((entry) => ({
      runId: entry.runId ?? entry.commit,
      commit: entry.commit ?? "",
      baseCommit: entry.baseCommit,
      commitTitle: entry.commitTitle ?? "",
      changedCount: entry.changedCount ?? 0,
      issueCount: entry.issueCount ?? 0,
      generatedAt: entry.generatedAt ?? "",
      url: entry.url ?? "",
      workflowRunUrl: entry.workflowRunUrl,
    })),
  };
}

export function upsertReportEntry(
  manifest: ReportManifest,
  entry: ReportManifestEntry,
): ReportManifest {
  const reports = manifest.reports.filter((item) => item.runId !== entry.runId);
  reports.unshift(entry);

  return {
    latestReportCommit: entry.commit || manifest.latestReportCommit,
    reports,
  };
}

export function mergeReportEntries(
  ...entryGroups: ReportManifestEntry[][]
): ReportManifestEntry[] {
  const merged = new Map<string, ReportManifestEntry>();

  for (const entries of entryGroups) {
    for (const entry of entries) {
      if (!entry.runId) {
        continue;
      }

      merged.set(entry.runId, entry);
    }
  }

  return [...merged.values()].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt),
  );
}

export function buildManifestFromEntries(
  reports: ReportManifestEntry[],
): ReportManifest {
  return {
    latestReportCommit: reports[0]?.commit ?? "",
    reports,
  };
}

export function buildReportPageUrl(pagesBaseUrl: string, runId: string): string {
  const base = pagesBaseUrl.replace(/\/$/, "");
  return `${base}/reports/${runId}/`;
}

export function isGitCommitSha(value: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(value);
}

export function resolveManifestBaseRef(
  manifest: ReportManifest | null,
  headRef: string,
  isAncestor: (ancestor: string, descendant: string) => boolean,
): string | null {
  if (!manifest?.latestReportCommit) {
    return null;
  }

  if (manifest.latestReportCommit === headRef) {
    return headRef;
  }

  if (!isAncestor(manifest.latestReportCommit, headRef)) {
    return null;
  }

  return manifest.latestReportCommit;
}

export function buildContentsIndexHtml(
  manifest: ReportManifest,
  repositoryUrl?: string,
): string {
  const rows = manifest.reports
    .map((entry) => {
      const commitLink = buildCommitRangeLinks(
        repositoryUrl,
        entry.baseCommit,
        entry.commit,
      );
      const runLink = entry.workflowRunUrl
        ? buildExternalLink(entry.workflowRunUrl, entry.runId)
        : escapeHtml(entry.runId);
      const issueClass = entry.issueCount > 0 ? "issue-warn" : "";

      return `<tr>
        <td><a href="./reports/${escapeHtml(entry.runId)}/">View report</a></td>
        <td>${commitLink}</td>
        <td>${runLink}</td>
        <td>${escapeHtml(entry.commitTitle || "(no title)")}</td>
        <td>${entry.changedCount}</td>
        <td class="${issueClass}">${entry.issueCount}</td>
        <td class="muted">${escapeHtml(entry.generatedAt)}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lockfile reports</title>
    <style>
      body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; margin: 2rem; }
      a { color: #93c5fd; }
      .muted { color: #94a3b8; }
      .issue-warn { color: #fca5a5; font-weight: 600; }
      .external-link {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .external-icon {
        width: 0.85em;
        height: 0.85em;
        opacity: 0.8;
        flex-shrink: 0;
      }
      .commit-range {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .commit-arrow {
        color: #94a3b8;
      }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #334155; }
      th { color: #cbd5e1; font-size: 0.9rem; }
      tbody tr:hover { background: #1e293b; }
    </style>
  </head>
  <body>
    <h1>Lockfile reports</h1>
    <p class="muted">Every workflow run is listed below, including multiple runs for the same commit. Diff baselines use the most recent reported commit.</p>
    <table>
      <thead>
        <tr>
          <th>Report</th>
          <th>Commits</th>
          <th>Workflow run</th>
          <th>Commit title</th>
          <th>Changes</th>
          <th>Issues</th>
          <th>Generated</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="7" class="muted">No reports published yet.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`;
}

function buildCommitRangeLinks(
  repositoryUrl: string | undefined,
  baseCommit: string | undefined,
  commit: string,
): string {
  const headSha = isGitCommitSha(commit) ? commit : undefined;
  const headShort = (headSha ?? commit).slice(0, 12);
  const headLink =
    repositoryUrl && headSha
      ? buildExternalLink(`${repositoryUrl}/commit/${headSha}`, headShort)
      : escapeHtml(headShort);

  const baseSha =
    baseCommit && isGitCommitSha(baseCommit) && baseCommit !== headSha
      ? baseCommit
      : undefined;

  if (!baseSha || !repositoryUrl) {
    return headLink;
  }

  const baseShort = baseSha.slice(0, 12);
  const baseLink = buildExternalLink(`${repositoryUrl}/commit/${baseSha}`, baseShort);

  return `<span class="commit-range">${baseLink}<span class="commit-arrow" aria-hidden="true">→</span>${headLink}</span>`;
}

function buildExternalLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="external-link" title="Opens on GitHub in a new tab">${escapeHtml(label)}${externalLinkIcon()}</a>`;
}

function externalLinkIcon(): string {
  return `<svg class="external-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
