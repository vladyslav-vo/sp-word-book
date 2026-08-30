# Changelog

## 0.3.4 — Statistics and architecture update

- Added a Statistics screen with activity charts, daily grids, period filters, and review totals.
- Added persistent review statistics and a schema version 4 migration for existing collections.
- Reorganized the source tree by application layer and feature while preserving the single-file workflow.
- Improved deck and review-card transitions, compact navigation, and responsive Cloze fields.
- Expanded logic tests and project documentation for persistence, validation, and release builds.
- Included the ready-to-use single-file production build in `dist/index.html`.

## 0.2.3 — Design update

- The presentation layer was redesigned around the Morning Mojito and Neon Streets themes.
- Neon Streets uses a regular JPEG source asset that is inlined into the self-contained production HTML during the build.
- Card list rows, review scheduling metadata, action buttons, empty states and the floating add button received a new responsive layout.
- Review landing, active session, completion state, progress display and rating controls were visually rebuilt.
- Settings and card editor screens received clearer grouping, compact controls and consistent theme styling.
- Typography, spacing, borders, shadows, colors, icons and mobile breakpoints were standardized.
- Screen and card transitions were added with reduced-motion support.
- Rich-text rendering was aligned between the editor, previews and review cards, including underline styling and a 14 px default content size.
