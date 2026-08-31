import { buildNpmVersionUrl } from "./urls.js";
const CHANGELOG_CANDIDATES = [
    "CHANGELOG.md",
    "changelog.md",
    "CHANGELOG",
    "Changelog.md",
    "History.md",
];
const DEFAULT_BRANCHES = ["main", "master"];
const cache = new Map();
export function npmRegistryPackageUrl(packageName) {
    return `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
}
export function npmRegistryVersionUrl(packageName, version) {
    return `${npmRegistryPackageUrl(packageName)}/${encodeURIComponent(version)}`;
}
export function parseGitHubRepository(repositoryUrl) {
    const normalized = repositoryUrl
        .replace(/^git\+/, "")
        .replace(/\.git$/, "")
        .replace(/^git@github.com:/, "https://github.com/")
        .replace(/^github:/, "https://github.com/")
        .trim();
    let url;
    try {
        url = new URL(normalized);
    }
    catch {
        return null;
    }
    if (!url.hostname.includes("github.com")) {
        return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
        return null;
    }
    const [owner, repo] = parts;
    if (!owner || !repo) {
        return null;
    }
    const directory = parts[2] === "tree" || parts[2] === "blob" ? undefined : parts.slice(2).join("/") || undefined;
    return { owner, repo: repo.replace(/\.git$/, ""), directory };
}
export function extractRepositoryUrl(metadata) {
    const repository = metadata.repository;
    if (!repository) {
        return null;
    }
    if (typeof repository === "string") {
        return repository;
    }
    return repository.url ?? null;
}
export function buildGitHubBlobUrl(owner, repo, branch, filePath, fragment) {
    const base = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
    return fragment ? `${base}#${fragment}` : base;
}
export function buildGitHubRawUrl(owner, repo, branch, filePath) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}
export function buildGitHubReleaseTagUrl(owner, repo, version) {
    const tag = version.startsWith("v") ? version : `v${version}`;
    return `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(tag)}`;
}
export function buildGitHubCommitUrl(owner, repo, sha) {
    return `https://github.com/${owner}/${repo}/commit/${sha}`;
}
/** GitHub-compatible slug for markdown heading anchors. */
export function githubMarkdownAnchor(headerText) {
    return headerText
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function headerMatchesVersion(headerText, version) {
    const normalizedVersion = version.replace(/^v/i, "");
    const patterns = [
        new RegExp(`\\bv${escapeRegExp(normalizedVersion)}\\b`, "i"),
        new RegExp(`\\[v?${escapeRegExp(normalizedVersion)}\\]`),
        new RegExp(`\\bv?${escapeRegExp(normalizedVersion)}(?:\\s|$|\\))`, "i"),
    ];
    return patterns.some((pattern) => pattern.test(headerText));
}
export function findVersionHeaderAnchor(changelogContent, version) {
    for (const line of changelogContent.split(/\r?\n/)) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (!match?.[2]) {
            continue;
        }
        const headerText = match[2].trim();
        if (!headerMatchesVersion(headerText, version)) {
            continue;
        }
        return githubMarkdownAnchor(headerText);
    }
    return null;
}
export async function urlExists(url) {
    try {
        const response = await fetch(url, { method: "HEAD", redirect: "follow" });
        return response.ok;
    }
    catch {
        return false;
    }
}
async function fetchText(url) {
    try {
        const response = await fetch(url, { redirect: "follow" });
        if (!response.ok) {
            return null;
        }
        return await response.text();
    }
    catch {
        return null;
    }
}
async function fetchNpmMetadata(packageName) {
    try {
        const response = await fetch(npmRegistryPackageUrl(packageName));
        if (!response.ok) {
            return null;
        }
        return (await response.json());
    }
    catch {
        return null;
    }
}
async function fetchNpmVersionMetadata(packageName, version) {
    try {
        const response = await fetch(npmRegistryVersionUrl(packageName, version));
        if (!response.ok) {
            return null;
        }
        return (await response.json());
    }
    catch {
        return null;
    }
}
async function findChangelogFileLocation(owner, repo) {
    for (const branch of DEFAULT_BRANCHES) {
        for (const fileName of CHANGELOG_CANDIDATES) {
            const rawUrl = buildGitHubRawUrl(owner, repo, branch, fileName);
            if (await urlExists(rawUrl)) {
                return { owner, repo, branch, fileName };
            }
        }
    }
    return null;
}
async function resolveChangelogFileLink(location, version) {
    const rawUrl = buildGitHubRawUrl(location.owner, location.repo, location.branch, location.fileName);
    const content = await fetchText(rawUrl);
    const anchor = content ? findVersionHeaderAnchor(content, version) : null;
    const url = buildGitHubBlobUrl(location.owner, location.repo, location.branch, location.fileName, anchor ?? undefined);
    return {
        url,
        label: anchor ? `Changelog (${version})` : "Changelog",
        kind: "changelog",
    };
}
async function resolveSecondaryLink(github, version) {
    const changelogLocation = await findChangelogFileLocation(github.owner, github.repo);
    if (changelogLocation) {
        return resolveChangelogFileLink(changelogLocation, version);
    }
    return {
        url: buildGitHubReleaseTagUrl(github.owner, github.repo, version),
        label: `Release notes (${version})`,
        kind: "releases",
    };
}
export async function resolvePackageReferences(packageName, version) {
    const cacheKey = `${packageName}@${version}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const links = [
        {
            url: buildNpmVersionUrl(packageName, version),
            label: `npm @ ${version}`,
            kind: "npm-version",
        },
    ];
    const [packageMetadata, versionMetadata] = await Promise.all([
        fetchNpmMetadata(packageName),
        fetchNpmVersionMetadata(packageName, version),
    ]);
    const repositoryUrl = extractRepositoryUrl(packageMetadata ?? {}) ??
        extractRepositoryUrl(versionMetadata ?? {});
    const github = repositoryUrl ? parseGitHubRepository(repositoryUrl) : null;
    if (github) {
        const secondary = await resolveSecondaryLink(github, version);
        if (secondary) {
            links.push(secondary);
        }
        const gitHead = versionMetadata?.gitHead;
        if (gitHead) {
            links.push({
                url: buildGitHubCommitUrl(github.owner, github.repo, gitHead),
                label: "Publish commit",
                kind: "commit",
            });
        }
    }
    const references = { links };
    cache.set(cacheKey, references);
    return references;
}
/** @deprecated Use resolvePackageReferences */
export async function resolveChangelogLink(packageName, version) {
    const references = await resolvePackageReferences(packageName, version);
    return references.links[1] ?? references.links[0];
}
export function clearChangelogCache() {
    cache.clear();
}
export function clearReferencesCache() {
    cache.clear();
}
//# sourceMappingURL=changelog.js.map