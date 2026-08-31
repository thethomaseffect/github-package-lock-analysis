import { formatBreadcrumb } from "../lockfile/parse.js";
export const DEFAULT_SUMMARY_LIST_LIMIT = 100;
export function formatChangeLine(change) {
    const icon = change.manualReview
        ? "❓"
        : change.securityLevel === "red"
            ? "🔴"
            : "🟡";
    const versions = change.oldVersion === null
        ? `(added) → ${change.newVersion}`
        : `${change.oldVersion} → ${change.newVersion}`;
    return `${icon} \`${formatBreadcrumb(change.breadcrumb)}\` — ${versions}`;
}
export function buildWorkflowArtifactLink(artifactName, workflowRunUrl, reportUrl) {
    if (reportUrl) {
        return `[View HTML report](${reportUrl}) · Download \`${artifactName}\` artifact from the [workflow run](${workflowRunUrl ?? reportUrl}).`;
    }
    if (workflowRunUrl) {
        return `Download the **${artifactName}** artifact from this [workflow run](${workflowRunUrl}).`;
    }
    return `Download the **${artifactName}** artifact from this workflow run.`;
}
export function buildWorkflowArtifactSummaryHtml(artifactName, workflowRunUrl, reportUrl) {
    const artifact = escapeHtml(artifactName);
    if (reportUrl && workflowRunUrl) {
        return `<p><a href="${escapeHtmlAttr(reportUrl)}">View HTML report</a> · Download <code>${artifact}</code> artifact from the <a href="${escapeHtmlAttr(workflowRunUrl)}">workflow run</a>.</p>`;
    }
    if (reportUrl) {
        return `<p><a href="${escapeHtmlAttr(reportUrl)}">View HTML report</a> · Download <code>${artifact}</code> artifact from this workflow run.</p>`;
    }
    if (workflowRunUrl) {
        return `<p>Download the <code>${artifact}</code> artifact from this <a href="${escapeHtmlAttr(workflowRunUrl)}">workflow run</a>.</p>`;
    }
    return `<p>Download the <code>${artifact}</code> artifact from this workflow run.</p>`;
}
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
function escapeHtmlAttr(value) {
    return escapeHtml(value).replaceAll("'", "&#39;");
}
export function buildPullRequestComment(result, artifactName, reportUrl, summaryListLimit = DEFAULT_SUMMARY_LIST_LIMIT) {
    const lines = [
        "## Package lock analysis",
        "",
        `| Metric | Count |`,
        `| --- | ---: |`,
        `| Changed packages | ${result.changedCount} |`,
        `| Known CVE in changes | ${result.redCount} |`,
        `| Review (yellow) | ${result.yellowCount} |`,
    ];
    if (result.manualReviewCount > 0) {
        lines.push(`| Manual review (❓) | ${result.manualReviewCount} |`);
    }
    if (result.auditedExisting) {
        lines.push(`| Existing CVE | ${result.existingRedCount} |`);
    }
    lines.push("", "");
    if (result.enrichmentLimited) {
        lines.push(`> More than ${result.enrichmentLimit} packages changed — CVE and changelog lookups were skipped. Rows marked ❓ need manual review via npm links in the full report.`, "");
    }
    if (result.changedCount > 0) {
        lines.push("### Updated packages", "");
        const listedChanges = result.changes.slice(0, summaryListLimit);
        for (const change of listedChanges) {
            lines.push(formatChangeLine(change));
            if (change.manualReview) {
                const npmLink = change.references.links[0];
                if (npmLink) {
                    lines.push(`  - [${npmLink.label}](${npmLink.url})`);
                }
                lines.push("");
                continue;
            }
            if (change.cves.length > 0) {
                lines.push(`  - CVEs: ${change.cves.map((cve) => `[${cve.id}](${cve.url})`).join(", ")}`);
            }
            const referenceLinks = change.references.links
                .map((link) => `[${link.label}](${link.url})`)
                .join(" | ");
            if (referenceLinks) {
                lines.push(`  - ${referenceLinks}`);
            }
            lines.push("");
        }
        if (result.changedCount > summaryListLimit) {
            lines.push(`_Showing ${summaryListLimit} of ${result.changedCount} changes. Open the HTML report for the full list._`, "");
        }
    }
    else {
        lines.push("No nested dependency version changes detected in `package-lock.json`.", "");
    }
    if (result.auditedExisting) {
        lines.push("### Existing vulnerabilities", "");
        lines.push(result.existingRedCount > 0
            ? `${result.existingRedCount} installed package(s) in the current lockfile match known CVEs.`
            : "No known CVEs found in the current lockfile.");
        lines.push("");
    }
    lines.push(buildWorkflowArtifactLink(artifactName, reportUrl, reportUrl));
    return lines.join("\n");
}
export function buildSummaryRows(result) {
    const rows = [
        ["Changed packages", String(result.changedCount)],
        ["Known CVE in changes", String(result.redCount)],
        ["Review (yellow)", String(result.yellowCount)],
    ];
    if (result.manualReviewCount > 0) {
        rows.push(["Manual review", String(result.manualReviewCount)]);
    }
    if (result.auditedExisting) {
        rows.push(["Existing CVE", String(result.existingRedCount)]);
    }
    return rows;
}
export function buildSummaryChangeList(result, summaryListLimit = DEFAULT_SUMMARY_LIST_LIMIT) {
    if (result.changedCount === 0) {
        return [];
    }
    const listed = result.changes.slice(0, summaryListLimit);
    const lines = listed.map((change) => {
        const label = change.manualReview
            ? "Manual"
            : change.securityLevel === "red"
                ? "CVE"
                : "Review";
        const versions = change.oldVersion === null
            ? `(added) → ${change.newVersion}`
            : `${change.oldVersion} → ${change.newVersion}`;
        return `[${label}] ${formatBreadcrumb(change.breadcrumb)} — ${versions}`;
    });
    if (result.changedCount > summaryListLimit) {
        lines.push(`… and ${result.changedCount - summaryListLimit} more (see HTML report)`);
    }
    return lines;
}
//# sourceMappingURL=format.js.map