import type { AnalysisResult, PackageChange } from "../lockfile/types.js";
export declare const DEFAULT_SUMMARY_LIST_LIMIT = 100;
export declare function formatChangeLine(change: PackageChange): string;
export declare function buildWorkflowArtifactLink(artifactName: string, workflowRunUrl?: string, reportUrl?: string): string;
export declare function buildWorkflowArtifactSummaryHtml(artifactName: string, workflowRunUrl?: string, reportUrl?: string): string;
export declare function buildPullRequestComment(result: AnalysisResult, artifactName: string, reportUrl?: string, summaryListLimit?: number): string;
export declare function buildSummaryRows(result: AnalysisResult): Array<[string, string]>;
export declare function buildSummaryChangeList(result: AnalysisResult, summaryListLimit?: number): string[];
//# sourceMappingURL=format.d.ts.map