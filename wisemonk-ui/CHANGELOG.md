# Wisemonk UI — Changelog

All notable changes to the Wisemonk UI design system are documented here.
This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR** — breaking changes to class names, tokens, markup contracts, or the `WMUI` API.
- **MINOR** — new components, tokens, or behaviors added in a backward-compatible way.
- **PATCH** — backward-compatible bug fixes, style tweaks, and docs.

---

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
