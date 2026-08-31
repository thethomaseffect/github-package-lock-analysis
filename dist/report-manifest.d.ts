export interface ReportManifestEntry {
    runId: string;
    commit: string;
    baseCommit?: string;
    commitTitle: string;
    changedCount: number;
    issueCount: number;
    generatedAt: string;
    url: string;
    workflowRunUrl?: string;
}
export interface ReportManifest {
    latestReportCommit: string;
    reports: ReportManifestEntry[];
}
export declare function createEmptyManifest(): ReportManifest;
export declare function parseReportManifest(raw: string): ReportManifest;
export declare function upsertReportEntry(manifest: ReportManifest, entry: ReportManifestEntry): ReportManifest;
export declare function mergeReportEntries(...entryGroups: ReportManifestEntry[][]): ReportManifestEntry[];
export declare function buildManifestFromEntries(reports: ReportManifestEntry[]): ReportManifest;
export declare function buildReportPageUrl(pagesBaseUrl: string, runId: string): string;
export declare function resolveManifestBaseRef(manifest: ReportManifest | null, headRef: string, isAncestor: (ancestor: string, descendant: string) => boolean): string | null;
export declare function buildContentsIndexHtml(manifest: ReportManifest, repositoryUrl?: string): string;
//# sourceMappingURL=report-manifest.d.ts.map