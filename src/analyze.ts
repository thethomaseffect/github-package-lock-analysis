import { resolveChangelogLink } from "./enrichment/changelog.js";
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

async function enrichChange(
  change: RawPackageChange,
  includeHackerNews: boolean,
): Promise<PackageChange> {
  const [cves, hackerNews, changelog] = await Promise.all([
    lookupCves(change.name, change.newVersion),
    includeHackerNews
      ? lookupHackerNews(change.name, change.newVersion)
      : Promise.resolve([]),
    resolveChangelogLink(change.name, change.newVersion),
  ]);

  const securityLevel: SecurityLevel = cves.length > 0 ? "red" : "yellow";

  return {
    ...change,
    securityLevel,
    cves,
    hackerNews,
    changelog,
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

  const changes = await Promise.all(
    rawChanges.map((change) => enrichChange(change, options.includeHackerNews ?? false)),
  );

  const redCount = changes.filter((change) => change.securityLevel === "red").length;
  const yellowCount = changes.length - redCount;

  const projectName =
    options.projectName ??
    newLockfile.packages?.[""]?.name ??
    newLockfile.name ??
    "project";

  return {
    projectName,
    changes,
    changedCount: changes.length,
    redCount,
    yellowCount,
  };
}
