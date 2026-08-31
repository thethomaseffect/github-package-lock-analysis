import type { CveReference } from "../lockfile/types.js";
export declare function lookupCves(packageName: string, version: string): Promise<CveReference[]>;
export declare function clearCveCache(): void;
//# sourceMappingURL=cve.d.ts.map