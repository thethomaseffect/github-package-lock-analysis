import type { AnalysisOptions, AnalysisResult, PackageLockJson } from "./lockfile/types.js";
export declare const DEFAULT_ENRICHMENT_LIMIT = 500;
export declare const DEFAULT_ENRICHMENT_CONCURRENCY = 8;
export declare function analyzeLockfileChanges(oldLockfile: PackageLockJson, newLockfile: PackageLockJson, options?: AnalysisOptions): Promise<AnalysisResult>;
//# sourceMappingURL=analyze.d.ts.map