import { buildNpmPackageUrl } from "./urls.js";

export type ChangelogLinkKind = "changelog" | "releases" | "npm";

export interface ChangelogLink {
  url: string;
  label: string;
  kind: ChangelogLinkKind;
}

interface NpmPackageMetadata {
  repository?: { url?: string; directory?: string } | string;
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

const cache = new Map<string, ChangelogLink>();

export function npmRegistryPackageUrl(packageName: string): string {
  return `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
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
): Promise<ChangelogLink> {
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

export async function resolveChangelogLink(
  packageName: string,
  version: string,
): Promise<ChangelogLink> {
  const cacheKey = `${packageName}@${version}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const npmFallback: ChangelogLink = {
    url: buildNpmPackageUrl(packageName),
    label: "Package page",
    kind: "npm",
  };

  const metadata = await fetchNpmMetadata(packageName);
  if (!metadata) {
    cache.set(cacheKey, npmFallback);
    return npmFallback;
  }

  const repositoryUrl = extractRepositoryUrl(metadata);
  if (!repositoryUrl) {
    cache.set(cacheKey, npmFallback);
    return npmFallback;
  }

  const github = parseGitHubRepository(repositoryUrl);
  if (!github) {
    cache.set(cacheKey, npmFallback);
    return npmFallback;
  }

  const changelogLocation = await findChangelogFileLocation(github.owner, github.repo);
  if (changelogLocation) {
    const link = await resolveChangelogFileLink(changelogLocation, version);
    cache.set(cacheKey, link);
    return link;
  }

  const releasesLink: ChangelogLink = {
    url: buildGitHubReleaseTagUrl(github.owner, github.repo, version),
    label: `Release notes (${version})`,
    kind: "releases",
  };
  cache.set(cacheKey, releasesLink);
  return releasesLink;
}

export function clearChangelogCache(): void {
  cache.clear();
}
