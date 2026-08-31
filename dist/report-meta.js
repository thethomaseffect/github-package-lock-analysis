import { writeFileSync } from "node:fs";
import { join } from "node:path";
export function writeReportMeta(outputDir, meta) {
    const metaPath = join(outputDir, "report-meta.json");
    writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    return metaPath;
}
export function parseReportMeta(raw) {
    const parsed = JSON.parse(raw);
    return {
        runId: parsed.runId ?? "",
        commit: parsed.commit ?? "",
        baseCommit: parsed.baseCommit,
        commitTitle: parsed.commitTitle ?? "",
        changedCount: parsed.changedCount ?? 0,
        issueCount: parsed.issueCount ?? 0,
        generatedAt: parsed.generatedAt ?? "",
        workflowRunUrl: parsed.workflowRunUrl,
    };
}
//# sourceMappingURL=report-meta.js.map