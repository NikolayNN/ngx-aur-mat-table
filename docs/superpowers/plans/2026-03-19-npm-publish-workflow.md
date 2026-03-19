# npm Auto-Publish Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a GitHub Actions workflow that publishes `ngx-aur-mat-table` to npm when the version in `projects/ngx-aur-mat-table/package.json` changes on master.

**Architecture:** Single workflow file triggered on push to master with path filter. Compares current version against npm registry, runs tests, builds, copies LICENSE, publishes with provenance.

**Tech Stack:** GitHub Actions, Node 20, Angular CLI (ng-packagr), npm

**Spec:** `docs/superpowers/specs/2026-03-19-npm-publish-workflow-design.md`

---

## File Structure

- **Create:** `.github/workflows/publish-npm.yml` — the workflow

---

### Task 1: Create the publish workflow

**Files:**
- Create: `.github/workflows/publish-npm.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Publish to npm

on:
  push:
    branches:
      - master
    paths:
      - 'projects/ngx-aur-mat-table/package.json'

permissions:
  contents: read
  id-token: write

concurrency:
  group: npm-publish
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
          cache: npm

      - name: Check version change
        id: version
        run: |
          CURRENT=$(node -p "require('./projects/ngx-aur-mat-table/package.json').version")
          PUBLISHED=$(npm view ngx-aur-mat-table version 2>/dev/null || echo "0.0.0")
          echo "current=$CURRENT" >> "$GITHUB_OUTPUT"
          echo "published=$PUBLISHED" >> "$GITHUB_OUTPUT"
          if [ "$CURRENT" = "$PUBLISHED" ]; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
            echo "Version $CURRENT already published, skipping."
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
            echo "Version changed: $PUBLISHED -> $CURRENT"
          fi

      - name: Install dependencies
        if: steps.version.outputs.changed == 'true'
        run: npm ci

      - name: Run tests
        if: steps.version.outputs.changed == 'true'
        run: npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless

      - name: Build library
        if: steps.version.outputs.changed == 'true'
        run: npx ng build ngx-aur-mat-table --configuration production

      - name: Copy LICENSE
        if: steps.version.outputs.changed == 'true'
        run: cp LICENSE dist/ngx-aur-mat-table/

      - name: Publish to npm
        if: steps.version.outputs.changed == 'true'
        run: npm publish dist/ngx-aur-mat-table --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Validate YAML syntax**

Run: `npx yaml-lint .github/workflows/publish-npm.yml` or use `python -c "import yaml; yaml.safe_load(open('.github/workflows/publish-npm.yml'))"`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish-npm.yml
git commit -m "ci: add GitHub Actions workflow for npm auto-publish"
```

---

### Task 2: Ensure tests can run in CI

The library has no `*.spec.ts` files and `karma.conf.js` references `karma-jasmine-html-reporter` which is not in devDependencies. The test step will fail in CI.

**Files:**
- Modify: `projects/ngx-aur-mat-table/karma.conf.js` — remove `karma-jasmine-html-reporter` plugin and reporter
- Modify: root `package.json` — verify devDependencies

- [ ] **Step 1: Remove karma-jasmine-html-reporter from karma.conf.js**

In `projects/ngx-aur-mat-table/karma.conf.js`:
- Remove `require('karma-jasmine-html-reporter')` from the `plugins` array
- Remove `'kjhtml'` from the `reporters` array (keep only `'progress'`)
- Remove the `jasmineHtmlReporter` config block

Updated file:

```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {},
      clearContext: false
    },
    coverageReporter: {
      dir: require('path').join(__dirname, '../../coverage/ngx-aur-mat-table'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true
  });
};
```

- [ ] **Step 2: Verify build works locally**

Run: `npx ng build ngx-aur-mat-table --configuration production`
Expected: build succeeds, output in `dist/ngx-aur-mat-table/`

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/karma.conf.js
git commit -m "fix: remove missing karma-jasmine-html-reporter from karma config"
```
