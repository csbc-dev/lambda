import { LambdaCore } from "../core/LambdaCore.js";
import type { ILambdaProvider, LambdaError, LambdaMode, LambdaInvokeResponse, LambdaPinPolicy } from "../types.js";
declare const HTMLElementBase: typeof HTMLElement;
export declare class LambdaInvoke extends HTMLElementBase {
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
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
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
    get remoteUrl(): string;
    set remoteUrl(value: string);
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
    /**
     * Start an invocation against the attached (typically remote) Core.
     *
     * Resolves to the {@link LambdaInvokeResponse} on success. Resolves to
     * `undefined` (it never rejects) when the invocation does not produce a
     * surfaced result, in which case the failure is reflected on the bindable
     * `error` property:
     * - input/policy rejection (`functionName`/`qualifier` denied by pin policy) — `error.code === "LAMBDA_POLICY_DENIED"`
     * - no provider attached or missing `functionName` — `error.code === "LAMBDA_CONFIG_ERROR"`
     * - transport/provider/Lambda failure — `error.code === "LAMBDA_INVOKE_FAILED"`
     * - aborted, or superseded by a newer invoke()/abort()/reset() before completing — resolves `undefined`; an aborted call sets `error.code === "LAMBDA_ABORTED"`, a superseded call leaves the newer invocation's state intact
     *
     * Callers must not assume a defined return value implies success-only flow;
     * read `error`/`result` for authoritative state.
     */
    invoke(): Promise<LambdaInvokeResponse | undefined>;
    setProvider(provider: ILambdaProvider | null): void;
    attachRemote(url?: string): void;
    setPinPolicy(policy: LambdaPinPolicy | null): void;
    abort(): void;
    reset(): void;
    get core(): LambdaCore;
}
export {};
//# sourceMappingURL=LambdaInvoke.d.ts.map