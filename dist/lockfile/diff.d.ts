import type { PackageChange, PackageLockJson } from "./types.js";
export interface RawPackageChange {
    lockPath: string;
    name: string;
    breadcrumb: string[];
    depth: number;
    oldVersion: string | null;
    newVersion: string;
}
export declare function diffLockfiles(oldLockfile: PackageLockJson, newLockfile: PackageLockJson, projectNameOverride?: string): RawPackageChange[];
export declare function readLockfileFromPath(filePath: string): PackageLockJson;
export declare function toUnenrichedChanges(rawChanges: RawPackageChange[]): PackageChange[];
//# sourceMappingURL=diff.d.ts.map