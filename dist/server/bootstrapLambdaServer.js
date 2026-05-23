import { LambdaCore } from "../core/LambdaCore.js";
import { AwsLambdaProvider } from "../providers/AwsLambdaProvider.js";
export function bootstrapLambdaServer(options = {}) {
    // Defense in depth: apply the pin policy to BOTH the Core and the default
    // provider. The Core resolves functionName/qualifier/logType before calling
    // the provider, so in the normal path the provider re-resolves already-safe
    // values. But propagating the policy to the provider too keeps the second
    // layer real — a caller that invokes the AwsLambdaProvider directly (bypassing
    // the Core) still hits pinning/allowlist enforcement (SPEC 10.2). An explicit
    // `providerOptions.policy` wins; `pinPolicy` only fills the gap. This applies
    // only to the default provider; a caller-supplied `provider` owns its own policy.
    const provider = options.provider ?? new AwsLambdaProvider({
        ...options.providerOptions,
        policy: options.providerOptions?.policy ?? options.pinPolicy,
    });
    const core = new LambdaCore(options.target, provider);
    if (options.pinPolicy) {
        core.setPinPolicy(options.pinPolicy);
    }
    return core;
}
//# sourceMappingURL=bootstrapLambdaServer.js.map