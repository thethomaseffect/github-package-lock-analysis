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
    postPrComment: boolean;
    artifactName: string;
    reportUrl?: string;
    workspace: string;
}
export declare function runAction(options: RunActionOptions): Promise<string | null>;
//# sourceMappingURL=index.d.ts.map