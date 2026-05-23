export type LambdaMode = "buffered" | "stream";
export interface LambdaError {
    code: string;
    message: string;
    cause?: unknown;
}
export type LambdaErrorCode = "LAMBDA_ERROR" | "LAMBDA_ABORTED" | "LAMBDA_CONFIG_ERROR" | "LAMBDA_INPUT_ERROR" | "LAMBDA_PARENT_REQUIRED" | "LAMBDA_POLICY_DENIED" | "LAMBDA_PROVIDER_ERROR" | "LAMBDA_INVOKE_FAILED";
export interface LambdaInvokeOptions {
    functionName: string;
    payload: unknown;
    qualifier?: string | null;
    clientContext?: string | null;
    logType?: "None" | "Tail";
    mode?: LambdaMode;
}
export interface LambdaInvokeResponse {
    result: unknown;
    statusCode: number | null;
    functionError: string | null;
    executedVersion: string | null;
    requestId: string | null;
    logResult: string | null;
    chunks?: string[];
    text?: string;
    firstByteLatency?: number | null;
}
export type LambdaInvoker = (options: LambdaInvokeOptions) => Promise<LambdaInvokeResponse>;
export interface LambdaPinPolicy {
    pinnedFunctionName?: string;
    pinnedQualifier?: string | null;
    allowFunctionNameOverride?: boolean;
    allowQualifierOverride?: boolean;
    allowedFunctionNames?: readonly string[];
    allowedQualifiers?: readonly string[];
}
export interface AwsLambdaProviderOptions {
    invoker: LambdaInvoker;
    policy?: LambdaPinPolicy;
}
export interface ILambdaProvider {
    invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse>;
}
export interface ITagNames {
    lambdaInvoke: string;
    lambdaStream: string;
}
export interface IRemoteConfig {
    enableRemote: boolean;
    remoteSettingType: "config" | "env";
    remoteCoreUrl: string;
}
export interface IConfig {
    tagNames: ITagNames;
    remote: IRemoteConfig;
}
export interface IWritableTagNames extends Partial<ITagNames> {
}
export interface IWritableRemoteConfig extends Partial<IRemoteConfig> {
}
export interface IWritableConfig {
    tagNames?: IWritableTagNames;
    remote?: IWritableRemoteConfig;
}
export interface LambdaInvokeValues {
    invoking: boolean;
    result: unknown;
    error: LambdaError | null;
    duration: number | null;
    requestId: string | null;
    statusCode: number | null;
    functionError: string | null;
    executedVersion: string | null;
    logResult: string | null;
    mode: LambdaMode;
}
export interface LambdaStreamValues {
    streaming: boolean;
    chunks: string[];
    text: string;
    done: boolean;
    firstByteLatency: number | null;
    streamError: LambdaError | null;
}
//# sourceMappingURL=types.d.ts.map