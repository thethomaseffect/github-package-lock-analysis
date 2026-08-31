import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContentsIndexHtml,
  buildReportPageUrl,
  createEmptyManifest,
  parseReportManifest,
  upsertReportEntry,
  type ReportManifest,
} from "../src/report-manifest.js";
import { parseReportMeta } from "../src/report-meta.js";

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

  const manifest = upsertReportEntry(loadManifest(options.siteDir), {
    runId: meta.runId,
    commit: meta.commit,
    commitTitle: meta.commitTitle,
    changedCount: meta.changedCount,
    issueCount: meta.issueCount,
    generatedAt: meta.generatedAt,
    url: reportUrl,
    workflowRunUrl: meta.workflowRunUrl,
  });

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
