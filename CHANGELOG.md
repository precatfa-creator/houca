# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-04

Major version because the app now needs a Supabase backend and environment variables to run. Auctions saved in the old browser-only storage are not carried over.

### Added
- Horse catalog with lot number, color, date of birth, gender, and photo. Horses can be added manually or imported from Excel using a downloadable template.
- Optional reserve price per horse. Bids show red below the reserve and green at or above it. Selling below the reserve needs a second click to confirm.
- Quick bid increments (+1k, +5k, +10k) alongside a typed new total.
- Undo sale: reopens bidding at the last price.
- Staff sign-in for the control panel. The public board needs no sign-in.
- Real-time sync across devices through Supabase. Bids are applied atomically on the server, so several operators can work at once.
- The board shows the horse's photo, lot, color, age, and gender.

### Changed
- The control panel now shows the catalog beside the live-auction controls.

### Security
- Reserve amounts are stored in a staff-only table. The public key can only read the catalog and the live-auction pointer.
- Staff allowlist (`public.staff`): only listed users can write, so an account created through public sign-up gets read-only access. Accounts that aren't staff see a "not authorized" notice instead of the control panel.

### Fixed
- Deleting or replacing a photo now removes the old file. Storage was missing a `select` policy, so `remove()` silently deleted nothing.

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

[2.0.0]: https://github.com/precatfa-creator/houca/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/precatfa-creator/houca/releases/tag/v1.0.0
