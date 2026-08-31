import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGitHubBlobUrl,
  clearReferencesCache,
  extractRepositoryUrl,
  findVersionHeaderAnchor,
  githubMarkdownAnchor,
  headerMatchesVersion,
  parseGitHubRepository,
  resolvePackageReferences,
} from "../src/enrichment/changelog.js";

describe("parseGitHubRepository", () => {
  it("parses https github urls", () => {
    expect(parseGitHubRepository("https://github.com/lodash/lodash.git")).toEqual({
      owner: "lodash",
      repo: "lodash",
      directory: undefined,
    });
  });

  it("parses git+ssh github urls", () => {
    expect(parseGitHubRepository("git+ssh://git@github.com/lodash/lodash.git")).toEqual({
      owner: "lodash",
      repo: "lodash",
      directory: undefined,
    });
  });
});

describe("extractRepositoryUrl", () => {
  it("reads repository url from npm metadata shapes", () => {
    expect(
      extractRepositoryUrl({
        repository: { url: "git+https://github.com/lodash/lodash.git" },
      }),
    ).toBe("git+https://github.com/lodash/lodash.git");

    expect(
      extractRepositoryUrl({
        repository: "github:lodash/lodash",
      }),
    ).toBe("github:lodash/lodash");
  });
});

describe("findVersionHeaderAnchor", () => {
  const sampleChangelog = `
# Changelog

## v4.17.21
- Fix something

## v4.17.15
- Security fix

## [4.17.14] - 2020-01-01
- Older release
`;

  it("matches semver headers with v prefix", () => {
    expect(findVersionHeaderAnchor(sampleChangelog, "4.17.15")).toBe("v41715");
    expect(githubMarkdownAnchor("v4.17.15")).toBe("v41715");
  });

  it("matches keep-a-changelog bracket headers", () => {
    expect(findVersionHeaderAnchor(sampleChangelog, "4.17.14")).toBe("41714-2020-01-01");
    expect(headerMatchesVersion("[4.17.14] - 2020-01-01", "4.17.14")).toBe(true);
  });
});

describe("resolvePackageReferences", () => {
  afterEach(() => {
    clearReferencesCache();
    vi.restoreAllMocks();
  });

  it("includes npm version, changelog, and publish commit links", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("registry.npmjs.org/lodash/4.17.15")) {
        return new Response(
          JSON.stringify({
            gitHead: "abc123def456",
            repository: { url: "git+https://github.com/lodash/lodash.git" },
          }),
          { status: 200 },
        );
      }

      if (url.includes("registry.npmjs.org/lodash") && !url.endsWith("/4.17.15")) {
        return new Response(
          JSON.stringify({
            repository: { url: "git+https://github.com/lodash/lodash.git" },
          }),
          { status: 200 },
        );
      }

      if (
        init?.method === "HEAD" &&
        url.includes("raw.githubusercontent.com/lodash/lodash/main/CHANGELOG") &&
        !url.endsWith("CHANGELOG.md")
      ) {
        return new Response(null, { status: 200 });
      }

      if (init?.method === "HEAD" && url.includes("raw.githubusercontent.com/lodash/lodash/main/CHANGELOG.md")) {
        return new Response(null, { status: 404 });
      }

      if (init?.method === "HEAD") {
        return new Response(null, { status: 404 });
      }

      if (
        url.includes("raw.githubusercontent.com/lodash/lodash/main/CHANGELOG") &&
        !url.endsWith("CHANGELOG.md")
      ) {
        return new Response("## v4.17.15\n- Security fixes\n", { status: 200 });
      }

      return new Response(null, { status: 404 });
    });

    const references = await resolvePackageReferences("lodash", "4.17.15");

    expect(references.links).toHaveLength(3);
    expect(references.links[0]).toMatchObject({
      kind: "npm-version",
      label: "npm @ 4.17.15",
      url: "https://www.npmjs.com/package/lodash/v/4.17.15",
    });
    expect(references.links[1]).toMatchObject({
      kind: "changelog",
      label: "Changelog (4.17.15)",
      url: `${buildGitHubBlobUrl("lodash", "lodash", "main", "CHANGELOG")}#v41715`,
    });
    expect(references.links[2]).toMatchObject({
      kind: "commit",
      label: "Publish commit",
      url: "https://github.com/lodash/lodash/commit/abc123def456",
    });
  });

  it("includes npm version and release notes when no changelog file exists", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("registry.npmjs.org/negotiator/0.6.2")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }

      if (url.includes("registry.npmjs.org/negotiator")) {
        return new Response(
          JSON.stringify({
            repository: { url: "git://github.com/jshttp/negotiator.git" },
          }),
          { status: 200 },
        );
      }

      if (init?.method === "HEAD") {
        return new Response(null, { status: 404 });
      }

      return new Response(null, { status: 404 });
    });

    const references = await resolvePackageReferences("negotiator", "0.6.2");

    expect(references.links).toHaveLength(2);
    expect(references.links[0]?.kind).toBe("npm-version");
    expect(references.links[1]).toMatchObject({
      kind: "releases",
      label: "Release notes (0.6.2)",
      url: "https://github.com/jshttp/negotiator/releases/tag/v0.6.2",
    });
  });

  it("falls back to npm version only when registry metadata is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    const references = await resolvePackageReferences("missing-package", "1.0.0");

    expect(references.links).toEqual([
      {
        url: "https://www.npmjs.com/package/missing-package/v/1.0.0",
        label: "npm @ 1.0.0",
        kind: "npm-version",
      },
    ]);
  });
});
