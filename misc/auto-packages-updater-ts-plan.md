# auto-packages-updater-ts

https://github.com/orassayag/auto-packages-updater-ts

A project that automatically checks for updates on specific repos, updates outdated packages
in their package.json, and pushes the changes to git.

The reference for this project is the "C:\Or\web\projects\global-package-updater" project.
We need to take the logic from this project and apply it to this project, BUT - With the
relevant changes to fit this project's goal - As described:

---

## Plan

### 1. Load active repos list

We currently have the `C:\Or\web\project-repos-names.json` with the list of all the project
repos names we have locally. On this app we will target only the repos which their "type"
property is equal to "active".

- 1.1. Validate the existence of the `C:\Or\web\project-repos-names.json` file. If not,
  throw an error and exit.
- 1.2. Read the `C:\Or\web\project-repos-names.json` file and parse it through a Zod schema
  to validate its structure and types. If validation fails, throw a descriptive error
  and exit.
- 1.3. Get the list of all the active repos names from the validated result.
- 1.4. If no active repos found, throw an error and exit.

---

### 2. Pre-flight network check

Before processing any repos, perform a pre-flight network connectivity check against the
npm registry. If unreachable, throw an error and exit.

---

### 3. Per-repo validation

For each active repo, perform the following validations before any processing:

- 3.1. Validate that the repo directory exists locally. If not, skip the project, log the
  error, and include it in the final report under **[SKIPPED]**.
- 3.2. Validate that a `package.json` file exists in the repo root. If not, skip the project,
  log the error, and include it in the final report under **[SKIPPED]**.
- 3.3. Check for uncommitted changes in the repo (`git status`). If uncommitted changes
  exist, skip the project, log a warning, and include it in the final report under
  **[SKIPPED]**.
- 3.4. Identify whether the project uses NPM or PNPM as the package manager (presence of
  `pnpm-lock.yaml` or `package-lock.json`, or the `"packageManager"` field in
  `package.json`), and act accordingly throughout all subsequent steps for that project.

---

### 4. Queue ordering

Sort the active repo list so that `auto-packages-updater-ts` is always processed last,
to avoid any mid-run self-modification issues.

---

### 5. Sync and detect outdated packages

For each valid active repo:

- 5.1. Run `git pull --rebase` to ensure the local repo is up to date before making any
  changes. If `git pull` fails for any reason (merge conflict, auth issue, divergent
  branch, etc.), log the error, skip the project, include it in the final report under
  **[FAILED]**, and continue to the next repo.
- 5.2. Check for outdated packages in both `"dependencies"` and `"devDependencies"` in
  `package.json` using the package manager's built-in outdated command: - NPM: `npm outdated --json` - PNPM: `pnpm outdated --json`

       Parse the JSON output through a Zod schema to validate its structure before
       processing. This guards against unexpected output format changes between package
       manager versions.

       Always update to the latest available version, including breaking major version
       changes. Skip packages that use:
       - Private/internal package references
       - Workspace protocol references (e.g. `workspace:*`)
       - Local file references (e.g. `file:../something`)

- 5.3. If any outdated packages are found, update their versions directly in `package.json`.

---

### 6. Install

Run the install command according to the detected package manager to update the
`node_modules` folder:

- NPM: `npm install --legacy-peer-deps`
- PNPM: `pnpm install --no-strict-peer-dependencies`

Apply a timeout of 120 seconds. If the install command times out or exits with a non-zero
exit code, log the error, skip the git steps for this project, include it in the final
report under **[FAILED]**, and continue to the next repo. No rollback of `package.json`
is required.

---

### 7. Commit and push

- 7.1. `git add .`
- 7.2. `git commit -m "Update outdated packages"`
- 7.3. `git push --force-with-lease`

The updated `package.json`, `package-lock.json` (for NPM), and `pnpm-lock.yaml` (for PNPM)
will all be included in the commit.

---

### 8. Non-crashing error handling

If any project fails at any step (validation, install, git), the app will not crash. The
error will be logged and the app will continue with the next project. All errors are
collected and included in the final report.

---

### 9. BAT file

This app will be run externally by a bat file. Create the bat file in both locations:

- `C:\Users\Or Assayag\Desktop\auto-packages-updater-ts.bat`
- A copy at the root of this project

The bat file structure:

```bat
@echo off
cd /d "c:\Or\web\projects\auto-packages-updater-ts"
echo Starting Auto Packages Updater...
npm run sync
echo.
echo Auto packages update process finished.
pause
```

---

### 10. Console output

Display a progress animation, the current project name, its position out of the total, and
the elapsed time for that repo. Display all outdated packages for each project. Example:

