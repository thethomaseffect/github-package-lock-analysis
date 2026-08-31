import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createEmptyManifest, parseReportManifest, } from "../report-manifest.js";
export function isGitAncestor(ancestor, descendant, workspace) {
    try {
        execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
            cwd: workspace,
            stdio: "pipe",
        });
        return true;
    }
    catch {
        return false;
    }
}
export function readReportManifest(manifestPath) {
    if (!existsSync(manifestPath)) {
        return null;
    }
    try {
        return parseReportManifest(readFileSync(manifestPath, "utf8"));
    }
    catch {
        return createEmptyManifest();
    }
}
//# sourceMappingURL=manifest.js.map