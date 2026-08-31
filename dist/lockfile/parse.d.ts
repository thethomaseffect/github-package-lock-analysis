import type { PackageLockJson, ParsedPackage } from "./types.js";
export declare function parseLockfile(lockfile: PackageLockJson, projectNameOverride?: string): {
    projectName: string;
    packages: Map<string, ParsedPackage>;
};
export declare function formatBreadcrumb(breadcrumb: string[]): string;
//# sourceMappingURL=parse.d.ts.map