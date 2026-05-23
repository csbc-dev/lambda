// Side-effect auto-registration entry. This is hand-written JS shipped verbatim
// (tsconfig excludes src/auto; package.json `files` includes src/auto), NOT a
// compiled artifact. It deliberately imports the BUILD output at `../../dist/
// index.js`: in the published package and on a CDN (e.g. esm.run) `src/auto/`
// and `dist/` sit side by side at the package root, so this relative path
// resolves. It therefore requires `npm run build` to have produced `dist/`
// first — `prepack` enforces that for publishing, and the examples document
// "build the workspace first". Do not switch this to a bare self-reference: the
// CDN path relies on the relative `dist/` resolution.
import { bootstrapLambda } from "../../dist/index.js";

bootstrapLambda();
