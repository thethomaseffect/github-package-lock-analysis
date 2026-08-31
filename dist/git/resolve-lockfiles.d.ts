export interface ResolveLockfilesOptions {
    lockfilePath: string;
    oldLockfilePath?: string;
    newLockfilePath?: string;
    baseRef?: string;
    headRef?: string;
    workspace: string;
    tempDir: string;
    reportManifestPath?: string;
    useReportManifestBase?: boolean;
}
export interface ResolvedLockfiles {
    oldPath: string;
    newPath: string;
    cleanup: () => void;
    source: "explicit" | "git";
    baseRef?: string;
    headRef?: string;
}
export interface GitEventContext {
    eventName: string;
    sha: string;
    payload: unknown;
}
export declare function resolveBaseRefFromContext(context: GitEventContext, override?: string): string | null;
export declare function resolveHeadRefFromContext(context: GitEventContext, override?: string): string;
export declare function resolveBaseRefWithManifest(context: GitEventContext, headRef: string, workspace: string, override?: string, reportManifestPath?: string, useReportManifestBase?: boolean): string | null;
export declare function gitShow(ref: string, filePath: string, workspace: string): string | null;
export declare function lockfileChangedInGit(baseRef: string, headRef: string, lockfilePath: string, workspace: string): boolean;
export declare function resolveLockfiles(options: ResolveLockfilesOptions): ResolvedLockfiles;
export declare function shouldSkipUnchangedLockfile(skipIfUnchanged: boolean, resolved: ResolvedLockfiles, lockfilePath: string, workspace: string): boolean;
//# sourceMappingURL=resolve-lockfiles.d.ts.map