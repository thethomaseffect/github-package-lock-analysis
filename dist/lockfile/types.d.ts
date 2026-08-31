export interface LockfilePackage {
    name?: string;
    version?: string;
    resolved?: string;
    dependencies?: Record<string, string>;
    dev?: boolean;
}
export interface PackageLockJson {
    name?: string;
    version?: string;
    lockfileVersion?: number;
    packages?: Record<string, LockfilePackage>;
    dependencies?: Record<string, LockfilePackage>;
}
export interface ParsedPackage {
    /** Lockfile key, e.g. node_modules/lodash */
    lockPath: string;
    name: string;
    version: string;
    /** Segments from project root, e.g. ["sample-project", "lodash"] */
    breadcrumb: string[];
    depth: number;
}
export type SecurityLevel = "red" | "yellow";
export interface CveReference {
    id: string;
    url: string;
    summary?: string;
}
export interface HackerNewsReference {
    title: string;
    url: string;
    date: string;
}
export interface ReferenceLink {
    url: string;
    label: string;
    kind: "npm-version" | "changelog" | "releases" | "commit";
}
export interface PackageReferences {
    links: ReferenceLink[];
}
export interface PackageChange {
    lockPath: string;
    name: string;
    breadcrumb: string[];
    depth: number;
    oldVersion: string | null;
    newVersion: string;
    securityLevel: SecurityLevel;
    /** True when enrichment was skipped — reviewer must follow links manually. */
    manualReview?: boolean;
    cves: CveReference[];
    hackerNews: HackerNewsReference[];
    references: PackageReferences;
}
export interface ExistingVulnerability {
    lockPath: string;
    name: string;
    breadcrumb: string[];
    depth: number;
    version: string;
    cves: CveReference[];
    references: PackageReferences;
}
export interface AnalysisResult {
    projectName: string;
    changes: PackageChange[];
    changedCount: number;
    redCount: number;
    yellowCount: number;
    manualReviewCount: number;
    enrichmentLimited: boolean;
    enrichmentLimit: number;
    existingVulnerabilities: ExistingVulnerability[];
    existingRedCount: number;
    auditedExisting: boolean;
}
export interface AnalysisOptions {
    projectName?: string;
    includeHackerNews?: boolean;
    auditExisting?: boolean;
    excludeLockPaths?: Set<string>;
    auditConcurrency?: number;
    /** Max changes to enrich with CVE/changelog lookups; above this, rows are manual-review only. */
    enrichmentLimit?: number;
    /** Concurrent enrichment requests when under enrichmentLimit. */
    enrichmentConcurrency?: number;
}
//# sourceMappingURL=types.d.ts.map