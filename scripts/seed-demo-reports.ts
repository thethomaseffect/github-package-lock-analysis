import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveGitSha } from "../src/git/manifest.js";
import { preparePagesSite } from "./prepare-pages-site.js";
import type { ReportMeta } from "../src/report-meta.js";

export interface SeedDemoReportsOptions {
  siteDir: string;
  reportFile: string;
  pagesBaseUrl: string;
  repositoryUrl?: string;
  workspace?: string;
}

interface DemoSeed {
  runId: string;
  commit: string;
  baseCommit?: string;
  commitTitle: string;
  generatedAt: string;
}

function readGitLog(workspace: string): Array<{ sha: string; title: string; date: string }> {
  const output = execFileSync(
    "git",
    ["log", "-3", "--format=%H%x1f%s%x1f%cI"],
    { cwd: workspace, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [sha = "", title = "", date = ""] = line.split("\x1f");
    return { sha, title, date };
  });
}

export function buildDemoSeeds(workspace: string): DemoSeed[] {
  const entries = readGitLog(workspace);
  if (entries.length < 2) {
    return [];
  }

  const seeds: DemoSeed[] = [];

  for (let index = 1; index < entries.length; index += 1) {
    const head = entries[index - 1]!;
    const base = entries[index]!;
    const parent = resolveGitSha(`${base.sha}^`, workspace);

    seeds.push({
      runId: `sample-demo-${index}`,
      commit: head.sha,
      baseCommit: parent ?? base.sha,
      commitTitle: `[demo] ${head.title}`,
      generatedAt: head.date,
    });
  }

  return seeds.reverse();
}

export function seedSampleDemoReports(options: SeedDemoReportsOptions): number {
  const workspace = options.workspace ?? process.cwd();
  const seeds = buildDemoSeeds(workspace);
  let created = 0;

  for (const seed of seeds) {
    const reportDir = join(options.siteDir, "reports", seed.runId);
    if (existsSync(join(reportDir, "index.html"))) {
      continue;
    }

    mkdirSync(reportDir, { recursive: true });

    const meta: ReportMeta = {
      runId: seed.runId,
      commit: seed.commit,
      baseCommit: seed.baseCommit,
      commitTitle: seed.commitTitle,
      changedCount: 2,
      issueCount: 1,
      generatedAt: seed.generatedAt,
    };

    const metaPath = join(reportDir, "report-meta.json");
    writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    copyFileSync(options.reportFile, join(reportDir, "index.html"));

    preparePagesSite({
      siteDir: options.siteDir,
      reportFile: join(reportDir, "index.html"),
      metaFile: metaPath,
      pagesBaseUrl: options.pagesBaseUrl,
      repositoryUrl: options.repositoryUrl,
    });

    created += 1;
  }

  return created;
}

function parseArgs(argv: string[]): SeedDemoReportsOptions {
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
  const pagesBaseUrl = values.get("pages-base-url");

  if (!siteDir || !reportFile || !pagesBaseUrl) {
    throw new Error(
      "Usage: seed-demo-reports --site-dir DIR --report-file FILE --pages-base-url URL [--repository-url URL] [--workspace DIR]",
    );
  }

  return {
    siteDir,
    reportFile,
    pagesBaseUrl,
    repositoryUrl: values.get("repository-url"),
    workspace: values.get("workspace"),
  };
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const created = seedSampleDemoReports(parseArgs(process.argv.slice(2)));
  console.log(String(created));
}
