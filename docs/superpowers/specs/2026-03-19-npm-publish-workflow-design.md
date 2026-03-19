# GitHub Action: Auto-publish ngx-aur-mat-table to npm

## Summary

GitHub Action workflow that automatically publishes `ngx-aur-mat-table` to npm when the version in `projects/ngx-aur-mat-table/package.json` changes on the `master` branch.

## Trigger

- `push` to `master`
- Path filter: `projects/ngx-aur-mat-table/package.json` — workflow only runs when this file is modified

## Version Change Detection

Checkout with `fetch-depth: 2` to access the previous commit. Compare `version` field between `HEAD~1` and `HEAD` using `git show`. If versions are identical, the workflow exits early.

## Workflow Steps

1. **Checkout** — `actions/checkout@v4` with `fetch-depth: 2`
2. **Check version change** — extract version from current and previous commit; skip remaining steps if unchanged
3. **Setup Node 20** — `actions/setup-node@v4` with `registry-url: https://registry.npmjs.org`
4. **Install dependencies** — `npm ci`
5. **Run tests** — `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
6. **Build library** — `npx ng build ngx-aur-mat-table`
7. **Publish** — `npm publish` from `dist/ngx-aur-mat-table` with `NODE_AUTH_TOKEN` from secret `NPM_TOKEN`

## NPM Token Setup Instructions

### Step 1: Create an npm Access Token

1. Go to https://www.npmjs.com and log in to your account
2. Click your avatar (top right) -> **Access Tokens**
3. Click **Generate New Token** -> **Granular Access Token**
4. Fill in the form:
   - **Token name**: `github-actions-ngx-aur-mat-table` (or any descriptive name)
   - **Expiration**: choose your preference (recommended: 1 year, with a reminder to rotate)
   - **Packages and scopes**: select **Only select packages and scopes**, then add `ngx-aur-mat-table`
   - **Permissions**: **Read and write**
5. Click **Generate token**
6. **Copy the token immediately** — it will not be shown again

### Step 2: Add the Token to GitHub Repository Secrets

1. Go to your GitHub repository: `https://github.com/<your-username>/ngx-aur-mat-table-libs`
2. Navigate to **Settings** -> **Secrets and variables** -> **Actions**
3. Click **New repository secret**
4. Fill in:
   - **Name**: `NPM_TOKEN`
   - **Secret**: paste the token from Step 1
5. Click **Add secret**

### Verification

After setup, push a commit to `master` that changes the version in `projects/ngx-aur-mat-table/package.json`. Go to the **Actions** tab in your GitHub repository to verify the workflow runs and publishes successfully.

## Security Notes

- The `NPM_TOKEN` secret is never exposed in logs — GitHub masks it automatically
- The token has minimal scope (only `ngx-aur-mat-table` package, read+write)
- Consider rotating the token annually

## File Location

`.github/workflows/publish-npm.yml`
