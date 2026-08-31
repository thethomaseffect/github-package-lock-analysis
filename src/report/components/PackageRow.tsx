import type { PackageChange } from "../../lockfile/types.js";
import { formatBreadcrumb } from "../../lockfile/parse.js";

interface PackageRowProps {
  change: PackageChange;
}

export function PackageRow({ change }: PackageRowProps) {
  const levelLabel = change.securityLevel === "red" ? "Known CVE" : "Updated";
  const versionLabel =
    change.oldVersion === null
      ? `(added) → ${change.newVersion}`
      : `${change.oldVersion} → ${change.newVersion}`;

  return (
    <article className={`package-row ${change.securityLevel}`}>
      <div className="row-header">
        <span className={`badge ${change.securityLevel}`}>{levelLabel}</span>
        <h2>{formatBreadcrumb(change.breadcrumb)}</h2>
      </div>
      <p className="version">{versionLabel}</p>
      <p className="meta">
        <strong>CVEs:</strong>{" "}
        {change.cves.length === 0 ? (
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
      <p className="meta">
        <a href={change.changelog.url} target="_blank" rel="noopener noreferrer">
          {change.changelog.label}
        </a>
      </p>
      {change.hackerNews.length > 0 ? (
        <ul className="hn-list">
          {change.hackerNews.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>{" "}
              <span className="muted">({item.date})</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
