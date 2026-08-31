import * as core from "@actions/core";
import { join } from "node:path";
import { analyzeLockfileChanges } from "./analyze.js";
import { resolveLockfiles, shouldSkipUnchangedLockfile, } from "./git/resolve-lockfiles.js";
import { postPullRequestComment } from "./github/comment.js";
import { buildSummaryChangeList, buildSummaryRows, buildWorkflowArtifactLink, } from "./github/format.js";
import { readLockfileFromPath } from "./lockfile/diff.js";
import { hasExplicitLockfilePaths, resolveAuditExisting, } from "./run-mode.js";
import { writeReport } from "./report/write.js";
function buildWorkflowRunUrl() {
    const server = process.env.GITHUB_SERVER_URL;
    const repo = process.env.GITHUB_REPOSITORY;
    const runId = process.env.GITHUB_RUN_ID;
    if (!server || !repo || !runId) {
        return undefined;
    }
    return `${server}/${repo}/actions/runs/${runId}`;
}
async function publishResult(result, options, reportPath) {
    const workflowRunUrl = buildWorkflowRunUrl();
    const totalRedCount = result.redCount + result.existingRedCount;
    core.setOutput("report-path", reportPath);
    core.setOutput("changed-count", String(result.changedCount));
    core.setOutput("red-count", String(result.redCount));
    core.setOutput("yellow-count", String(result.yellowCount));
    core.setOutput("existing-red-count", String(result.existingRedCount));
    const summary = core.summary.addHeading("Package lock analysis");
    summary.addTable([
        [{ data: "Metric", header: true }, { data: "Count", header: true }],
        ...buildSummaryRows(result),
    ]);
    const changeLines = buildSummaryChangeList(result);
    if (changeLines.length > 0) {
        summary.addHeading("Updated packages", 3).addList(changeLines);
    }
    if (result.auditedExisting) {
        summary
            .addHeading("Existing vulnerabilities", 3)
            .addRaw(result.existingRedCount > 0
            ? `${result.existingRedCount} installed package(s) in the current lockfile match known CVEs. See the report artifact.`
            : "No known CVEs found in the current lockfile.");
    }
    summary.addHeading("Report", 3).addRaw(buildWorkflowArtifactLink(options.artifactName, workflowRunUrl, options.reportUrl));
    await summary.write();
    if (options.postPrComment) {
        await postPullRequestComment(result, options.artifactName, options.reportUrl ?? workflowRunUrl);
    }
    if (totalRedCount > 0) {
        core.error(`Found ${totalRedCount} package(s) with known CVEs (${result.redCount} in changes, ${result.existingRedCount} existing). Download the **${options.artifactName}** artifact from this workflow run for details.`);
    }
    else if (result.changedCount > 0) {
        core.notice(`${result.changedCount} nested package version change(s) detected. Review the report.`);
    }
    else if (result.auditedExisting) {
        core.info("Existing vulnerability audit completed with no known CVEs found.");
    }
    else {
        core.info("No package-lock.json version changes detected.");
    }
    if (options.failOnRed && totalRedCount > 0) {
        core.setFailed(`Found ${totalRedCount} package(s) with known CVEs. Download the ${options.artifactName} artifact from this workflow run to review the full report.`);
    }
}
async function runManualAuditOnly(options) {
    const lockfilePath = options.newLockfilePath ?? join(options.workspace, options.lockfilePath);
    core.info(`Manual audit: scanning installed packages in ${lockfilePath}.`);
    const lockfile = readLockfileFromPath(lockfilePath);
    const result = await analyzeLockfileChanges(lockfile, lockfile, {
        projectName: options.projectName,
        includeHackerNews: options.includeHackerNews,
        auditExisting: true,
        excludeLockPaths: new Set(),
    });
    const reportPath = writeReport(result, options.outputDir);
    await publishResult(result, options, reportPath);
    return reportPath;
}
async function runDiffAnalysis(options) {
    const tempDir = join(options.outputDir, ".tmp-lockfiles");
    const resolved = resolveLockfiles({
        lockfilePath: options.lockfilePath,
        oldLockfilePath: options.oldLockfilePath,
        newLockfilePath: options.newLockfilePath,
        baseRef: options.baseRef,
        headRef: options.headRef,
        workspace: options.workspace,
        tempDir,
    });
    try {
        if (shouldSkipUnchangedLockfile(options.skipIfUnchanged, resolved, options.lockfilePath, options.workspace)) {
            core.info(`No changes detected in ${options.lockfilePath}; skipping analysis.`);
            core.setOutput("changed-count", "0");
            core.setOutput("red-count", "0");
            core.setOutput("yellow-count", "0");
            core.setOutput("existing-red-count", "0");
            return null;
        }
        const oldLockfile = readLockfileFromPath(resolved.oldPath);
        const newLockfile = readLockfileFromPath(resolved.newPath);
        const result = await analyzeLockfileChanges(oldLockfile, newLockfile, {
            projectName: options.projectName,
            includeHackerNews: options.includeHackerNews,
            auditExisting: false,
        });
        const reportPath = writeReport(result, options.outputDir);
        await publishResult(result, options, reportPath);
        return reportPath;
    }
    finally {
        resolved.cleanup();
    }
}
export async function runAction(options) {
    const explicitPaths = hasExplicitLockfilePaths(options.oldLockfilePath, options.newLockfilePath);
    const auditMode = resolveAuditExisting(options.auditExisting, options.eventName ?? process.env.GITHUB_EVENT_NAME, explicitPaths);
    if (auditMode.ignoredReason) {
        core.info(`${auditMode.ignoredReason}; running diff analysis only.`);
    }
    if (auditMode.manualAuditOnly) {
        return runManualAuditOnly(options);
    }
    return runDiffAnalysis(options);
}
async function main() {
    try {
        const lockfilePath = core.getInput("lockfile-path") || "package-lock.json";
        const oldLockfilePath = core.getInput("old-lockfile-path") || undefined;
        const newLockfilePath = core.getInput("new-lockfile-path") || undefined;
        const baseRef = core.getInput("base-ref") || undefined;
        const headRef = core.getInput("head-ref") || undefined;
        const outputDir = core.getInput("output-dir") || "report-output";
        const includeHackerNews = core.getBooleanInput("include-hackernews");
        const projectName = core.getInput("project-name") || undefined;
        const skipIfUnchanged = core.getBooleanInput("skip-if-unchanged");
        const auditExisting = core.getBooleanInput("audit-existing");
        const failOnRed = core.getBooleanInput("fail-on-red");
        const postPrComment = core.getBooleanInput("post-pr-comment");
        const artifactName = core.getInput("artifact-name") || "lockfile-report";
        const reportUrl = core.getInput("report-url") || undefined;
        const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
        await runAction({
            lockfilePath,
            oldLockfilePath,
            newLockfilePath,
            baseRef,
            headRef,
            outputDir,
            includeHackerNews,
            projectName,
            skipIfUnchanged,
            auditExisting,
            failOnRed,
            postPrComment,
            artifactName,
            reportUrl,
            workspace,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed("Unknown error while running package lock analysis");
        }
    }
}
if (process.env.GITHUB_ACTIONS === "true") {
    void main();
}
//# sourceMappingURL=index.js.map