# Fix: pnpm Install Network Timeout in global-package-updater

## Context

The `global-package-updater` agent fails when running `pnpm install` on target repos due to:

- Transient `ECONNRESET` / `ENOTFOUND` errors from `registry.npmjs.org`
- A 120,000ms (2 min) command timeout that is too short for pnpm's built-in retry backoff (up to 1 min between retries)

FULL ERROR WE GOT:

[FAILED] global-package-updater (58m 22s)
Error: pnpm install failed: Command timed out after 120000 milliseconds: pnpm install --no-strict-peer-dependencies --no-frozen-lockfile

Progress: resolved 1, reused 0, downloaded 0, added 0
Progress: resolved 22, reused 21, downloaded 0, added 0
Progress: resolved 141, reused 81, downloaded 0, added 0
Progress: resolved 246, reused 210, downloaded 0, added 0
Progress: resolved 281, reused 231, downloaded 0, added 0
[WARN] GET https://registry.npmjs.org/@napi-rs%2Fwasm-runtime error (ECONNRESET). Will retry in 10 seconds. 2 retries left.
[WARN] GET https://registry.npmjs.org/@napi-rs%2Fwasm-runtime error (ENOTFOUND). Will retry in 1 minute. 1 retries left.
[ERR_PNPM_META_FETCH_FAIL] GET https://registry.npmjs.org/@napi-rs%2Fwasm-runtime: fetch failed
Progress: resolved 282, reused 231, downloaded 0, added 0
[WARN] GET https://registry.npmjs.org/tslib error (ENOTFOUND). Will retry in 10 seconds. 2 retries left.
[WARN] GET https://registry.npmjs.org/@tybys%2Fwasm-util error (ENOTFOUND). Will retry in 10 seconds. 2 retries left.
Progress: resolved 283, reused 233, downloaded 0, added 0
[WARN] GET https://registry.npmjs.org/tslib error (ENOTFOUND). Will retry in 1 minute. 1 retries left.
[WARN] GET https://registry.npmjs.org/@tybys%2Fwasm-util error (ENOTFOUND). Will retry in 1 minute. 1 retries left.
[ERR_PNPM_META_FETCH_FAIL] GET https://registry.npmjs.org/tslib: fetch failed
Progress: resolved 284, reused 233, downloaded 0, added 0
[ERR_PNPM_META_FETCH_FAIL] GET https://registry.npmjs.org/tslib: fetch failed
[ERR_PNPM_META_FETCH_FAIL] GET https://registry.npmjs.org/@tybys%2Fwasm-util: fetch failed
[WARN] GET https://registry.npmjs.org/tslib error (ENOTFOUND). Will retry in 10 seconds. 2 retries left.
Progress: resolved 285, reused 235, downloaded 0, added 0
[WARN] GET https://registry.npmjs.org/tslib error (ENOTFOUND). Will retry in 1 minute. 1 retries left.
Packages: +4 -4
++++----
Progress: resolved 285, reused 235, downloaded 0, added 1
Progress: resolved 285, reused 235, downloaded 0, added 4, done

devDependencies:

- @rolldown/binding-win32-x64-msvc 1.0.2

* @rolldown/binding-win32-x64-msvc 1.0.3

- eslint-plugin-prettier 5.5.5

* eslint-plugin-prettier 5.5.6

Added 3 entries to minimumReleaseAgeExclude in pnpm-workspace.yaml (loose mode allowed these immature versions):
@pkgr/core@0.3.6
eslint-plugin-prettier@5.5.6
synckit@0.11.13
Done in 58m 19.2s using pnpm v11.1.3

The install ultimately succeeds but takes ~58 minutes — far exceeding the timeout threshold.

---

## Tasks

### 1. Increase the `pnpm install` command timeout

**File:** wherever `pnpm install` is spawned (e.g. `src/updater.ts`, `src/runner.ts`, or similar)

**Change:** Find the `exec` / `spawn` call running `pnpm install` and increase `timeout` from `120000` to at least `600000` (10 minutes).

```ts
// Before
timeout: 120000;

// After
timeout: 10 * 60 * 1000; // 10 minutes
```

---

### 2. Add network resilience flags to the `pnpm install` command

**File:** same file as above

**Change:** Append the following flags to the `pnpm install` command string:

```
--fetch-retries 5
--fetch-retry-mintimeout 10000
--fetch-retry-maxtimeout 60000
--network-concurrency 4
```

Full command should become:

```
pnpm install --no-strict-peer-dependencies --no-frozen-lockfile --fetch-retries 5 --fetch-retry-mintimeout 10000 --fetch-retry-maxtimeout 60000 --network-concurrency 4
```

---

### 3. Wrap `pnpm install` in a retry loop

**File:** same file as above, or extract into a shared utility (e.g. `src/utils/pnpmInstall.ts`)

**Change:** Replace the raw `exec` call with a retry-aware wrapper:

```ts
async function pnpmInstallWithRetry(
  cwd: string,
  maxAttempts = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await exec(
        'pnpm install --no-strict-peer-dependencies --no-frozen-lockfile --fetch-retries 5 --fetch-retry-mintimeout 10000 --fetch-retry-maxtimeout 60000 --network-concurrency 4',
        { cwd, timeout: 10 * 60 * 1000 }
      );
      return;
    } catch (err: any) {
      const isNetworkError =
        err.message.includes('ECONNRESET') ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('META_FETCH_FAIL') ||
        err.message.includes('timed out');

      if (attempt === maxAttempts || !isNetworkError) throw err;

      console.warn(
        `[pnpm install] Attempt ${attempt} failed (network error). Retrying in ${attempt * 5}s...`
      );
      await new Promise((res) => setTimeout(res, attempt * 5000));
    }
  }
}
```

Replace all existing `pnpm install` `exec` calls with `pnpmInstallWithRetry(cwd)`.

---

### 4. Inject `.npmrc` into target repos before installing

**File:** the step in the agent that prepares a target repo before running install (e.g. `src/repo-setup.ts` or inline in the updater)

**Change:** Before calling `pnpm install`, write or merge the following into the target repo's `.npmrc`:

```ini
fetch-retries=5
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000
network-concurrency=4
```

Example code:

```ts
import { writeFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';

function ensureNpmrc(repoPath: string): void {
  const npmrcPath = path.join(repoPath, '.npmrc');
  const requiredSettings = [
    'fetch-retries=5',
    'fetch-retry-mintimeout=10000',
    'fetch-retry-maxtimeout=60000',
    'network-concurrency=4',
  ];

  const existing = existsSync(npmrcPath)
    ? readFileSync(npmrcPath, 'utf-8')
    : '';
  const toAppend = requiredSettings.filter(
    (line) => !existing.includes(line.split('=')[0])
  );

  if (toAppend.length > 0) {
    writeFileSync(
      npmrcPath,
      [existing.trim(), ...toAppend].filter(Boolean).join('\n') + '\n'
    );
  }
}
```

Call `ensureNpmrc(repoPath)` before `pnpmInstallWithRetry(repoPath)`.

---

## Acceptance Criteria

- [ ] `pnpm install` no longer times out on transient network errors
- [ ] On network failure, the agent retries up to 3 times with backoff before marking the repo as `[FAILED]`
- [ ] Timeout for `pnpm install` is at least 10 minutes
- [ ] Network resilience flags are applied consistently across all target repos
- [ ] The fix does not affect repos where `pnpm install` already succeeds quickly
