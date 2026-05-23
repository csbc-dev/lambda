import type { LambdaError } from "../types.js";
declare const HTMLElementBase: typeof HTMLElement;
export declare class LambdaStream extends HTMLElementBase {
    #private;
    static wcBindable: {
        readonly protocol: "wc-bindable";
        readonly version: 1;
        readonly properties: readonly [{
            readonly name: "streaming";
            readonly event: "lambda-stream:streaming-changed";
        }, {
            readonly name: "chunks";
            readonly event: "lambda-stream:chunks-changed";
        }, {
            readonly name: "text";
            readonly event: "lambda-stream:text-changed";
        }, {
            readonly name: "done";
            readonly event: "lambda-stream:done-changed";
        }, {
            readonly name: "firstByteLatency";
            readonly event: "lambda-stream:first-byte-latency-changed";
        }, {
            readonly name: "streamError";
            readonly event: "lambda-stream:error";
        }];
    };
    connectedCallback(): void;
    disconnectedCallback(): void;
    get streaming(): boolean;
    get chunks(): string[];
    get text(): string;
    get done(): boolean;
    get firstByteLatency(): number | null;
    get streamError(): LambdaError | null;
}
export {};
//# sourceMappingURL=LambdaStream.d.ts.map