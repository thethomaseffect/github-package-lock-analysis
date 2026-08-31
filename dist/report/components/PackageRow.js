import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatBreadcrumb } from "../../lockfile/parse.js";
export function PackageRow({ change }) {
    const levelLabel = change.securityLevel === "red" ? "Known CVE" : "Updated";
    const versionLabel = change.oldVersion === null
        ? `(added) → ${change.newVersion}`
        : `${change.oldVersion} → ${change.newVersion}`;
    return (_jsxs("article", { className: `package-row ${change.securityLevel}`, children: [_jsxs("div", { className: "row-header", children: [_jsx("span", { className: `badge ${change.securityLevel}`, children: levelLabel }), _jsx("h2", { children: formatBreadcrumb(change.breadcrumb) })] }), _jsx("p", { className: "version", children: versionLabel }), _jsxs("p", { className: "meta", children: [_jsx("strong", { children: "CVEs:" }), " ", change.cves.length === 0 ? (_jsx("span", { className: "muted", children: "None found" })) : (change.cves.map((cve, index) => (_jsxs("span", { children: [index > 0 ? ", " : null, _jsx("a", { href: cve.url, target: "_blank", rel: "noopener noreferrer", children: cve.id })] }, cve.id))))] }), _jsx("p", { className: "meta", children: _jsx("a", { href: change.changelog.url, target: "_blank", rel: "noopener noreferrer", children: change.changelog.label }) }), change.hackerNews.length > 0 ? (_jsx("ul", { className: "hn-list", children: change.hackerNews.map((item) => (_jsxs("li", { children: [_jsx("a", { href: item.url, target: "_blank", rel: "noopener noreferrer", children: item.title }), " ", _jsxs("span", { className: "muted", children: ["(", item.date, ")"] })] }, item.url))) })) : null] }));
}
//# sourceMappingURL=PackageRow.js.map