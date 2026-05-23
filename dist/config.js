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
export function getConfig() {
    return Object.freeze(structuredClone(config));
}
export function setConfig(next) {
    if (next.tagNames) {
        config.tagNames = { ...config.tagNames, ...next.tagNames };
    }
    if (next.remote) {
        config.remote = { ...config.remote, ...next.remote };
    }
    return getConfig();
}
export function resetConfig() {
    config.tagNames.lambdaInvoke = "lambda-invoke";
    config.tagNames.lambdaStream = "lambda-stream";
    config.remote.enableRemote = false;
    config.remote.remoteSettingType = "config";
    config.remote.remoteCoreUrl = "";
    return getConfig();
}
export function getRemoteCoreUrl() {
    if (config.remote.remoteSettingType === "env") {
        // Resolution order:
        // 1. process.env.LAMBDA_REMOTE_CORE_URL — Node.js / bundler build-time replacement
        // 2. globalThis.LAMBDA_REMOTE_CORE_URL  — browser global (set before script loads)
        const fromProcess = globalThis.process?.env?.LAMBDA_REMOTE_CORE_URL;
        const fromGlobal = Reflect.get(globalThis, "LAMBDA_REMOTE_CORE_URL");
        if (typeof fromProcess === "string")
            return fromProcess;
        return typeof fromGlobal === "string" ? fromGlobal : "";
    }
    return config.remote.remoteCoreUrl;
}
//# sourceMappingURL=config.js.map