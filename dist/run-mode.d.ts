export declare function hasExplicitLockfilePaths(oldLockfilePath?: string, newLockfilePath?: string): boolean;
export declare function resolveAuditExisting(requested: boolean, eventName: string | undefined, explicitLockfilePaths: boolean): {
    enabled: boolean;
    manualAuditOnly: boolean;
    ignoredReason?: string;
};
//# sourceMappingURL=run-mode.d.ts.map