import type { LambdaCore } from "../core/LambdaCore.js";
export type LambdaRemoteHandler = (request: Request) => Promise<Response>;
export declare function createLambdaRemoteHandler(core: LambdaCore): LambdaRemoteHandler;
//# sourceMappingURL=createLambdaRemoteHandler.d.ts.map