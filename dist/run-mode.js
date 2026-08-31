export function hasExplicitLockfilePaths(oldLockfilePath, newLockfilePath) {
    return Boolean(oldLockfilePath?.trim() && newLockfilePath?.trim());
}
export function resolveAuditExisting(requested, eventName, explicitLockfilePaths) {
    if (!requested) {
        return { enabled: false, manualAuditOnly: false };
    }
    if (eventName !== "workflow_dispatch") {
        return {
            enabled: false,
            manualAuditOnly: false,
            ignoredReason: "audit-existing only runs on workflow_dispatch",
        };
    }
    if (explicitLockfilePaths) {
        return {
            enabled: false,
            manualAuditOnly: false,
            ignoredReason: "audit-existing is disabled when old/new lockfile paths are provided",
        };
    }
    return { enabled: true, manualAuditOnly: true };
}
//# sourceMappingURL=run-mode.js.map