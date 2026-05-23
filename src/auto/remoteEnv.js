// Side-effect auto-registration entry with env-driven remote mode. Hand-written
// JS shipped verbatim (not compiled). It imports the BUILD output at
// `../../dist/index.js`, which resolves because `src/auto/` and `dist/` sit side
// by side at the package root in the published package and on a CDN. Requires
// `npm run build` first (enforced by `prepack`; documented in the examples). See
// src/auto/auto.js for the full rationale; do not switch to a bare self-reference.
import { bootstrapLambda } from "../../dist/index.js";

bootstrapLambda({
  remote: { enableRemote: true, remoteSettingType: "env" },
});
