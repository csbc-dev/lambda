import type { LambdaError } from "./types.js";
export declare function toLambdaError(error: unknown, code?: string): LambdaError;
export declare function raiseError(target: EventTarget, eventName: string, error: unknown, code?: string): LambdaError;
//# sourceMappingURL=raiseError.d.ts.map