import * as core from "@actions/core";
import { join } from "node:path";

import {
  analyzeLockfileChanges,
  DEFAULT_ENRICHMENT_CONCURRENCY,
  DEFAULT_ENRICHMENT_LIMIT,
} from "./analyze.js";
import { DEFAULT_SUMMARY_LIST_LIMIT } from "./github/format.js";
import {
  resolveLockfiles,
  shouldSkipUnchangedLockfile,
} from "./git/resolve-lockfiles.js";
import { postPullRequestComment } from "./github/comment.js";
import {
  buildSummaryChangeList,
  buildSummaryRows,
  buildWorkflowArtifactSummaryHtml,
} from "./github/format.js";
import { readLockfileFromPath } from "./lockfile/diff.js";
import {
  hasExplicitLockfilePaths,
  resolveAuditExisting,
} from "./run-mode.js";
import { writeReport } from "./report/write.js";
import { buildReportPageUrl, isGitCommitSha } from "./report-manifest.js";
import { resolveGitSha } from "./git/manifest.js";
import { writeReportMeta } from "./report-meta.js";
import type { AnalysisResult } from "./lockfile/types.js";

export interface RunActionOptions {
  lockfilePath: string;
  oldLockfilePath?: string;
  newLockfilePath?: string;
  baseRef?: string;
  headRef?: string;
  outputDir: string;
  projectName?: string;
  skipIfUnchanged: boolean;
  auditExisting: boolean;
  failOnRed: boolean;
  postPrComment: boolean;
  artifactName: string;
  reportUrl?: string;
  workspace: string;
  eventName?: string;
  reportManifestPath?: string;
  useReportManifestBase?: boolean;
  pagesBaseUrl?: string;
  reportCommit?: string;
  reportRunId?: string;
  reportCommitTitle?: string;
  reportBaseCommit?: string;
  enrichmentLimit: number;
  enrichmentConcurrency: number;
  summaryListLimit: number;
}

function resolveReportCommit(options: RunActionOptions): string {
  return (
    options.reportCommit ??
    options.headRef ??
    process.env.GITHUB_SHA ??
    "unknown"
  );
}

function resolveReportRunId(options: RunActionOptions): string {
  return options.reportRunId ?? process.env.GITHUB_RUN_ID ?? "local";
}

function resolveReportUrl(options: RunActionOptions, runId: string): string | undefined {
  if (options.reportUrl) {
    return options.reportUrl;
  }

  if (options.pagesBaseUrl) {
    return buildReportPageUrl(options.pagesBaseUrl, runId);
  }

  return undefined;
}

function buildWorkflowRunUrl(): string | undefined {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;

  if (!server || !repo || !runId) {
    return undefined;
  }

  return `${server}/${repo}/actions/runs/${runId}`;
}

function normalizeStoredCommit(
  ref: string | undefined,
  workspace: string,
): string | undefined {
  if (!ref) {
    return undefined;
  }

  if (isGitCommitSha(ref)) {
    return ref;
  }

  return resolveGitSha(ref, workspace);
}

