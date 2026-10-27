# Releasing

Releases are fully automated by [release-please](https://github.com/googleapis/release-please). Never edit a `version` field, the manifest or a tag by hand.

## How it works

1. Every push to `main` runs `.github/workflows/release-please.yml`.
2. release-please reads the Conventional Commits since the last release and opens (or updates) a release pull request. It bumps the version in `package.json`, `apps/extension/package.json`, `apps/api/package.json` and `.release-please-manifest.json` together, and writes the `CHANGELOG.md` entry.
3. Merging that pull request makes the next run tag `vX.Y.Z` and create the GitHub release.
4. When a release is created, the `extension-zip` job checks out the tag, runs `pnpm --filter extension zip` and attaches `extension-X.Y.Z-chrome.zip` to the release. WXT reads the `version` of `apps/extension/package.json`, so the zip manifest carries the release version.

No container image is published: there is no deployment target yet.

## Versioning

- The manifest starts at `0.0.0` with `bump-minor-pre-major`: before `1.0.0`, `feat` bumps the minor and a breaking change also bumps the minor. The first release is `0.1.0`.
- `1.0.0` is kept for the commercial v1.
- `bootstrap-sha` points at the commit the refactor branched from, so the first changelog only lists the refactor. Older `v2026.*` tags are ignored.
- Changelog sections: `feat`, `fix`, `perf`, `refactor`, `docs`, `chore`.

## One-time setup

The workflow authenticates as a GitHub App, so the tags it creates and the release pull request trigger the other workflows (a `GITHUB_TOKEN` would not).

1. Create a GitHub App (or reuse one) with repository permissions **Contents**, **Pull requests** and **Issues** set to read and write, and install it on this repository.
2. Add two repository secrets under Settings > Secrets and variables > Actions:
   - `BOT_CLIENT_ID`: the App client ID.
   - `BOT_PRIVATE_KEY`: a private key generated for the App (full PEM content).
3. Push to `main`. Without these secrets the workflow fails at the "Generate GitHub App token" step.

## Building the zip locally

```bash
pnpm --filter extension zip
```

The zip lands in `apps/extension/.output/`.
