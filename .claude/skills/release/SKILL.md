---
name: release
description: Release procedure for the @csbc-dev/lambda npm package. Use this skill when the user asks to release, publish, ship, cut a version, bump the version, or prepare a release. The actual `npm publish` step is performed manually by the user - Claude must not run it.
---

# Release procedure for `@csbc-dev/lambda`

This skill walks the assistant through the steps required to prepare a release of the `@csbc-dev/lambda` package. The assistant prepares everything up to, but not including, the publish step. `npm publish` is run manually by the user.

This repository is currently still in the scaffolding phase, so the first responsibility of the skill is to verify that a publishable package actually exists. If the package manifest, build, and test surfaces are missing, stop and report that the repository is not release-ready yet.

---

## Important constraints

- **Never run `npm publish`.** The user performs publishing manually outside Claude. If the user asks Claude to publish, refuse and remind them this is a manual step.
- **Never run `npm version <bump>` without explicit user approval** because it creates a commit and a git tag.
- **Never push tags or commits to origin** without explicit user approval.
- **Do not skip git hooks** unless the user explicitly asks for it.
- All preparation must happen on a clean working tree. If the tree is dirty, ask the user how to proceed before continuing.

---

## Stage 0: release-readiness gate

Before attempting release work, verify that the repository contains all of the following:

1. `package.json` with a package name of `@csbc-dev/lambda`
2. A build script (`npm run build`)
3. A test surface (`npm test` at minimum)
4. A declared package artifact surface (`files`, `exports`, or equivalent)
5. Source files that correspond to the package being released

If any of these are missing, stop and report:

> `@csbc-dev/lambda` is not release-ready yet. The repository still needs package scaffolding before a version can be prepared.

Do not invent missing release steps for a repository that has not been scaffolded.

---

## Preflight checks

Once the package exists, run these in parallel and report the results to the user:

1. `git status` - confirm the working tree is clean and the branch is `main` or the branch named by the user
2. `git log --oneline -10` - show what is going into the release
3. Read `package.json` - note the current `version`
4. `npm test` - the test suite must pass
5. `npm run build` - the package must build successfully
6. Verify there are no local-path dependencies in `package.json` `dependencies`

If any check fails, stop and report. Do not attempt fixes unless the user asks.

---

## Local-path dependency check

Before any release-prep step, inspect `package.json` `dependencies` for values starting with:

- `file:`
- `link:`
- `portal:`
- `./`
- `../`

If you find any of them, stop and surface the dependency as a blocker. `npm publish` will reject packages that still depend on local file paths, and downstream installs would not be reproducible.

Once the user replaces local-path dependencies with registry-resolvable semver ranges, re-run `npm install`, `npm test`, and `npm run build` before continuing.

---

## Version bump

Confirm the next version with the user before bumping. Follow semver:

- **patch** - bug fixes only, no public API changes
- **minor** - backwards-compatible feature additions
- **major** - breaking changes

For this package, the following count as breaking once implementation exists:

- Changes to the `wcBindable` property, input, or command names on `LambdaCore`
- Changes to the custom element attribute or property contract
- Changes to exported public types such as invocation options or normalized result types
- Changes to the remote wire protocol or error contract

Prefer editing the `version` field directly in `package.json` rather than running `npm version`, unless the user explicitly wants the automatic commit-and-tag behavior.

---

## Build verification

After the version bump:

1. Run `npm run build` from a clean state
2. Sanity-check that the built artifact referenced by `package.json` actually exists in `dist/`
3. If the package exports browser auto-entry files from `src/auto/`, verify those files are up to date
4. Run `npm pack --dry-run` and inspect the tarball contents against the `files` field

If the package later gains multiple entry points such as `./server` or `./auto/remoteEnv`, verify each exported file is present in the packed artifact.

---

## Documentation

- Update any version reference in `README.md` or `CLAUDE.md` if they cite a specific released version
- If the public API changed, verify the README reflects the current bindable surface and usage contract before release
- If the repository has a changelog, add an entry. If it does not, ask the user whether to start one rather than creating it unprompted.

---

## Commit and tag (with user approval)

When the user approves the prepared changes, propose a single commit:

```text
chore(release): v<new-version>
```

Then propose creating an annotated tag `v<new-version>`. Run `git commit` and `git tag` only after the user approves. Do not push.

---

## Hand-off for manual publish

After the commit and tag are created locally, hand off to the user with a checklist they will run manually:

```bash
# user runs these manually - Claude does not execute them
git push origin main
git push origin v<new-version>
npm publish --access public
```

Use `--access public` because `@csbc-dev/lambda` is a scoped package. Remind the user to verify the published version on npm after publishing.

---

## If something goes wrong after publish

If the user reports a problem after running `npm publish`:

- Do not suggest `npm unpublish` for a stable version as the first response
- Recommend `npm deprecate @csbc-dev/lambda@<bad-version> "<message>"` and then preparing a new patch release
- If needed, mention `npm dist-tag` as a manual recovery mechanism for the `latest` tag