import { LambdaCore } from "../core/LambdaCore.js";
import type { LambdaError, LambdaMode, LambdaInvokeResponse } from "../types.js";
export declare class LambdaInvoke extends HTMLElement {
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
        }, {
            readonly name: "streaming";
            readonly event: "lambda-invoke:streaming-changed";
        }, {
            readonly name: "chunks";
            readonly event: "lambda-invoke:chunks-changed";
        }, {
            readonly name: "text";
            readonly event: "lambda-invoke:text-changed";
        }, {
            readonly name: "done";
            readonly event: "lambda-invoke:done-changed";
        }, {
            readonly name: "firstByteLatency";
            readonly event: "lambda-invoke:first-byte-latency-changed";
        }, {
            readonly name: "streamError";
            readonly event: "lambda-invoke:stream-error";
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
    invoke(): Promise<LambdaInvokeResponse | undefined>;
    abort(): void;
    reset(): void;
    get core(): LambdaCore;
}
//# sourceMappingURL=LambdaInvoke.d.ts.map