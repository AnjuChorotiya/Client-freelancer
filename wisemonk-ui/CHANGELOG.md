# Wisemonk UI — Changelog

All notable changes to the Wisemonk UI design system are documented here.
This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

> Looking for **Dev notes**? They work on any project — see `dev-notes.js` (v1.5.0).

- **MAJOR** — breaking changes to class names, tokens, markup contracts, or the `WMUI` API.
- **MINOR** — new components, tokens, or behaviors added in a backward-compatible way.
- **PATCH** — backward-compatible bug fixes, style tweaks, and docs.

---

## [1.5.0] — 2026-06-12

### Added
- **`dev-notes.js`** — a standalone, drop-in version of Dev notes that works on
  **any project**, with no dependency on `wisemonk-ui.css`/`.js`. It self-injects
  its own styles. Enable on a screen with one line:
  ```html
  <script defer src="https://anjuchorotiya.github.io/Client-freelancer/wisemonk-ui/dev-notes.js"></script>
  ```
  Then tag elements with `data-wm-note="…"`. Same UX as the bundled version
  (toggle button, pins, hover tooltip, opt-in panel, `Alt+N`, `?notes`). Exposes
  `window.DevNotes`; no-ops if the full library's `WMUI.notes` is already present.

## [1.4.1] — 2026-06-12

### Changed
- **Dev notes:** hovering an annotated element now shows its note as a tooltip —
  no need to open the side panel. Turning notes on reveals the pins + enables
  hover; the panel is now opt-in (click a pin to open the full list).

## [1.4.0] — 2026-06-12

### Added
- **Dev notes** — in-screen design annotations for developers. Tag any element with
  `data-wm-note="…"`; a floating **Dev notes** button reveals numbered pins on the
  annotated elements plus a side panel listing every note. Hidden from end-users by
  default; open via the button, the `Alt+N` shortcut, or a `?notes` URL parameter.
  Auto-initialises when a page contains any `[data-wm-note]`. API: `WMUI.notes`
  (`show` / `hide` / `toggle` / `refresh`).

## [1.3.1] — 2026-06-12

### Changed
- Removed the **Quick actions (Cmd-K) trigger** from the app-shell header
  (`app-shell.html`); the header now carries just the notification bell and the
  user chip.

## [1.3.0] — 2026-06-12

### Changed
- **App shell is now the exact freelancer-portal nav + header**, copied verbatim into
  [`app-shell.html`](app-shell.html) (portal classes `.sidebar` / `.nav-link` /
  `.nav-section` / `.nav-parent`+`.nav-children` / `.header` / `.user-chip` /
  `.cmdk-trigger`, with the portal's own CSS + nav-toggle JS). The showcase embeds it
  via an iframe. This replaces the bespoke `wm-` app-shell abstraction.

### Removed
- The `wm-`-namespaced app-shell components added in 1.1.0–1.2.0 (`.wm-shell`,
  `.wm-sidebar`, `.wm-appbar`, `.wm-nav-*`, `[data-wm-sidebar-toggle]`,
  `[data-wm-nav]`) — superseded by the verbatim portal copy above.

## [1.2.0] — 2026-06-12

Aligned the app shell with the live freelancer portal's nav + header.

### Added
- **Collapsible nav groups** — a parent `.wm-nav-item[data-wm-nav-group]` with a
  rotating `.wm-nav-chev` discloses a `.wm-nav-children` block (indented sub-items),
  matching the portal's expandable sections (e.g. Time → Attendance/Leaves). Children
  collapse with the icon-rail; clicking the parent toggles instead of going active.
- **Header user chip** — `.wm-appbar-user` (avatar + `.wm-appbar-user-name` +
  `.wm-appbar-user-chev`), a pill identity control ported from the portal header.

## [1.1.0] — 2026-06-11

### Added
- **App shell** — a full application chrome:
  - **Sidebar** (`.wm-sidebar`) — left navigation with brand header, grouped
    `.wm-nav-item`s (active state, icons, `.wm-nav-badge`), `.wm-nav-group-label`
    section headers, and a `.wm-sidebar-user` footer. Collapses to a 72px icon-rail
    via `.wm-sidebar--collapsed`; becomes an off-canvas drawer below 900px.
  - **Header** (`.wm-appbar`) — sticky top bar with menu toggle, title/subtitle,
    flexible `.wm-appbar-search`, and `.wm-appbar-actions` (icon buttons with an
    optional `.wm-appbar-dot` notification badge + avatar).
  - **Layout** (`.wm-shell` / `.wm-shell-main` / `.wm-shell-content`) tying the
    sidebar and header together, with an off-canvas `.wm-shell-scrim`.
- **Behaviors (JS)** — `[data-wm-sidebar-toggle]` collapses the rail on desktop and
  slides the drawer on mobile; `[data-wm-nav]` gives single-active navigation. Both
  auto-wire on load (and via `WMUI.refresh()`).

[1.1.0]: https://github.com/AnjuChorotiya/Client-freelancer/tree/main/wisemonk-ui

## [1.0.0] — 2026-06-09

First stable release of the portable, framework-free component library extracted
from the Wisemonk portal. Everything is namespaced (`wm-` classes, `--wm-` tokens,
`WMUI` global) so it never collides with a host app.

### Added
- **Design tokens** — full official Wisemonk palette (primary, neutral, semantic,
  success, warning, danger), spacing, radii, and shadows as `--wm-*` CSS variables.
- **Typography** — Satoshi (Bold/Medium) + Open Sans Light tags; `.wm-h1`–`.wm-h4`,
  `.wm-text`, `.wm-label`, `.wm-tag`.
- **Icons** — Iconsax (Vuesax linear) SVG sprite (`iconsax-sprite.svg`) referenced
  via `<svg class="wm-ic"><use href="#ic-…"/></svg>`.
- **Components** — Button, Icon button, Pill/badge, Avatar, Card (+ stat), Banner,
  Table card, Table, Toolbar, Search, Filter dropdown, Comparison, Form field,
  Floating-label field, Custom select (single + multi), Date picker, Toggle, Note,
  Breakdown, Option cards, Modal, Drawer, Command palette, Toast.
- **Behaviors (JS)** — declarative `data-wm-*` wiring plus the `WMUI` API
  (`open`/`close`/`toast`/`copy`/`select`/`validate`/`refresh`/`cmdk`); bubbling
  `wm:*` events; modal/drawer with backdrop + `Esc` close; `⌘/Ctrl+K` palette.
- **Docs** — `README.md` setup guide and component/behavior reference, plus a live
  `index.html` showcase / storybook.

[1.0.0]: https://github.com/AnjuChorotiya/Client-freelancer/tree/main/wisemonk-ui
