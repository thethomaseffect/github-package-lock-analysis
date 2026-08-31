import { formatBreadcrumb } from "../lockfile/parse.js";
export function formatChangeLine(change) {
    const icon = change.securityLevel === "red" ? "🔴" : "🟡";
    const versions = change.oldVersion === null
        ? `(added) → ${change.newVersion}`
        : `${change.oldVersion} → ${change.newVersion}`;
    return `${icon} \`${formatBreadcrumb(change.breadcrumb)}\` — ${versions}`;
}
export function buildPullRequestComment(result, artifactName, reportUrl) {
    const lines = [
        "## Package lock analysis",
        "",
        `| Metric | Count |`,
        `| --- | ---: |`,
        `| Changed packages | ${result.changedCount} |`,
        `| Known CVE (red) | ${result.redCount} |`,
        `| Review (yellow) | ${result.yellowCount} |`,
        "",
    ];
    if (result.changedCount === 0) {
        lines.push("No nested dependency version changes detected in `package-lock.json`.");
        return lines.join("\n");
    }
    lines.push("### Updated packages", "");
    for (const change of result.changes) {
        lines.push(formatChangeLine(change));
        if (change.cves.length > 0) {
            lines.push(`  - CVEs: ${change.cves.map((cve) => `[${cve.id}](${cve.url})`).join(", ")}`);
        }
        lines.push(`  - [${change.changelog.label}](${change.changelog.url})`);
        lines.push("");
    }
    if (reportUrl) {
        lines.push(`[View full HTML report](${reportUrl})`);
    }
    else {
        lines.push(`Download the full HTML report from workflow artifacts (\`${artifactName}\`).`);
    }
    return lines.join("\n");
}
export function buildSummaryRows(result) {
    const rows = [
        ["Changed packages", String(result.changedCount)],
        ["Known CVE (red)", String(result.redCount)],
        ["Review (yellow)", String(result.yellowCount)],
    ];
    return rows;
}
export function buildSummaryChangeList(result) {
    if (result.changedCount === 0) {
        return [];
    }
    return result.changes.map((change) => {
        const label = change.securityLevel === "red" ? "CVE" : "Review";
        const versions = change.oldVersion === null
            ? `(added) → ${change.newVersion}`
            : `${change.oldVersion} → ${change.newVersion}`;
        return `[${label}] ${formatBreadcrumb(change.breadcrumb)} — ${versions}`;
    });
}
//# sourceMappingURL=format.js.map