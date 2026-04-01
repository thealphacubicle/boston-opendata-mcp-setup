# Contributing

## Making changes

1. Fork the repo and create a branch from `main`.
2. Make your changes in `setup.js` or `package.json`.
3. Open a pull request against `main` and get it merged.

## Releasing a new version

Releases are triggered by pushing a version tag. There is no CI token required — publishing uses OIDC-based trusted authentication.

### Steps

**1. Pull the latest main**

```bash
git checkout main
git pull

# After makiing your changes...
git commit -m "<commit message>"
```

**2. Bump the version**

Choose the bump type based on what changed:

```bash
npm version patch   # bug fixes (1.2.1 → 1.2.2)
npm version minor   # new features, backwards-compatible (1.2.1 → 1.3.0)
npm version major   # breaking changes (1.2.1 → 2.0.0)
```

This updates `package.json` and creates a local git tag (e.g. `v1.2.2`).

**3. Push the commit and tag**

```bash
git push origin main --follow-tags
```

The `--follow-tags` flag pushes the version tag alongside the commit. GitHub Actions picks up the `v*` tag and runs `npm publish --provenance` automatically — no token or manual publish step needed.

### Semver guidance


| Change type                           | Bump    |
| ------------------------------------- | ------- |
| Fix a bug, update a dependency        | `patch` |
| Add a new IDE/client target, new flag | `minor` |
| Change CLI interface, remove a target | `major` |


