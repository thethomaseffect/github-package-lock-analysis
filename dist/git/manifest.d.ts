import { type ReportManifest } from "../report-manifest.js";
export declare function isGitAncestor(ancestor: string, descendant: string, workspace: string): boolean;
export declare function readReportManifest(manifestPath: string): ReportManifest | null;
export declare function resolveGitSha(ref: string, workspace: string): string | undefined;
//# sourceMappingURL=manifest.d.ts.map