import { describe, expect, it } from "vitest";

import { hasExplicitLockfilePaths, resolveAuditExisting } from "../src/run-mode.js";

describe("resolveAuditExisting", () => {
  it("enables manual audit-only mode on workflow_dispatch", () => {
    expect(resolveAuditExisting(true, "workflow_dispatch", false)).toEqual({
      enabled: true,
      manualAuditOnly: true,
    });
  });

  it("ignores audit-existing on pull requests", () => {
    expect(resolveAuditExisting(true, "pull_request", false)).toEqual({
      enabled: false,
      manualAuditOnly: false,
      ignoredReason: "audit-existing only runs on workflow_dispatch",
    });
  });

  it("ignores audit-existing when explicit lockfile paths are provided", () => {
    expect(resolveAuditExisting(true, "workflow_dispatch", true)).toEqual({
      enabled: false,
      manualAuditOnly: false,
      ignoredReason:
        "audit-existing is disabled when old/new lockfile paths are provided",
    });
  });
});

describe("hasExplicitLockfilePaths", () => {
  it("detects explicit before/after lockfile paths", () => {
    expect(
      hasExplicitLockfilePaths(
        "fixtures/before/package-lock.json",
        "fixtures/after/package-lock.json",
      ),
    ).toBe(true);
    expect(hasExplicitLockfilePaths(undefined, undefined)).toBe(false);
  });
});
