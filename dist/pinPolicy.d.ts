import type { LambdaPinPolicy } from "./types.js";
export declare function clonePinPolicy(policy?: LambdaPinPolicy | null): LambdaPinPolicy;
export declare function resolveFunctionName(requestedValue: string, policy: LambdaPinPolicy): string;
export declare function resolveQualifier(requestedValue: string | null, policy: LambdaPinPolicy): string | null;
//# sourceMappingURL=pinPolicy.d.ts.map