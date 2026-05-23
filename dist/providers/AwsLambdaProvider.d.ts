import type { AwsLambdaProviderOptions, ILambdaProvider, LambdaInvokeOptions, LambdaInvokeResponse, LambdaStreamObserver } from "../types.js";
export declare class AwsLambdaProvider implements ILambdaProvider {
    #private;
    constructor(options?: AwsLambdaProviderOptions);
    invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse>;
    invokeStream(options: LambdaInvokeOptions, observer: LambdaStreamObserver): Promise<LambdaInvokeResponse>;
}
//# sourceMappingURL=AwsLambdaProvider.d.ts.map