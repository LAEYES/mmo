# FreedomArena / RPGQG Web Build

## CI status

The Web build workflow is configured in `.github/workflows/web-build.yml`.

The last observed GitHub Actions run tested commit `7ddb9131d49b6aaf385c65a92b26c4f7a633af50` and failed during `setup-node`, before dependency installation.

The CI workflow was subsequently corrected in commit `8c92e7d90b472625c646121ba60631368727c0dd`, removing the missing lockfile cache dependency and using `npm install --no-package-lock`.

No GitHub Actions run for `8c92e7d` was observed at the time this status file was created, so the build is not marked as passing.

## Local fallback

The project can be built from `web/` with:

```bash
npm install --no-package-lock
npm run build
```
