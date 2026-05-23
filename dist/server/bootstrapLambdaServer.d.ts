import { LambdaCore } from "../core/LambdaCore.js";
import type { AwsLambdaProviderOptions, ILambdaProvider, LambdaPinPolicy } from "../types.js";
export interface LambdaServerBootstrapOptions {
    provider?: ILambdaProvider;
    providerOptions?: AwsLambdaProviderOptions;
    pinPolicy?: LambdaPinPolicy;
    target?: EventTarget;
}
export declare function bootstrapLambdaServer(options?: LambdaServerBootstrapOptions): LambdaCore;
//# sourceMappingURL=bootstrapLambdaServer.d.ts.map