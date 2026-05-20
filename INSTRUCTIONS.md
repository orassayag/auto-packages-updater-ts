# Setup and Usage Instructions

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Available Commands](#available-commands)
5. [Reporting](#reporting)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Documentation](#documentation)
9. [Extending the Application](#extending-the-application)
10. [External Resources](#external-resources)
11. [Last Updated](#last-updated)

## Prerequisites

### System Requirements

- **Node.js**: Version 20 or higher
- **Package Manager**: pnpm (recommended) or npm
- **Operating System**: Windows (required for desktop report paths and BAT files)
- **Git**: Installed and available in PATH

### Knowledge Prerequisites

- Basic understanding of command line/terminal
- Familiarity with `package.json` and dependency management

## Initial Setup

### 1. Install Dependencies

**Using pnpm (recommended):**

```bash
pnpm install
```

**Using npm:**

```bash
npm install
```

### 2. Build the Project

```bash
pnpm build
```

## Configuration

### Project List Configuration

The application expects a JSON file at `C:\Or\web\project-repos-names.json`.

**Schema:**

```json
{
  "repos": [
    {
      "name": "project-folder-name",
      "type": "active"
    }
  ]
}
```

- **name**: The folder name of the project located under `C:\Or\web\projects\`.
- **type**: Only repos with `type: "active"` will be processed.

## Available Commands

### Running Scripts

- `pnpm sync`: Executes the full update cycle (sync, check, update, install, push).
- `pnpm start`: Runs the application directly using `tsx`.
- `pnpm build`: Compiles TypeScript to the `dist` folder.

### Development Commands

**Linting and Formatting:**

- `pnpm lint`: Checks code style and quality.
- `pnpm format`: Formats all TypeScript files.

**Testing:**

- `pnpm test`: Runs all unit tests with Vitest.
- `pnpm test:coverage`: Generates a test coverage report.

## Reporting

After each run, a report is generated at:
`C:\Users\Or Assayag\Desktop\PROJECTS_UPDATES_REPORT.txt`

The report includes:

- Execution timestamp (Jerusalem time)
- Total execution time
- Status of each repository ([UPDATED], [FAILED], [SKIPPED], [NO UPDATES])
- Detailed list of updated packages and their versions
- Error messages for failed repositories
- Summary statistics

## Troubleshooting

### Network Issues

If the app fails with "NPM registry is unreachable", check your internet connection and ensure you can run `npm ping`.

### Git Issues

- **Uncommitted Changes**: The app will skip any repository with uncommitted changes for safety.
- **Merge Conflicts**: If `git pull --rebase` fails, the repository will be marked as [FAILED] in the report.

### Install Failures

If `npm install` or `pnpm install` fails (e.g., due to peer dependency conflicts), the repository will be marked as [FAILED]. The app uses `--legacy-peer-deps` (NPM) or `--no-strict-peer-dependencies` (PNPM) to minimize these issues.

## Best Practices

- **Verify Configuration**: Ensure your `project-repos-names.json` is correctly formatted and paths are accessible.
- **Run Tests Regularly**: Execute `pnpm test` after any architectural changes to ensure no regressions.
- **Review Reports**: Always check the execution report generated on your desktop for detailed status.
- **Git Safety**: Keep your repositories clean (no uncommitted changes) to allow the automation to work smoothly.

## Documentation

- **README.md**: High-level overview, features, and quick start guide.
- **INSTRUCTIONS.md**: Comprehensive setup, usage, and development guide.
- **CHANGELOG.md**: Record of all notable changes to the project.
- **CODE_OF_CONDUCT.md**: Guidelines for community interaction.

## Extending the Application

To add new functionality to the updater:

1. **Define Interface**: Create a new interface in `src/interfaces/`.
2. **Implement Service**: Create the service implementation in `src/services/`.
3. **Register Service**: Add the service to the InversifyJS container in `src/container/container.ts`.
4. **Update Main Logic**: Integrate the new service into `src/services/updater.service.ts` or `src/index.ts`.
5. **Add Tests**: Create corresponding tests in `src/__tests__/`.

## External Resources

- [InversifyJS](https://inversify.io/) - Powerful dependency injection for TypeScript.
- [Zod](https://zod.dev/) - TypeScript-first schema declaration and validation.
- [Vitest](https://vitest.dev/) - Next generation testing framework.
- [pnpm](https://pnpm.io/) - Fast, disk space efficient package manager.

## Last Updated

May 20, 2026

## Author

- **Or Assayag** - _Initial work_ - [orassayag](https://github.com/orassayag)
- Or Assayag <orassayag@gmail.com>
- GitHub: https://github.com/orassayag
- StackOverflow: https://stackoverflow.com/users/4442606/or-assayag?tab=profile
- LinkedIn: https://linkedin.com/in/orassayag
