import { mapWithConcurrency } from "./concurrency.js";
import { auditExistingVulnerabilities } from "./audit-existing.js";
import { buildMinimalPackageReferences } from "./enrichment/minimal-references.js";
import { resolvePackageReferences } from "./enrichment/changelog.js";
import { lookupCves } from "./enrichment/cve.js";
import { lookupHackerNews } from "./enrichment/hackernews.js";
import { diffLockfiles, type RawPackageChange } from "./lockfile/diff.js";
import type {
  AnalysisOptions,
  AnalysisResult,
  PackageChange,
  PackageLockJson,
  SecurityLevel,
} from "./lockfile/types.js";

export const DEFAULT_ENRICHMENT_LIMIT = 500;
export const DEFAULT_ENRICHMENT_CONCURRENCY = 8;

async function enrichChange(
  change: RawPackageChange,
  includeHackerNews: boolean,
): Promise<PackageChange> {
  const [cves, hackerNews, references] = await Promise.all([
    lookupCves(change.name, change.newVersion),
    includeHackerNews
      ? lookupHackerNews(change.name, change.newVersion)
      : Promise.resolve([]),
    resolvePackageReferences(change.name, change.newVersion),
  ]);

  const securityLevel: SecurityLevel = cves.length > 0 ? "red" : "yellow";

  return {
    ...change,
    securityLevel,
    cves,
    hackerNews,
    references,
  };
}

function toManualReviewChange(change: RawPackageChange): PackageChange {
  return {
    ...change,
    securityLevel: "yellow",
    manualReview: true,
    cves: [],
    hackerNews: [],
    references: buildMinimalPackageReferences(change.name, change.newVersion),
  };
}

function summarizeChanges(changes: PackageChange[]): {
  redCount: number;
  yellowCount: number;
  manualReviewCount: number;
} {
  let redCount = 0;
  let manualReviewCount = 0;

  for (const change of changes) {
    if (change.securityLevel === "red") {
      redCount += 1;
    }
    if (change.manualReview) {
      manualReviewCount += 1;
    }
  }

  return {
    redCount,
    yellowCount: changes.length - redCount,
    manualReviewCount,
  };
}

export async function analyzeLockfileChanges(
  oldLockfile: PackageLockJson,
  newLockfile: PackageLockJson,
  options: AnalysisOptions = {},
): Promise<AnalysisResult> {
  const rawChanges = diffLockfiles(
    oldLockfile,
    newLockfile,
    options.projectName,
  );

  const enrichmentLimit = options.enrichmentLimit ?? DEFAULT_ENRICHMENT_LIMIT;
  const enrichmentConcurrency =
    options.enrichmentConcurrency ?? DEFAULT_ENRICHMENT_CONCURRENCY;
  const enrichmentLimited = rawChanges.length > enrichmentLimit;

  const changes = enrichmentLimited
    ? rawChanges.map(toManualReviewChange)
    : await mapWithConcurrency(
        rawChanges,
        enrichmentConcurrency,
        (change) => enrichChange(change, options.includeHackerNews ?? false),
      );

  const { redCount, yellowCount, manualReviewCount } = summarizeChanges(changes);

  const projectName =
    options.projectName ??
    newLockfile.packages?.[""]?.name ??
    newLockfile.name ??
    "project";

  let existingVulnerabilities: AnalysisResult["existingVulnerabilities"] = [];
  if (options.auditExisting) {
    const excludeLockPaths =
      options.excludeLockPaths ?? new Set(changes.map((change) => change.lockPath));
    existingVulnerabilities = await auditExistingVulnerabilities(newLockfile, {
      projectName,
      excludeLockPaths,
      concurrency: options.auditConcurrency,
    });
  }

  return {
    projectName,
    changes,
    changedCount: changes.length,
    redCount,
    yellowCount,
    manualReviewCount,
    enrichmentLimited,
    enrichmentLimit,
    existingVulnerabilities,
    existingRedCount: existingVulnerabilities.length,
    auditedExisting: options.auditExisting ?? false,
  };
}