async function publishResult(
  result: AnalysisResult,
  options: RunActionOptions,
  reportPath: string,
  reportCommit: string,
  reportRunId: string,
  baseCommit?: string,
): Promise<void> {
  const workflowRunUrl = buildWorkflowRunUrl();
  const totalRedCount = result.redCount + result.existingRedCount;
  const reportUrl = resolveReportUrl(options, reportRunId);
  const resolvedBaseCommit = normalizeStoredCommit(
    options.reportBaseCommit ?? baseCommit,
    options.workspace,
  );
  const storedCommit =
    normalizeStoredCommit(reportCommit, options.workspace) ?? reportCommit;

  writeReportMeta(options.outputDir, {
    runId: reportRunId,
    commit: storedCommit,
    baseCommit: resolvedBaseCommit,
    commitTitle: options.reportCommitTitle ?? "",
    changedCount: result.changedCount,
    issueCount: totalRedCount,
    generatedAt: new Date().toISOString(),
    workflowRunUrl,
  });

  core.setOutput("report-path", reportPath);
  core.setOutput("report-commit", reportCommit);
  core.setOutput("report-run-id", reportRunId);
  core.setOutput("report-url", reportUrl ?? "");
  core.setOutput("changed-count", String(result.changedCount));
  core.setOutput("red-count", String(result.redCount));
  core.setOutput("yellow-count", String(result.yellowCount));
  core.setOutput("existing-red-count", String(result.existingRedCount));

  const summary = core.summary.addHeading("Package lock analysis");
  summary.addTable([
    [{ data: "Metric", header: true }, { data: "Count", header: true }],
    ...buildSummaryRows(result),
  ]);

  const changeLines = buildSummaryChangeList(result, options.summaryListLimit);
  if (changeLines.length > 0) {
    summary.addHeading("Updated packages", 3).addList(changeLines);
  }

  if (result.auditedExisting) {
    summary
      .addHeading("Existing vulnerabilities", 3)
      .addRaw(
        result.existingRedCount > 0
          ? `${result.existingRedCount} installed package(s) in the current lockfile match known CVEs. See the report artifact.`
          : "No known CVEs found in the current lockfile.",
      );
  }

  summary.addHeading("Report", 3).addRaw(
    buildWorkflowArtifactSummaryHtml(
      options.artifactName,
      workflowRunUrl,
      reportUrl ?? options.reportUrl,
    ),
  );

  await summary.write();

  if (result.enrichmentLimited) {
    core.warning(
      `${result.changedCount} packages changed (limit ${result.enrichmentLimit}) — CVE and changelog lookups were skipped. Review npm links in the report manually.`,
    );
  }

  if (options.postPrComment) {
    await postPullRequestComment(
      result,
      options.artifactName,
      reportUrl ?? options.reportUrl ?? workflowRunUrl,
      options.summaryListLimit,
    );
  }

  if (totalRedCount > 0) {
    const cveMessage = `Found ${totalRedCount} package(s) with known CVEs (${result.redCount} in changes, ${result.existingRedCount} existing). Download the **${options.artifactName}** artifact from this workflow run for details.`;

    if (options.failOnRed) {
      core.error(cveMessage);
    } else {
      core.warning(cveMessage);
    }
  } else if (result.changedCount > 0) {
    core.notice(
      `${result.changedCount} nested package version change(s) detected. Review the report.`,
    );
  } else if (result.auditedExisting) {
    core.info("Existing vulnerability audit completed with no known CVEs found.");
  } else {
    core.info("No package-lock.json version changes detected.");
  }

  if (options.failOnRed && totalRedCount > 0) {
    core.setFailed(
      `Found ${totalRedCount} package(s) with known CVEs. Download the ${options.artifactName} artifact from this workflow run to review the full report.`,
    );
  }
}

async function runManualAuditOnly(options: RunActionOptions): Promise<string> {
  const lockfilePath =
    options.newLockfilePath ?? join(options.workspace, options.lockfilePath);
  const reportCommit = resolveReportCommit(options);
  const reportRunId = resolveReportRunId(options);

  core.info(`Manual audit: scanning installed packages in ${lockfilePath}.`);

  const lockfile = readLockfileFromPath(lockfilePath);
  const result = await analyzeLockfileChanges(lockfile, lockfile, {
    projectName: options.projectName,
    auditExisting: true,
    excludeLockPaths: new Set(),
  });

  const reportPath = writeReport(result, options.outputDir);
  await publishResult(result, options, reportPath, reportCommit, reportRunId);
  return reportPath;
}

async function runDiffAnalysis(options: RunActionOptions): Promise<string | null> {
  const tempDir = join(options.outputDir, ".tmp-lockfiles");
  const resolved = resolveLockfiles({
    lockfilePath: options.lockfilePath,
    oldLockfilePath: options.oldLockfilePath,
    newLockfilePath: options.newLockfilePath,
    baseRef: options.baseRef,
    headRef: options.headRef,
    workspace: options.workspace,
    tempDir,
    reportManifestPath: options.reportManifestPath,
    useReportManifestBase: options.useReportManifestBase,
  });
  const reportCommit = resolveReportCommit(options);
  const reportRunId = resolveReportRunId(options);

  try {
    if (resolved.baseRef && resolved.headRef && resolved.baseRef !== resolved.headRef) {
      core.info(
        `Comparing ${options.lockfilePath} at ${resolved.headRef} against ${resolved.baseRef}.`,
      );
    } else if (resolved.baseRef && resolved.headRef) {
      core.info(
        `Re-publishing report for ${options.lockfilePath} at ${resolved.headRef}.`,
      );
    }

    if (
      shouldSkipUnchangedLockfile(
        options.skipIfUnchanged,
        resolved,
        options.lockfilePath,
        options.workspace,
      )
    ) {
      core.info(`No changes detected in ${options.lockfilePath}; skipping analysis.`);
      core.setOutput("changed-count", "0");
      core.setOutput("red-count", "0");
      core.setOutput("yellow-count", "0");
      core.setOutput("existing-red-count", "0");
      core.setOutput("report-commit", reportCommit);
      core.setOutput("report-run-id", reportRunId);
      core.setOutput("report-url", resolveReportUrl(options, reportRunId) ?? "");
      return null;
    }

    const oldLockfile = readLockfileFromPath(resolved.oldPath);
    const newLockfile = readLockfileFromPath(resolved.newPath);

    const result = await analyzeLockfileChanges(oldLockfile, newLockfile, {
      projectName: options.projectName,
      auditExisting: false,
      enrichmentLimit: options.enrichmentLimit,
      enrichmentConcurrency: options.enrichmentConcurrency,
    });

    const reportPath = writeReport(result, options.outputDir);
    const baseCommit = resolved.source === "git" ? resolved.baseRef : undefined;
    await publishResult(
      result,
      options,
      reportPath,
      reportCommit,
      reportRunId,
      baseCommit,
    );
    return reportPath;
  } finally {
    resolved.cleanup();
  }
}

