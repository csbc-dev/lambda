import { getConfig } from "./config.js";
import { LambdaInvoke } from "./components/LambdaInvoke.js";
import { LambdaStream } from "./components/LambdaStream.js";

export function registerComponents(): void {
  const { tagNames } = getConfig();

  if (!customElements.get(tagNames.lambdaInvoke)) {
    customElements.define(tagNames.lambdaInvoke, LambdaInvoke);
  }

  if (!customElements.get(tagNames.lambdaStream)) {
    customElements.define(tagNames.lambdaStream, LambdaStream);
  }
}