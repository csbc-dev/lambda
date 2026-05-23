/**
 * Side-effect-only import that bootstraps lambda-invoke / lambda-stream and
 * enables env-driven remote mode (`remote.enableRemote` with
 * `remoteSettingType: "env"`). Each <lambda-invoke> auto-attaches a remote
 * provider from `process.env.LAMBDA_REMOTE_CORE_URL` or
 * `globalThis.LAMBDA_REMOTE_CORE_URL` on connect.
 *
 * Usage:
 *   import "@csbc-dev/lambda/auto/remoteEnv";
 */
export {};
