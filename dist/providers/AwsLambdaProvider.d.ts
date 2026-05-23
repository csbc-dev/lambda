import type { AwsLambdaProviderOptions, ILambdaProvider, LambdaInvokeOptions, LambdaInvokeResponse } from "../types.js";
export declare class AwsLambdaProvider implements ILambdaProvider {
    #private;
    constructor(options: AwsLambdaProviderOptions);
    invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse>;
}
//# sourceMappingURL=AwsLambdaProvider.d.ts.map