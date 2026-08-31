import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { AnalysisResult } from "../lockfile/types.js";
import { buildReportHtml } from "./build.js";

export function writeReport(result: AnalysisResult, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true });
  const reportPath = join(outputDir, "index.html");
  writeFileSync(reportPath, buildReportHtml(result), "utf8");
  return reportPath;
}
