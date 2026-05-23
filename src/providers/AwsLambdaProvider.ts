import type { ILambdaProvider, LambdaInvokeOptions, LambdaInvokeResponse } from "../types.js";

export class AwsLambdaProvider implements ILambdaProvider {
  async invoke(_options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    throw new Error("AwsLambdaProvider.invoke is not implemented in the scaffold");
  }
}