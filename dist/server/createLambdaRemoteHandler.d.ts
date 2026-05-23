import type { LambdaCore } from "../core/LambdaCore.js";
export type LambdaRemoteHandler = (request: Request) => Promise<Response>;
export type LambdaRemoteCoreSource = LambdaCore | ((request: Request) => LambdaCore | Promise<LambdaCore>);
export interface LambdaRemoteHandlerOptions {
    authenticate?: (request: Request) => boolean | Promise<boolean>;
    sharedCoreTimeoutMs?: number;
}
export declare function createLambdaRemoteHandler(coreSource: LambdaRemoteCoreSource, options?: LambdaRemoteHandlerOptions): LambdaRemoteHandler;
//# sourceMappingURL=createLambdaRemoteHandler.d.ts.map