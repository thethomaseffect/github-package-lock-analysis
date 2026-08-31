import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContentsIndexHtml,
  buildManifestFromEntries,
  buildReportPageUrl,
  createEmptyManifest,
  mergeReportEntries,
  parseReportManifest,
  upsertReportEntry,
  type ReportManifest,
  type ReportManifestEntry,
} from "../src/report-manifest.js";
import { parseReportMeta, type ReportMeta } from "../src/report-meta.js";

export interface PreparePagesSiteOptions {
  siteDir: string;
  reportFile: string;
  metaFile: string;
  pagesBaseUrl: string;
  repositoryUrl?: string;
}

function loadManifest(siteDir: string): ReportManifest {
  const manifestPath = join(siteDir, "reports/manifest.json");
  if (!existsSync(manifestPath)) {
    return createEmptyManifest();
  }

  return parseReportManifest(readFileSync(manifestPath, "utf8"));
}

function metaToManifestEntry(meta: ReportMeta, pagesBaseUrl: string): ReportManifestEntry {
  return {
    runId: meta.runId,
    commit: meta.commit,
    baseCommit: meta.baseCommit,
    commitTitle: meta.commitTitle,
    changedCount: meta.changedCount,
    issueCount: meta.issueCount,
    generatedAt: meta.generatedAt,
    url: buildReportPageUrl(pagesBaseUrl, meta.runId),
    workflowRunUrl: meta.workflowRunUrl,
  };
}

function loadReportMetaFromSite(
  siteDir: string,
  runId: string,
  pagesBaseUrl: string,
): ReportManifestEntry | null {
  const metaPath = join(siteDir, "reports", runId, "report-meta.json");
  if (existsSync(metaPath)) {
    return metaToManifestEntry(
      parseReportMeta(readFileSync(metaPath, "utf8")),
      pagesBaseUrl,
    );
  }

  const reportPath = join(siteDir, "reports", runId, "index.html");
  if (!existsSync(reportPath)) {
    return null;
  }

  return {
    runId,
    commit: "",
    commitTitle: "Report (metadata unavailable)",
    changedCount: 0,
    issueCount: 0,
    generatedAt: statSync(reportPath).mtime.toISOString(),
    url: buildReportPageUrl(pagesBaseUrl, runId),
  };
}

function reconcileManifestWithSite(
  manifest: ReportManifest,
  siteDir: string,
  pagesBaseUrl: string,
): ReportManifest {
  const reportsDir = join(siteDir, "reports");
  if (!existsSync(reportsDir)) {
    return manifest;
  }

  const discovered = readdirSync(reportsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadReportMetaFromSite(siteDir, entry.name, pagesBaseUrl))
    .filter((entry): entry is ReportManifestEntry => entry !== null);

  return buildManifestFromEntries(
    mergeReportEntries(manifest.reports, discovered),
  );
}

function writeManifest(siteDir: string, manifest: ReportManifest): void {
  const manifestPath = join(siteDir, "reports/manifest.json");
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function writeRootIndex(
  siteDir: string,
  manifest: ReportManifest,
  repositoryUrl?: string,
): void {
  writeFileSync(
    join(siteDir, "index.html"),
    buildContentsIndexHtml(manifest, repositoryUrl),
    "utf8",
  );
}

export function preparePagesSite(options: PreparePagesSiteOptions): {
  reportUrl: string;
  manifest: ReportManifest;
} {
  const meta = parseReportMeta(readFileSync(options.metaFile, "utf8"));
  const reportUrl = buildReportPageUrl(options.pagesBaseUrl, meta.runId);
  const reportDir = join(options.siteDir, "reports", meta.runId);
  mkdirSync(reportDir, { recursive: true });
  copyFileSync(options.reportFile, join(reportDir, "index.html"));
  copyFileSync(options.metaFile, join(reportDir, "report-meta.json"));

  const reconciled = reconcileManifestWithSite(
    loadManifest(options.siteDir),
    options.siteDir,
    options.pagesBaseUrl,
  );
  const manifest = upsertReportEntry(
    reconciled,
    metaToManifestEntry(meta, options.pagesBaseUrl),
  );

  writeManifest(options.siteDir, manifest);
  writeRootIndex(options.siteDir, manifest, options.repositoryUrl);

  return { reportUrl, manifest };
}

function parseArgs(argv: string[]): PreparePagesSiteOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key?.startsWith("--") && value) {
      values.set(key.slice(2), value);
    }
  }

  const siteDir = values.get("site-dir");
  const reportFile = values.get("report-file");
  const metaFile = values.get("meta-file");
  const pagesBaseUrl = values.get("pages-base-url");

  if (!siteDir || !reportFile || !metaFile || !pagesBaseUrl) {
    throw new Error(
      "Usage: prepare-pages-site --site-dir DIR --report-file FILE --meta-file META --pages-base-url URL [--repository-url URL]",
    );
  }

  return {
    siteDir,
    reportFile,
    metaFile,
    pagesBaseUrl,
    repositoryUrl: values.get("repository-url"),
  };
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const result = preparePagesSite(parseArgs(process.argv.slice(2)));
  console.log(result.reportUrl);
}
