export type ChangelogLinkKind = "changelog" | "releases" | "npm";
export interface ChangelogLink {
    url: string;
    label: string;
    kind: ChangelogLinkKind;
}
interface NpmPackageMetadata {
    repository?: {
        url?: string;
        directory?: string;
    } | string;
}
export declare function npmRegistryPackageUrl(packageName: string): string;
export declare function parseGitHubRepository(repositoryUrl: string): {
    owner: string;
    repo: string;
    directory?: string;
} | null;
export declare function extractRepositoryUrl(metadata: NpmPackageMetadata): string | null;
export declare function buildGitHubBlobUrl(owner: string, repo: string, branch: string, filePath: string, fragment?: string): string;
export declare function buildGitHubRawUrl(owner: string, repo: string, branch: string, filePath: string): string;
export declare function buildGitHubReleaseTagUrl(owner: string, repo: string, version: string): string;
/** GitHub-compatible slug for markdown heading anchors. */
export declare function githubMarkdownAnchor(headerText: string): string;
export declare function headerMatchesVersion(headerText: string, version: string): boolean;
export declare function findVersionHeaderAnchor(changelogContent: string, version: string): string | null;
export declare function urlExists(url: string): Promise<boolean>;
export declare function resolveChangelogLink(packageName: string, version: string): Promise<ChangelogLink>;
export declare function clearChangelogCache(): void;
export {};
//# sourceMappingURL=changelog.d.ts.map