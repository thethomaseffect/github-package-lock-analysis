import type { PackageChange } from "../../lockfile/types.js";
import { formatBreadcrumb } from "../../lockfile/parse.js";
import { MANUAL_REVIEW_TOOLTIP } from "../../manual-review.js";

interface PackageRowProps {
  change: PackageChange;
}

export function PackageRow({ change }: PackageRowProps) {
  const levelLabel = change.manualReview
    ? "❓ Manual review"
    : change.securityLevel === "red"
      ? "Known CVE"
      : "Updated";
  const versionLabel =
    change.oldVersion === null
      ? `(added) → ${change.newVersion}`
      : `${change.oldVersion} → ${change.newVersion}`;

  return (
    <article className={`package-row ${change.securityLevel}`}>
      <div className="row-header">
        <span
          className={`badge ${change.securityLevel}${change.manualReview ? " manual-review" : ""}`}
          title={change.manualReview ? MANUAL_REVIEW_TOOLTIP : undefined}
        >
          {levelLabel}
        </span>
        <h2>{formatBreadcrumb(change.breadcrumb)}</h2>
      </div>
      <p className="version">{versionLabel}</p>
      <p className="meta">
        <strong>CVEs:</strong>{" "}
        {change.manualReview ? (
          <span className="muted">Not checked — use npm link below</span>
        ) : change.cves.length === 0 ? (
          <span className="muted">None found</span>
        ) : (
          change.cves.map((cve, index) => (
            <span key={cve.id}>
              {index > 0 ? ", " : null}
              <a href={cve.url} target="_blank" rel="noopener noreferrer">
                {cve.id}
              </a>
            </span>
          ))
        )}
      </p>
      <p className="meta link-row">
        <strong>Links:</strong>{" "}
        {change.references.links.map((link, index) => (
          <span key={link.url}>
            {index > 0 ? " | " : null}
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </span>
        ))}
      </p>
    </article>
  );
}
