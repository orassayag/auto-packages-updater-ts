# Auto Packages Updater Ts

A powerful Node.js TypeScript automation tool to scan multiple projects for outdated NPM/PNPM packages and automatically update them with Git integration. Built with enterprise-grade architecture using InversifyJS and Zod.

Built in May 2026, this project demonstrates scalable software design, advanced automation workflows, dependency management strategies, and clean modular architecture for modern TypeScript applications.

## Features

### Core Capabilities

- **Multi-Project Scanning**: Reads from a centralized JSON configuration.
- **Dual Package Manager Support**: Automatically detects and handles both NPM and PNPM.
- **Smart Git Integration**: Performs `git pull --rebase` before updates and `git push --force-with-lease` after successful updates.
- **Safety First**: Skips repos with uncommitted changes and avoids self-modification by processing itself last.
- **Detailed Reporting**: Generates a comprehensive execution report on the desktop with Jerusalem time formatting.

### Technical Excellence

- **Dependency Injection**: Clean, testable service architecture with InversifyJS.
- **Schema Validation**: Uses Zod for validating external JSON and package manager output.
- **High Test Coverage**: Robust unit tests with Vitest (>80% coverage).
- **Type Safety**: Full TypeScript with strict type checking and interface-driven design.

### Developer Experience

- **Beautiful CLI**: Progress tracking with spinners, elapsed time, and color-coded status.
- **Fast Feedback**: Optimized testing environment with Vitest.
- **Easy Automation**: Includes BAT files for quick execution from the desktop.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0 or npm
- Git installed and configured

### Installation

1. Clone the repository:

```bash
git clone https://github.com/orassayag/auto-packages-updater-ts.git
cd auto-packages-updater-ts
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm build
```

## Usage

### Configuration

Create a file at `C:\Or\web\project-repos-names.json` with the following structure:

```json
{
  "repos": [
    { "name": "my-cool-project", "type": "active" },
    { "name": "legacy-project", "type": "inactive" }
  ]
}
```

The app will only process repos with `"type": "active"`.

### Running the App

You can run the app directly using:

```bash
pnpm sync
```

Or use the provided BAT file:

- `auto-packages-updater-ts.bat` (in project root)
- A copy is also placed on your Desktop.

## Best Practices

- **Check Uncommitted Changes**: Always ensure your repositories are clean before running the updater.
- **Verify Updates**: Review the generated report on your desktop after each run.
- **Test First**: Run `pnpm test` before contributing changes to the core logic.
- **Keep it Clean**: Use `pnpm lint` and `pnpm format` to maintain code quality.

## Development

### Available Scripts

- `pnpm sync`: Run the main update process.
- `pnpm test`: Run unit tests with coverage report.
- `pnpm lint`: Lint the codebase.
- `pnpm format`: Format the code with Prettier.
- `pnpm build`: Compile TypeScript to JavaScript.

### Architecture Principles

This project follows clean architecture principles:

1. **Dependency Injection**: All services are managed by InversifyJS for loose coupling and testability.
2. **Interface-Driven Design**: Services implement clear interfaces, making them easy to mock.
3. **Single Responsibility**: Each service handles a specific domain (Git, Package Manager, etc.).
4. **Validation-First**: Zod schemas ensure data integrity at runtime.

## Architecture

### Directory Structure

```
src/
├── __tests__/          # Unit tests for services and logic
├── constants/          # Application-wide constants and types
├── container/          # InversifyJS dependency injection setup
├── interfaces/         # Service interface definitions
├── schemas/            # Zod validation schemas
├── services/           # Business logic implementations
│   ├── git.service.ts          # Git operations
│   ├── package-manager.service.ts # NPM/PNPM handling
│   ├── repo.service.ts         # Repository management
│   ├── report.service.ts       # Report generation
│   ├── updater.service.ts      # Main update orchestration
│   └── validation.service.ts   # Schema validation
└── index.ts            # Application entry point
```

### Design Patterns

- **Service Pattern**: Business logic is encapsulated in dedicated services.
- **Dependency Injection**: InversifyJS manages service lifecycles and dependencies.
- **Repository Pattern**: `RepoService` manages the collection of repositories.
- **Strategy Pattern**: `PackageManagerService` handles different package managers (NPM/PNPM).

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## License

This application has an MIT license - see the [LICENSE](LICENSE) file for details.

## Author

- **Or Assayag** - _Initial work_ - [orassayag](https://github.com/orassayag)
- Or Assayag <orassayag@gmail.com>
- GitHub: https://github.com/orassayag
- StackOverflow: https://stackoverflow.com/users/4442606/or-assayag?tab=profile
- LinkedIn: https://linkedin.com/in/orassayag

## Acknowledgments

- Built for educational and research purposes
- Respects robots.txt and implements rate limiting
- Uses user-agent rotation to avoid detection
- Implements polite crawling practices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
