import { setConfig } from "./config.js";
import { registerComponents } from "./registerComponents.js";
import type { IWritableConfig } from "./types.js";

export function bootstrapLambda(config?: IWritableConfig): void {
  if (config) {
    setConfig(config);
  }

  registerComponents();
}