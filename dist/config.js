const config = {
    tagNames: {
        lambdaInvoke: "lambda-invoke",
        lambdaStream: "lambda-stream",
    },
    remote: {
        enableRemote: false,
        remoteSettingType: "config",
        remoteCoreUrl: "",
    },
};
// Cached deeply-frozen snapshot. getConfig() is called on every element connect
// (LambdaStream/LambdaInvoke) but the config changes rarely (setConfig/
// resetConfig), so we clone+freeze once per mutation instead of per call. The
// returned snapshot is immutable, so handing the same frozen reference to many
// callers is safe; the cache is invalidated whenever the config is mutated.
let snapshot = null;
function invalidateSnapshot() {
    snapshot = null;
}
export function getConfig() {
    return (snapshot ?? (snapshot = Object.freeze(structuredClone(config))));
}
export function setConfig(next) {
    if (next.tagNames) {
        config.tagNames = { ...config.tagNames, ...next.tagNames };
    }
    if (next.remote) {
        config.remote = { ...config.remote, ...next.remote };
    }
    invalidateSnapshot();
    return getConfig();
}
export function resetConfig() {
    config.tagNames.lambdaInvoke = "lambda-invoke";
    config.tagNames.lambdaStream = "lambda-stream";
    config.remote.enableRemote = false;
    config.remote.remoteSettingType = "config";
    config.remote.remoteCoreUrl = "";
    invalidateSnapshot();
    return getConfig();
}
export function getRemoteCoreUrl() {
    if (config.remote.remoteSettingType === "env") {
        // Resolution order:
        // 1. process.env.LAMBDA_REMOTE_CORE_URL — Node.js / bundler build-time replacement
        // 2. globalThis.LAMBDA_REMOTE_CORE_URL  — browser global (set before script loads)
        //
        // An empty string is treated as "not set", not as a valid URL: a defined-but-
        // empty env var must not be reported as a usable Core URL. Returning "" here
        // would let `attachRemote(getRemoteCoreUrl())` construct a LambdaRemoteProvider
        // with an empty URL, which throws LAMBDA_CONFIG_ERROR. Callers treat "" as
        // "no env URL available" (see #attachEnvRemote's `if (url)` guard).
        const fromProcess = globalThis.process?.env?.LAMBDA_REMOTE_CORE_URL;
        if (typeof fromProcess === "string" && fromProcess !== "")
            return fromProcess;
        const fromGlobal = Reflect.get(globalThis, "LAMBDA_REMOTE_CORE_URL");
        return typeof fromGlobal === "string" ? fromGlobal : "";
    }
    return config.remote.remoteCoreUrl;
}
//# sourceMappingURL=config.js.map