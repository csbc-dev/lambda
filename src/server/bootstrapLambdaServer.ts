import { LambdaCore } from "../core/LambdaCore.js";
import { AwsLambdaProvider } from "../providers/AwsLambdaProvider.js";
import type { AwsLambdaProviderOptions, ILambdaProvider, LambdaPinPolicy } from "../types.js";

export interface LambdaServerBootstrapOptions {
  provider?: ILambdaProvider;
  providerOptions?: AwsLambdaProviderOptions;
  pinPolicy?: LambdaPinPolicy;
  target?: EventTarget;
}

export function bootstrapLambdaServer(options: LambdaServerBootstrapOptions = {}): LambdaCore {
  const provider = options.provider ?? new AwsLambdaProvider(options.providerOptions);
  const core = new LambdaCore(options.target, provider);

  if (options.pinPolicy) {
    core.setPinPolicy(options.pinPolicy);
  }

  return core;
}