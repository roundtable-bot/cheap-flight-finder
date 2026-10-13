# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Renamed the project, plugin, and skill to `cheap-flight-finder`.
- Simplified the example reply, added Codex and Claude Code CLI installation steps, and updated repository links for Roundtable.

### Added

- Automatic CAPTCHA attempts with browser tools, bounded retries, and manual fallback.
- Verification-checkbox handling in `search_sites.js`, with offline tests for challenge detection and fallback.

## [0.1.0] - 2026-10-13

### Added

- `cheap-flight-finder` skill: asks for trip details, searches Google Flights, Skyscanner, Cheapflights, TeaFlight and Trip.com in parallel, and reports the cheapest option.
- `google_flights.py`: live Google Flights results using only the Python standard library.
- `search_sites.js`: searches Skyscanner, Cheapflights, TeaFlight and Trip.com in parallel with headless Chromium.
- Claude Code plugin marketplace, a Claude.ai paste version, and a release zip for Claude.ai skill upload.

[Unreleased]: https://github.com/roundtable-bot/cheap-flight-finder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/roundtable-bot/cheap-flight-finder/releases/tag/v0.1.0
