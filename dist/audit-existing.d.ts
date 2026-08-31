import type { ExistingVulnerability, PackageLockJson } from "./lockfile/types.js";
export interface AuditExistingOptions {
    projectName?: string;
    excludeLockPaths?: Set<string>;
    concurrency?: number;
}
export declare function auditExistingVulnerabilities(lockfile: PackageLockJson, options?: AuditExistingOptions): Promise<ExistingVulnerability[]>;
//# sourceMappingURL=audit-existing.d.ts.map