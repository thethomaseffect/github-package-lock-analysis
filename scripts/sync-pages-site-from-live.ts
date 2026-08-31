import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseReportManifest,
  type ReportManifestEntry,
} from "../src/report-manifest.js";

export interface SyncPagesSiteFromLiveOptions {
  siteDir: string;
  pagesBaseUrl: string;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function normalizeBaseUrl(pagesBaseUrl: string): string {
  return pagesBaseUrl.replace(/\/$/, "");
}

function writeFileEnsuringDir(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
}

async function downloadReportFiles(
  siteDir: string,
  pagesBaseUrl: string,
  entry: ReportManifestEntry,
): Promise<boolean> {
  const reportDir = join(siteDir, "reports", entry.runId);
  const metaPath = join(reportDir, "report-meta.json");
  const indexPath = join(reportDir, "index.html");

  if (existsSync(metaPath) && existsSync(indexPath)) {
    return true;
  }

  const base = normalizeBaseUrl(pagesBaseUrl);
  const reportBase = `${base}/reports/${encodeURIComponent(entry.runId)}`;
  const [metaBody, indexBody] = await Promise.all([
    existsSync(metaPath) ? readFileSync(metaPath, "utf8") : fetchText(`${reportBase}/report-meta.json`),
    existsSync(indexPath) ? readFileSync(indexPath, "utf8") : fetchText(`${reportBase}/index.html`),
  ]);

  if (!metaBody || !indexBody) {
    return false;
  }

  writeFileEnsuringDir(metaPath, metaBody);
  writeFileEnsuringDir(indexPath, indexBody);
  return true;
}

export async function syncPagesSiteFromLive(
  options: SyncPagesSiteFromLiveOptions,
): Promise<{ manifestEntries: number; downloadedReports: number }> {
  mkdirSync(join(options.siteDir, "reports"), { recursive: true });

  const manifestUrl = `${normalizeBaseUrl(options.pagesBaseUrl)}/reports/manifest.json`;
  const manifestBody = await fetchText(manifestUrl);
  if (!manifestBody) {
    return { manifestEntries: 0, downloadedReports: 0 };
  }

  writeFileEnsuringDir(
    join(options.siteDir, "reports/manifest.json"),
    manifestBody,
  );

  const manifest = parseReportManifest(manifestBody);
  let downloadedReports = 0;

  for (const entry of manifest.reports) {
    if (await downloadReportFiles(options.siteDir, options.pagesBaseUrl, entry)) {
      downloadedReports += 1;
    }
  }

  return {
    manifestEntries: manifest.reports.length,
    downloadedReports,
  };
}

export function countLocalReports(siteDir: string): number {
  const reportsDir = join(siteDir, "reports");
  if (!existsSync(reportsDir)) {
    return 0;
  }

  return readdirSync(reportsDir, { withFileTypes: true }).filter((entry) => {
    if (!entry.isDirectory()) {
      return false;
    }

    const reportDir = join(reportsDir, entry.name);
    return (
      existsSync(join(reportDir, "index.html")) &&
      existsSync(join(reportDir, "report-meta.json"))
    );
  }).length;
}

function parseArgs(argv: string[]): SyncPagesSiteFromLiveOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key?.startsWith("--") && value) {
      values.set(key.slice(2), value);
    }
  }

  const siteDir = values.get("site-dir");
  const pagesBaseUrl = values.get("pages-base-url");

  if (!siteDir || !pagesBaseUrl) {
    throw new Error(
      "Usage: sync-pages-site-from-live --site-dir DIR --pages-base-url URL",
    );
  }

  return { siteDir, pagesBaseUrl };
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const options = parseArgs(process.argv.slice(2));
  syncPagesSiteFromLive(options)
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