```
[|] actions-manager [1/8] (12s)
eslint 3.3.4 -> 4.0.0
prettier 3.1.1 -> 3.2.0
```

---

### 11. Final report

Print a report to the desktop at the end of the run:

**Path:** `C:\Users\Or Assayag\Desktop\PROJECTS_UPDATES_REPORT.txt`

- Always override the file content. Create it if it does not exist.
- The date/time uses Jerusalem time, strictly zero-padded, format: `dd/MM/yyyy hh:mm:ss`
  (Example: `13/05/2026 22:34:34`, `20/05/2026 02:30:53`)
- The structure of the report (THIS IS ONLY AN EXAMPLE):

```
PROJECTS_UPDATES_REPORT
Date: 20/05/2026 02:30:53
Execution Time: 04m 12s
==========================

[UPDATED] actions-manager (42s)
  eslint 3.3.4 -> 4.0.0
  prettier 3.1.1 -> 3.2.0

[UPDATED] backup-manager (38s)
  eslint 3.3.4 -> 4.0.0
  prettier 3.1.1 -> 3.2.0

[FAILED] events-and-people-syncer (15s)
  Error: "pnpm install" failed with exit code 1.
  Error: Package "enquirer" is not found.

[FAILED] some-repo (3s)
  Error: "git pull --rebase" failed - divergent branches detected.

[SKIPPED] another-repo
  Reason: Repo directory not found at C:\Or\web\projects\another-repo.

[SKIPPED] yet-another-repo
  Reason: package.json not found.

[SKIPPED] some-other-repo
  Reason: Uncommitted changes detected.

[NO UPDATES] auto-packages-updater-ts (8s)
  No outdated packages found.

==========================
Total packages updated: 18
Total failed packages: 1
Total repos processed: 12
Total repos updated: 10
Total repos skipped: 3
Total repos failed: 2
Execution time: 04m 12s
```

---

### 12. Architecture — Dependency Injection with Inversify

The project will use **Inversify** for dependency injection throughout. All services will
be defined as injectable classes, bound in a central DI container, and resolved through
interfaces. This makes unit testing straightforward — each service dependency can be
mocked and injected without touching the real implementation.

The service structure:

```
src/
├── container/
│   └── container.ts          # Inversify container bindings
├── constants/
│   └── types.ts              # Symbol identifiers for DI tokens
├── interfaces/
│   ├── IGitService.ts
│   ├── IPackageManagerService.ts
│   ├── IReportService.ts
│   ├── IValidationService.ts
│   ├── IUpdaterService.ts
│   └── IRepoService.ts
├── services/
│   ├── git.service.ts
│   ├── package-manager.service.ts
│   ├── report.service.ts
│   ├── validation.service.ts
│   ├── updater.service.ts
│   └── repo.service.ts
├── schemas/                  # Zod schemas (see section 13)
├── types/
├── utils/
└── tests/
```

Inversify requires the following in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

And `reflect-metadata` must be imported once at the application entry point:

```ts
import 'reflect-metadata';
```

---

### 13. Schema validation with Zod

Zod is used in two critical places to safely parse and validate external JSON input:

**13.1. `project-repos-names.json` schema (Step 1.2)**

Validates the structure of the repos list file before any processing begins. Example shape:

```ts
const RepoSchema = z.object({
  name: z.string(),
  type: z.string(),
});

const ReposFileSchema = z.object({
  repos: z.array(RepoSchema),
});
```

If validation fails, the app throws a descriptive Zod error and exits cleanly.

**13.2. `npm/pnpm outdated --json` output schema (Step 5.2)**

Validates the JSON output from the outdated command before iterating over it.
Guards against unexpected output format changes between package manager versions.
Example shape:

```ts
const OutdatedPackageSchema = z.object({
  current: z.string(),
  wanted: z.string(),
  latest: z.string(),
  dependent: z.string().optional(),
  location: z.string().optional(),
});

const OutdatedOutputSchema = z.record(z.string(), OutdatedPackageSchema);
```

If the output doesn't match the schema, the repo is marked as **[FAILED]** with a
descriptive error and the app continues to the next repo.

---

### 14. Unit tests

- Add unit tests for all logic.
- Use the `C:\Or\web\projects\backups-manager` project as a reference for the vitest
  configuration, settings, and structure.
- Minimum coverage threshold: 80%.
- Each service is tested in isolation by injecting mocked dependencies via Inversify,
  keeping tests fast and side-effect free.

---

### 15. README.md and INSTRUCTIONS.md

- Use the md files on the `C:\Or\web\projects\events-and-people-syncer` project as a
  reference for structure and missing sections.
- Keep the same structure but replace all content with content relevant to this project.
