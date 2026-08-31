export type ReferenceLinkKind = "npm-version" | "changelog" | "releases" | "commit";
export interface ReferenceLink {
    url: string;
    label: string;
    kind: ReferenceLinkKind;
}
export interface PackageReferences {
    links: ReferenceLink[];
}
interface NpmPackageMetadata {
    repository?: {
        url?: string;
        directory?: string;
    } | string;
}
export declare function npmRegistryPackageUrl(packageName: string): string;
export declare function npmRegistryVersionUrl(packageName: string, version: string): string;
export declare function parseGitHubRepository(repositoryUrl: string): {
    owner: string;
    repo: string;
    directory?: string;
} | null;
export declare function extractRepositoryUrl(metadata: NpmPackageMetadata): string | null;
export declare function buildGitHubBlobUrl(owner: string, repo: string, branch: string, filePath: string, fragment?: string): string;
export declare function buildGitHubRawUrl(owner: string, repo: string, branch: string, filePath: string): string;
export declare function buildGitHubReleaseTagUrl(owner: string, repo: string, version: string): string;
export declare function buildGitHubCommitUrl(owner: string, repo: string, sha: string): string;
/** GitHub-compatible slug for markdown heading anchors. */
export declare function githubMarkdownAnchor(headerText: string): string;
export declare function headerMatchesVersion(headerText: string, version: string): boolean;
export declare function findVersionHeaderAnchor(changelogContent: string, version: string): string | null;
export declare function urlExists(url: string): Promise<boolean>;
export declare function resolvePackageReferences(packageName: string, version: string): Promise<PackageReferences>;
/** @deprecated Use resolvePackageReferences */
export declare function resolveChangelogLink(packageName: string, version: string): Promise<ReferenceLink>;
export declare function clearChangelogCache(): void;
export declare function clearReferencesCache(): void;
export {};
//# sourceMappingURL=changelog.d.ts.map