export async function runAction(options: RunActionOptions): Promise<string | null> {
  const explicitPaths = hasExplicitLockfilePaths(
    options.oldLockfilePath,
    options.newLockfilePath,
  );
  const auditMode = resolveAuditExisting(
    options.auditExisting,
    options.eventName ?? process.env.GITHUB_EVENT_NAME,
    explicitPaths,
  );

  if (auditMode.ignoredReason) {
    core.info(`${auditMode.ignoredReason}; running diff analysis only.`);
  }

  if (auditMode.manualAuditOnly) {
    return runManualAuditOnly(options);
  }

  return runDiffAnalysis(options);
}

async function main(): Promise<void> {
  try {
    const lockfilePath = core.getInput("lockfile-path") || "package-lock.json";
    const oldLockfilePath = core.getInput("old-lockfile-path") || undefined;
    const newLockfilePath = core.getInput("new-lockfile-path") || undefined;
    const baseRef = core.getInput("base-ref") || undefined;
    const headRef = core.getInput("head-ref") || undefined;
    const outputDir = core.getInput("output-dir") || "report-output";
    const projectName = core.getInput("project-name") || undefined;
    const skipIfUnchanged = core.getBooleanInput("skip-if-unchanged");
    const auditExisting = core.getBooleanInput("audit-existing");
    const failOnRed = core.getBooleanInput("fail-on-red");
    const postPrComment = core.getBooleanInput("post-pr-comment");
    const artifactName = core.getInput("artifact-name") || "lockfile-report";
    const reportUrl = core.getInput("report-url") || undefined;
    const reportManifestPath = core.getInput("report-manifest-path") || undefined;
    const useReportManifestBase = core.getBooleanInput("use-report-manifest-base");
    const pagesBaseUrl = core.getInput("pages-base-url") || undefined;
    const reportCommit = core.getInput("report-commit") || undefined;
    const reportRunId = core.getInput("report-run-id") || undefined;
    const reportCommitTitle = core.getInput("report-commit-title") || undefined;
    const reportBaseCommit = core.getInput("report-base-commit") || undefined;
    const enrichmentLimit = Number.parseInt(
      core.getInput("enrichment-limit") || String(DEFAULT_ENRICHMENT_LIMIT),
      10,
    );
    const enrichmentConcurrency = Number.parseInt(
      core.getInput("enrichment-concurrency") ||
        String(DEFAULT_ENRICHMENT_CONCURRENCY),
      10,
    );
    const summaryListLimit = Number.parseInt(
      core.getInput("summary-list-limit") || String(DEFAULT_SUMMARY_LIST_LIMIT),
      10,
    );
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

    await runAction({
      lockfilePath,
      oldLockfilePath,
      newLockfilePath,
      baseRef,
      headRef,
      outputDir,
      projectName,
      skipIfUnchanged,
      auditExisting,
      failOnRed,
      postPrComment,
      artifactName,
      reportUrl,
      workspace,
      eventName: process.env.GITHUB_EVENT_NAME,
      reportManifestPath,
      useReportManifestBase,
      pagesBaseUrl,
      reportCommit,
      reportRunId,
      reportCommitTitle,
      reportBaseCommit,
      enrichmentLimit,
      enrichmentConcurrency,
      summaryListLimit,
    });
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error while running package lock analysis");
    }
  }
}

if (process.env.GITHUB_ACTIONS === "true") {
  void main();
}
