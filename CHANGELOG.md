# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-04

First versioned release.

### Changed
- Prices are formatted with a fixed locale (`12,500.5`), so the control panel and the board show the same digits on every device.
- Headings now load and use the Tajawal font. Before, they fell back to Georgia.
- After a sale, the horse-name field starts empty.
- Images renamed to `horse-background.jpg` and `favicon.png`.

### Fixed
- Corrupt or hand-edited auction data in `localStorage` is discarded instead of crashing the page.
- The project now type-checks under strict TypeScript.

### Removed
- Google AI Studio scaffolding: `metadata.json`, `.env.example`, `assets/.aistudio`, and the template README.
- Unused dependencies, including `@google/genai`, `express`, `zod` and `react-hook-form`.

### Added
- Unit tests for auction state parsing and price formatting (`npm test`).
- Documentation: a rewritten README and doc comments in the source.

[1.0.0]: https://github.com/precatfa-creator/houca/releases/tag/v1.0.0
