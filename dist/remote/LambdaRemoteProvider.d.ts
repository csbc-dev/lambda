import type { ILambdaProvider, LambdaInvokeOptions, LambdaInvokeResponse, LambdaRemoteProviderOptions, LambdaStreamObserver } from "../types.js";
export declare class LambdaRemoteProvider implements ILambdaProvider {
    #private;
    constructor(options: LambdaRemoteProviderOptions);
    invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse>;
    invokeStream(options: LambdaInvokeOptions, observer: LambdaStreamObserver): Promise<LambdaInvokeResponse>;
}
//# sourceMappingURL=LambdaRemoteProvider.d.ts.map