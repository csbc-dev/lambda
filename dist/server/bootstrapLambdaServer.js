import { LambdaCore } from "../core/LambdaCore.js";
import { AwsLambdaProvider } from "../providers/AwsLambdaProvider.js";
export function bootstrapLambdaServer(options = {}) {
    const provider = options.provider ?? new AwsLambdaProvider(options.providerOptions);
    const core = new LambdaCore(options.target, provider);
    if (options.pinPolicy) {
        core.setPinPolicy(options.pinPolicy);
    }
    return core;
}
//# sourceMappingURL=bootstrapLambdaServer.js.map