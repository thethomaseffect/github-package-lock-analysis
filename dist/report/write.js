import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildReportHtml } from "./build.js";
export function writeReport(result, outputDir) {
    mkdirSync(outputDir, { recursive: true });
    const reportPath = join(outputDir, "index.html");
    writeFileSync(reportPath, buildReportHtml(result), "utf8");
    return reportPath;
}
//# sourceMappingURL=write.js.map