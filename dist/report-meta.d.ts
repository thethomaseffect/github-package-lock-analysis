export interface ReportMeta {
    runId: string;
    commit: string;
    baseCommit?: string;
    commitTitle: string;
    changedCount: number;
    issueCount: number;
    generatedAt: string;
    workflowRunUrl?: string;
}
export declare function writeReportMeta(outputDir: string, meta: ReportMeta): string;
export declare function parseReportMeta(raw: string): ReportMeta;
//# sourceMappingURL=report-meta.d.ts.map