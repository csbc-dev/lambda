import type { ILambdaProvider, LambdaError, LambdaInvokeOptions, LambdaInvokeResponse, LambdaMode, LambdaPinPolicy, LambdaStreamObserver } from "../types.js";
export declare class LambdaCore extends EventTarget {
    #private;
    static wcBindable: {
        readonly protocol: "wc-bindable";
        readonly version: 1;
        readonly properties: readonly [{
            readonly name: "invoking";
            readonly event: "lambda-invoke:invoking-changed";
        }, {
            readonly name: "result";
            readonly event: "lambda-invoke:result-changed";
        }, {
            readonly name: "error";
            readonly event: "lambda-invoke:error";
        }, {
            readonly name: "duration";
            readonly event: "lambda-invoke:duration-changed";
        }, {
            readonly name: "requestId";
            readonly event: "lambda-invoke:request-id-changed";
        }, {
            readonly name: "statusCode";
            readonly event: "lambda-invoke:status-code-changed";
        }, {
            readonly name: "functionError";
            readonly event: "lambda-invoke:function-error-changed";
        }, {
            readonly name: "executedVersion";
            readonly event: "lambda-invoke:executed-version-changed";
        }, {
            readonly name: "logResult";
            readonly event: "lambda-invoke:log-result-changed";
        }, {
            readonly name: "mode";
            readonly event: "lambda-invoke:mode-changed";
        }];
        readonly inputs: readonly [{
            readonly name: "functionName";
        }, {
            readonly name: "payload";
        }, {
            readonly name: "qualifier";
        }, {
            readonly name: "clientContext";
        }, {
            readonly name: "logType";
        }, {
            readonly name: "mode";
        }];
        readonly commands: readonly [{
            readonly name: "invoke";
            readonly async: true;
        }, {
            readonly name: "abort";
        }, {
            readonly name: "reset";
        }];
    };
    constructor(target?: EventTarget, provider?: ILambdaProvider | null);
    get functionName(): string;
    set functionName(value: string);
    get payload(): unknown;
    set payload(value: unknown);
    get qualifier(): string | null;
    set qualifier(value: string | null);
    get clientContext(): string | null;
    set clientContext(value: string | null);
    get logType(): "None" | "Tail";
    set logType(value: "None" | "Tail");
    get mode(): LambdaMode;
    set mode(value: LambdaMode);
    get invoking(): boolean;
    get result(): unknown;
    get error(): LambdaError | null;
    get duration(): number | null;
    get requestId(): string | null;
    get statusCode(): number | null;
    get functionError(): string | null;
    get executedVersion(): string | null;
    get logResult(): string | null;
    get streaming(): boolean;
    get chunks(): string[];
    get text(): string;
    get done(): boolean;
    get firstByteLatency(): number | null;
    get streamError(): LambdaError | null;
    get pinPolicy(): Readonly<LambdaPinPolicy>;
    get hasProvider(): boolean;
    setProvider(provider: ILambdaProvider | null): void;
    setPinPolicy(policy: LambdaPinPolicy | null): void;
    /**
     * Run an invocation. Resolves to the response on success, or `undefined` when
     * no result is surfaced — the reason is reflected on the `error` property:
     * policy denial (`LAMBDA_POLICY_DENIED`), misconfiguration (`LAMBDA_CONFIG_ERROR`),
     * transport/Lambda failure (`LAMBDA_INVOKE_FAILED`), or abort (`LAMBDA_ABORTED`).
     * A call superseded by a newer invoke()/abort()/reset() also resolves
     * `undefined` and never overwrites the newer invocation's state. Never rejects.
     */
    invoke(options?: Partial<LambdaInvokeOptions>, observer?: LambdaStreamObserver): Promise<LambdaInvokeResponse | undefined>;
    abort(): void;
    reset(): void;
}
//# sourceMappingURL=LambdaCore.d.ts.map