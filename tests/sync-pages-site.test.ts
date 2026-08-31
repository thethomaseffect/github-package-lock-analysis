import { describe, expect, it } from "vitest";

import { countLocalReports } from "../scripts/sync-pages-site-from-live.js";

describe("countLocalReports", () => {
  it("returns zero when reports directory is missing", () => {
    expect(countLocalReports("/tmp/does-not-exist-lockfile-pages-site")).toBe(0);
  });
});
