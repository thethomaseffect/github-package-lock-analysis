import * as core from "@actions/core";
import { join } from "node:path";
import { analyzeLockfileChanges } from "./analyze.js";
import { resolveLockfiles, shouldSkipUnchangedLockfile, } from "./git/resolve-lockfiles.js";
import { postPullRequestComment } from "./github/comment.js";
import { buildSummaryChangeList, buildSummaryRows, } from "./github/format.js";
import { readLockfileFromPath } from "./lockfile/diff.js";
import { writeReport } from "./report/write.js";
export async function runAction(options) {
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
            return null;
        }
        const oldLockfile = readLockfileFromPath(resolved.oldPath);
        const newLockfile = readLockfileFromPath(resolved.newPath);
        const result = await analyzeLockfileChanges(oldLockfile, newLockfile, {
            projectName: options.projectName,
            includeHackerNews: options.includeHackerNews,
        });
        const reportPath = writeReport(result, options.outputDir);
        core.setOutput("report-path", reportPath);
        core.setOutput("changed-count", String(result.changedCount));
        core.setOutput("red-count", String(result.redCount));
        core.setOutput("yellow-count", String(result.yellowCount));
        const summary = core.summary.addHeading("Package lock analysis");
        summary.addTable([
            [{ data: "Metric", header: true }, { data: "Count", header: true }],
            ...buildSummaryRows(result),
        ]);
        const changeLines = buildSummaryChangeList(result);
        if (changeLines.length > 0) {
            summary.addHeading("Updated packages", 3).addList(changeLines);
        }
        await summary.write();
        if (options.postPrComment) {
            await postPullRequestComment(result, options.artifactName, options.reportUrl);
        }
        if (result.redCount > 0) {
            core.warning(`${result.redCount} updated package(s) match known CVEs. Review the report before merging.`);
        }
        else if (result.changedCount > 0) {
            core.notice(`${result.changedCount} nested package version change(s) detected. Review the report.`);
        }
        else {
            core.info("No package-lock.json version changes detected.");
        }
        return reportPath;
    }
    finally {
        resolved.cleanup();
    }
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