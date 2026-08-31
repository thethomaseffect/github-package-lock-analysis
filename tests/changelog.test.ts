import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGitHubBlobUrl,
  clearChangelogCache,
  extractRepositoryUrl,
  findVersionHeaderAnchor,
  githubMarkdownAnchor,
  headerMatchesVersion,
  parseGitHubRepository,
  resolveChangelogLink,
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

describe("resolveChangelogLink", () => {
  afterEach(() => {
    clearChangelogCache();
    vi.restoreAllMocks();
  });

  it("links to the version heading when changelog content is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("registry.npmjs.org/lodash")) {
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

    const link = await resolveChangelogLink("lodash", "4.17.15");

    expect(link.kind).toBe("changelog");
    expect(link.label).toBe("Changelog (4.17.15)");
    expect(link.url).toBe(
      `${buildGitHubBlobUrl("lodash", "lodash", "main", "CHANGELOG")}#v41715`,
    );
  });

  it("falls back to github release tag when no changelog file exists", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

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

    const link = await resolveChangelogLink("negotiator", "0.6.2");

    expect(link.kind).toBe("releases");
    expect(link.label).toBe("Release notes (0.6.2)");
    expect(link.url).toBe("https://github.com/jshttp/negotiator/releases/tag/v0.6.2");
  });

  it("falls back to npm when registry metadata is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    const link = await resolveChangelogLink("missing-package", "1.0.0");

    expect(link.kind).toBe("npm");
    expect(link.label).toBe("Package page");
    expect(link.url).toBe("https://www.npmjs.com/package/missing-package");
  });
});
