import { toLambdaError } from "../raiseError.js";
import type {
  AwsLambdaProviderOptions,
  ILambdaProvider,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaPinPolicy,
} from "../types.js";

export class AwsLambdaProvider implements ILambdaProvider {
  #invoker;
  #policy: LambdaPinPolicy;

  constructor(options: AwsLambdaProviderOptions) {
    this.#invoker = options.invoker;
    this.#policy = options.policy ?? {};
  }

  async invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    const normalizedOptions = this.#normalizeOptions(options);

    try {
      return await this.#invoker(normalizedOptions);
    } catch (error) {
      throw toLambdaError(error, "LAMBDA_PROVIDER_ERROR");
    }
  }

  #normalizeOptions(options: LambdaInvokeOptions): LambdaInvokeOptions {
    const functionName = this.#resolveFunctionName(options.functionName);
    const qualifier = this.#resolveQualifier(options.qualifier ?? null);

    return {
      ...options,
      functionName,
      qualifier,
    };
  }

  #resolveFunctionName(requestedValue: string): string {
    const {
      pinnedFunctionName,
      allowFunctionNameOverride = false,
      allowedFunctionNames,
    } = this.#policy;

    if (pinnedFunctionName) {
      if (allowFunctionNameOverride && requestedValue && requestedValue !== pinnedFunctionName) {
        throw new Error("Pinned functionName cannot be overridden");
      }

      return pinnedFunctionName;
    }

    if (!requestedValue) {
      throw toLambdaError(new Error("functionName is required"), "LAMBDA_INPUT_ERROR");
    }

    if (allowedFunctionNames && !allowedFunctionNames.includes(requestedValue)) {
      throw toLambdaError(new Error("functionName is not allowed by provider policy"), "LAMBDA_POLICY_DENIED");
    }

    return requestedValue;
  }

  #resolveQualifier(requestedValue: string | null): string | null {
    const {
      pinnedQualifier,
      allowQualifierOverride = false,
      allowedQualifiers,
    } = this.#policy;

    if (pinnedQualifier !== undefined) {
      if (allowQualifierOverride && requestedValue !== null && requestedValue !== pinnedQualifier) {
        throw toLambdaError(new Error("Pinned qualifier cannot be overridden"), "LAMBDA_POLICY_DENIED");
      }

      return pinnedQualifier;
    }

    if (requestedValue === null) {
      return null;
    }

    if (allowedQualifiers && !allowedQualifiers.includes(requestedValue)) {
      throw toLambdaError(new Error("qualifier is not allowed by provider policy"), "LAMBDA_POLICY_DENIED");
    }

    return requestedValue;
  }
}