import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatBreadcrumb } from "../../lockfile/parse.js";
import { MANUAL_REVIEW_TOOLTIP } from "../../manual-review.js";
export function PackageRow({ change }) {
    const levelLabel = change.manualReview
        ? "❓ Manual review"
        : change.securityLevel === "red"
            ? "Known CVE"
            : "Updated";
    const versionLabel = change.oldVersion === null
        ? `(added) → ${change.newVersion}`
        : `${change.oldVersion} → ${change.newVersion}`;
    return (_jsxs("article", { className: `package-row ${change.securityLevel}`, children: [_jsxs("div", { className: "row-header", children: [_jsx("span", { className: `badge ${change.securityLevel}${change.manualReview ? " manual-review" : ""}`, title: change.manualReview ? MANUAL_REVIEW_TOOLTIP : undefined, children: levelLabel }), _jsx("h2", { children: formatBreadcrumb(change.breadcrumb) })] }), _jsx("p", { className: "version", children: versionLabel }), _jsxs("p", { className: "meta", children: [_jsx("strong", { children: "CVEs:" }), " ", change.manualReview ? (_jsx("span", { className: "muted", children: "Not checked \u2014 use npm link below" })) : change.cves.length === 0 ? (_jsx("span", { className: "muted", children: "None found" })) : (change.cves.map((cve, index) => (_jsxs("span", { children: [index > 0 ? ", " : null, _jsx("a", { href: cve.url, target: "_blank", rel: "noopener noreferrer", children: cve.id })] }, cve.id))))] }), _jsxs("p", { className: "meta link-row", children: [_jsx("strong", { children: "Links:" }), " ", change.references.links.map((link, index) => (_jsxs("span", { children: [index > 0 ? " | " : null, _jsx("a", { href: link.url, target: "_blank", rel: "noopener noreferrer", children: link.label })] }, link.url)))] })] }));
}
//# sourceMappingURL=PackageRow.js.map