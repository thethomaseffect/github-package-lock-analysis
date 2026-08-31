export interface ReportManifestEntry {
  runId: string;
  commit: string;
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
    latestReportCommit: entry.commit,
    reports,
  };
}

export function buildReportPageUrl(pagesBaseUrl: string, runId: string): string {
  const base = pagesBaseUrl.replace(/\/$/, "");
  return `${base}/reports/${runId}/`;
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
      const commitShort = entry.commit.slice(0, 12);
      const commitLink =
        repositoryUrl && entry.commit
          ? `<a href="${escapeHtml(`${repositoryUrl}/commit/${entry.commit}`)}">${escapeHtml(commitShort)}</a>`
          : escapeHtml(commitShort);
      const runLink = entry.workflowRunUrl
        ? `<a href="${escapeHtml(entry.workflowRunUrl)}">${escapeHtml(entry.runId)}</a>`
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
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #334155; }
      th { color: #cbd5e1; font-size: 0.9rem; }
      tbody tr:hover { background: #1e293b; }
    </style>
  </head>
  <body>
    <h1>Lockfile reports</h1>
    <p class="muted">Each workflow run publishes a unique report. Diff baselines use the most recent reported commit.</p>
    <table>
      <thead>
        <tr>
          <th>Report</th>
          <th>Commit</th>
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
