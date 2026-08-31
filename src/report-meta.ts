import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ReportMeta {
  runId: string;
  commit: string;
  commitTitle: string;
  changedCount: number;
  issueCount: number;
  generatedAt: string;
  workflowRunUrl?: string;
}

export function writeReportMeta(outputDir: string, meta: ReportMeta): string {
  const metaPath = join(outputDir, "report-meta.json");
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return metaPath;
}

export function parseReportMeta(raw: string): ReportMeta {
  const parsed = JSON.parse(raw) as Partial<ReportMeta>;
  return {
    runId: parsed.runId ?? "",
    commit: parsed.commit ?? "",
    commitTitle: parsed.commitTitle ?? "",
    changedCount: parsed.changedCount ?? 0,
    issueCount: parsed.issueCount ?? 0,
    generatedAt: parsed.generatedAt ?? "",
    workflowRunUrl: parsed.workflowRunUrl,
  };
}
