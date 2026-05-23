import type { IConfig, IWritableConfig } from "./types.js";

const config: IConfig = {
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

export function getConfig(): Readonly<IConfig> {
  return Object.freeze(structuredClone(config));
}

export function setConfig(next: IWritableConfig): Readonly<IConfig> {
  if (next.tagNames) {
    config.tagNames = { ...config.tagNames, ...next.tagNames };
  }

  if (next.remote) {
    config.remote = { ...config.remote, ...next.remote };
  }

  return getConfig();
}

export function resetConfig(): Readonly<IConfig> {
  config.tagNames.lambdaInvoke = "lambda-invoke";
  config.tagNames.lambdaStream = "lambda-stream";
  config.remote.enableRemote = false;
  config.remote.remoteSettingType = "config";
  config.remote.remoteCoreUrl = "";
  return getConfig();
}

export function getRemoteCoreUrl(): string {
  if (config.remote.remoteSettingType === "env") {
    const fromGlobal = Reflect.get(globalThis as object, "LAMBDA_REMOTE_CORE_URL");
    return typeof fromGlobal === "string" ? fromGlobal : "";
  }

  return config.remote.remoteCoreUrl;
}