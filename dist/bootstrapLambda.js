import { setConfig } from "./config.js";
import { registerComponents } from "./registerComponents.js";
export function bootstrapLambda(config) {
    if (config) {
        setConfig(config);
    }
    registerComponents();
}
//# sourceMappingURL=bootstrapLambda.js.map