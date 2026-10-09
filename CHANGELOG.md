# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Fixed

- Skip updates that fall outside another dependency's peer range (e.g. `typescript` 7 vs `typescript-eslint` `<6.1.0`), which used to install with `--legacy-peer-deps` and then break strict `npm ci` in CI.
- Pin `typescript` back to `^6.0.3`; 7.x crashed `pnpm lint`.

### Added

- Initial release with core features
