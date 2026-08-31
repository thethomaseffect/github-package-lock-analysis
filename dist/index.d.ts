export interface RunActionOptions {
    lockfilePath: string;
    oldLockfilePath?: string;
    newLockfilePath?: string;
    baseRef?: string;
    headRef?: string;
    outputDir: string;
    includeHackerNews: boolean;
    projectName?: string;
    skipIfUnchanged: boolean;
    auditExisting: boolean;
    failOnRed: boolean;
    postPrComment: boolean;
    artifactName: string;
    reportUrl?: string;
    workspace: string;
    eventName?: string;
    reportManifestPath?: string;
    useReportManifestBase?: boolean;
    pagesBaseUrl?: string;
    reportCommit?: string;
    reportRunId?: string;
    reportCommitTitle?: string;
    reportBaseCommit?: string;
}
export declare function runAction(options: RunActionOptions): Promise<string | null>;
//# sourceMappingURL=index.d.ts.map