import type { LambdaError, LambdaErrorCode } from "./types.js";
export declare function toLambdaError(error: unknown, code?: LambdaErrorCode): LambdaError;
export declare function raiseError(target: EventTarget, eventName: string, error: unknown, code?: LambdaErrorCode): LambdaError;
//# sourceMappingURL=raiseError.d.ts.map