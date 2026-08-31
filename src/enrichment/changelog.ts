import { buildNpmVersionUrl } from "./urls.js";

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
  repository?: { url?: string; directory?: string } | string;
}

interface NpmVersionMetadata {
  gitHead?: string;
  repository?: { url?: string } | string;
}

interface ChangelogFileLocation {
  owner: string;
  repo: string;
  branch: string;
  fileName: string;
}

const CHANGELOG_CANDIDATES = [
  "CHANGELOG.md",
  "changelog.md",
  "CHANGELOG",
  "Changelog.md",
  "History.md",
];

const DEFAULT_BRANCHES = ["main", "master"];

const cache = new Map<string, PackageReferences>();

export function npmRegistryPackageUrl(packageName: string): string {
  return `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
}

export function npmRegistryVersionUrl(packageName: string, version: string): string {
  return `${npmRegistryPackageUrl(packageName)}/${encodeURIComponent(version)}`;
}

export function parseGitHubRepository(repositoryUrl: string): {
  owner: string;
  repo: string;
  directory?: string;
} | null {
  const normalized = repositoryUrl
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^git@github.com:/, "https://github.com/")
    .replace(/^github:/, "https://github.com/")
    .trim();

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
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

  const directory =
    parts[2] === "tree" || parts[2] === "blob" ? undefined : parts.slice(2).join("/") || undefined;

  return { owner, repo: repo.replace(/\.git$/, ""), directory };
}

export function extractRepositoryUrl(metadata: NpmPackageMetadata): string | null {
  const repository = metadata.repository;
  if (!repository) {
    return null;
  }

  if (typeof repository === "string") {
    return repository;
  }

  return repository.url ?? null;
}

export function buildGitHubBlobUrl(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  fragment?: string,
): string {
  const base = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
  return fragment ? `${base}#${fragment}` : base;
}

export function buildGitHubRawUrl(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

export function buildGitHubReleaseTagUrl(
  owner: string,
  repo: string,
  version: string,
): string {
  const tag = version.startsWith("v") ? version : `v${version}`;
  return `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(tag)}`;
}

export function buildGitHubCommitUrl(owner: string, repo: string, sha: string): string {
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}

/** GitHub-compatible slug for markdown heading anchors. */
export function githubMarkdownAnchor(headerText: string): string {
  return headerText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function headerMatchesVersion(headerText: string, version: string): boolean {
  const normalizedVersion = version.replace(/^v/i, "");
  const patterns = [
    new RegExp(`\\bv${escapeRegExp(normalizedVersion)}\\b`, "i"),
    new RegExp(`\\[v?${escapeRegExp(normalizedVersion)}\\]`),
    new RegExp(`\\bv?${escapeRegExp(normalizedVersion)}(?:\\s|$|\\))`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(headerText));
}

export function findVersionHeaderAnchor(
  changelogContent: string,
  version: string,
): string | null {
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

export async function urlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

async function fetchNpmMetadata(packageName: string): Promise<NpmPackageMetadata | null> {
  try {
    const response = await fetch(npmRegistryPackageUrl(packageName));
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as NpmPackageMetadata;
  } catch {
    return null;
  }
}

async function fetchNpmVersionMetadata(
  packageName: string,
  version: string,
): Promise<NpmVersionMetadata | null> {
  try {
    const response = await fetch(npmRegistryVersionUrl(packageName, version));
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as NpmVersionMetadata;
  } catch {
    return null;
  }
}

async function findChangelogFileLocation(
  owner: string,
  repo: string,
): Promise<ChangelogFileLocation | null> {
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

async function resolveChangelogFileLink(
  location: ChangelogFileLocation,
  version: string,
): Promise<ReferenceLink> {
  const rawUrl = buildGitHubRawUrl(
    location.owner,
    location.repo,
    location.branch,
    location.fileName,
  );
  const content = await fetchText(rawUrl);
  const anchor = content ? findVersionHeaderAnchor(content, version) : null;
  const url = buildGitHubBlobUrl(
    location.owner,
    location.repo,
    location.branch,
    location.fileName,
    anchor ?? undefined,
  );

  return {
    url,
    label: anchor ? `Changelog (${version})` : "Changelog",
    kind: "changelog",
  };
}

async function resolveSecondaryLink(
  github: { owner: string; repo: string },
  version: string,
): Promise<ReferenceLink | null> {
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

export async function resolvePackageReferences(
  packageName: string,
  version: string,
): Promise<PackageReferences> {
  const cacheKey = `${packageName}@${version}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const links: ReferenceLink[] = [
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

  const repositoryUrl =
    extractRepositoryUrl(packageMetadata ?? {}) ??
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
export async function resolveChangelogLink(
  packageName: string,
  version: string,
): Promise<ReferenceLink> {
  const references = await resolvePackageReferences(packageName, version);
  return references.links[1] ?? references.links[0]!;
}

export function clearChangelogCache(): void {
  cache.clear();
}

export function clearReferencesCache(): void {
  cache.clear();
}
