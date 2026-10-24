# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Fixed

- Skip updates that fall outside another dependency's peer range (e.g. `typescript` 7 vs `typescript-eslint` `<6.1.0`), which used to install with `--legacy-peer-deps` and then break strict `npm ci` in CI.
- Pin `typescript` back to `^6.0.3`; 7.x crashed `pnpm lint`.
- The peer-range check no longer fails open: a failed or timed-out `npm view` used to count as "no peers" and let `typescript` 7 through again. Now every major bump in that repo is skipped for the run.
- Pin `typescript` to `~6.0.3` again and hold it with `autoPackagesUpdater.ignore`.

### Added

- Initial release with core features
- `autoPackagesUpdater.ignore` in a repo's `package.json` lists packages the updater never bumps.
