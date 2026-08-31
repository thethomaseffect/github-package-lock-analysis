import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGitHubBlobUrl,
  clearChangelogCache,
  extractRepositoryUrl,
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

describe("resolveChangelogLink", () => {
  afterEach(() => {
    clearChangelogCache();
    vi.restoreAllMocks();
  });

  it("uses CHANGELOG.md when present on github", async () => {
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

      if (init?.method === "HEAD" && url.includes("raw.githubusercontent.com/lodash/lodash/main/CHANGELOG.md")) {
        return new Response(null, { status: 200 });
      }

      if (init?.method === "HEAD") {
        return new Response(null, { status: 404 });
      }

      return new Response(null, { status: 404 });
    });

    const link = await resolveChangelogLink("lodash");

    expect(link.kind).toBe("changelog");
    expect(link.label).toBe("Changelog");
    expect(link.url).toBe(buildGitHubBlobUrl("lodash", "lodash", "main", "CHANGELOG.md"));
  });

  it("falls back to github releases when no changelog file exists", async () => {
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

    const link = await resolveChangelogLink("negotiator");

    expect(link.kind).toBe("releases");
    expect(link.label).toBe("Release notes");
    expect(link.url).toBe("https://github.com/jshttp/negotiator/releases");
  });

  it("falls back to npm when registry metadata is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    const link = await resolveChangelogLink("missing-package");

    expect(link.kind).toBe("npm");
    expect(link.label).toBe("Package page");
    expect(link.url).toBe("https://www.npmjs.com/package/missing-package");
  });
});
