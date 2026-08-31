import { formatBreadcrumb } from "../lockfile/parse.js";
import type { AnalysisResult, PackageChange } from "../lockfile/types.js";

export function formatChangeLine(change: PackageChange): string {
  const icon = change.securityLevel === "red" ? "🔴" : "🟡";
  const versions =
    change.oldVersion === null
      ? `(added) → ${change.newVersion}`
      : `${change.oldVersion} → ${change.newVersion}`;

  return `${icon} \`${formatBreadcrumb(change.breadcrumb)}\` — ${versions}`;
}

export function buildWorkflowArtifactLink(
  artifactName: string,
  workflowRunUrl?: string,
  reportUrl?: string,
): string {
  if (reportUrl) {
    return `[View HTML report](${reportUrl}) · Download \`${artifactName}\` artifact from the [workflow run](${workflowRunUrl ?? reportUrl}).`;
  }

  if (workflowRunUrl) {
    return `Download the **${artifactName}** artifact from this [workflow run](${workflowRunUrl}).`;
  }

  return `Download the **${artifactName}** artifact from this workflow run.`;
}

export function buildPullRequestComment(
  result: AnalysisResult,
  artifactName: string,
  reportUrl?: string,
): string {
  const lines = [
    "## Package lock analysis",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Changed packages | ${result.changedCount} |`,
    `| Known CVE in changes | ${result.redCount} |`,
    `| Review (yellow) | ${result.yellowCount} |`,
  ];

  if (result.auditedExisting) {
    lines.push(`| Existing CVE | ${result.existingRedCount} |`);
  }

  lines.push("", "");

  if (result.changedCount > 0) {
    lines.push("### Updated packages", "");
    for (const change of result.changes) {
      lines.push(formatChangeLine(change));
      if (change.cves.length > 0) {
        lines.push(
          `  - CVEs: ${change.cves.map((cve) => `[${cve.id}](${cve.url})`).join(", ")}`,
        );
      }
      const referenceLinks = change.references.links
        .map((link) => `[${link.label}](${link.url})`)
        .join(" | ");
      if (referenceLinks) {
        lines.push(`  - ${referenceLinks}`);
      }
      lines.push("");
    }
  } else {
    lines.push("No nested dependency version changes detected in `package-lock.json`.", "");
  }

  if (result.auditedExisting) {
    lines.push("### Existing vulnerabilities", "");
    lines.push(
      result.existingRedCount > 0
        ? `${result.existingRedCount} installed package(s) in the current lockfile match known CVEs.`
        : "No known CVEs found in the current lockfile.",
    );
    lines.push("");
  }

  lines.push(buildWorkflowArtifactLink(artifactName, reportUrl, reportUrl));

  return lines.join("\n");
}

export function buildSummaryRows(result: AnalysisResult): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Changed packages", String(result.changedCount)],
    ["Known CVE in changes", String(result.redCount)],
    ["Review (yellow)", String(result.yellowCount)],
  ];

  if (result.auditedExisting) {
    rows.push(["Existing CVE", String(result.existingRedCount)]);
  }

  return rows;
}

export function buildSummaryChangeList(result: AnalysisResult): string[] {
  if (result.changedCount === 0) {
    return [];
  }

  return result.changes.map((change) => {
    const label = change.securityLevel === "red" ? "CVE" : "Review";
    const versions =
      change.oldVersion === null
        ? `(added) → ${change.newVersion}`
        : `${change.oldVersion} → ${change.newVersion}`;

    return `[${label}] ${formatBreadcrumb(change.breadcrumb)} — ${versions}`;
  });
}
