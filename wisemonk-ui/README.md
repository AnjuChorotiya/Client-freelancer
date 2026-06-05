# Wisemonk UI

A portable, framework-free component library extracted from the Wisemonk portal.
Plain HTML + CSS + vanilla JS — no build step, no dependencies. Drop it into any
project and reuse the same look, tokens, and behaviors.

Everything is namespaced so it never collides with your app:

- CSS classes are prefixed `wm-` (e.g. `.wm-btn`, `.wm-card`)
- Design tokens are prefixed `--wm-` (e.g. `var(--wm-primary-500)`)
- The global JS object is `WMUI`

```
wisemonk-ui/
├─ wisemonk-ui.css      design tokens + every component
├─ wisemonk-ui.js       behaviors (modal, drawer, command palette, toast…)
├─ iconsax-sprite.svg   Iconsax (Vuesax linear) icon sprite
├─ index.html           live showcase / storybook
└─ README.md            this file
```

Open `index.html` in a browser (served over http) to browse every component.

---

## Setup

Add the fonts, the stylesheet, and the script:

```html
<!-- fonts -->
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300&display=swap" rel="stylesheet">

<!-- library -->
<link rel="stylesheet" href="wisemonk-ui.css">
<script src="wisemonk-ui.js" defer></script>
```

### Icons

Icons come from a single SVG sprite of `<symbol>` definitions. Reference any icon by id:

```html
<svg class="wm-ic"><use href="#ic-receipt-text"/></svg>
```

You have two ways to make the symbols resolvable:

1. **External reference (served over http):**
   ```html
   <svg class="wm-ic"><use href="iconsax-sprite.svg#ic-receipt-text"/></svg>
   ```
2. **Inline (works everywhere, incl. `file://`):** paste the contents of
   `iconsax-sprite.svg` into a hidden block right after `<body>`, then reference
   symbols with a bare hash:
   ```html
   <svg style="display:none" aria-hidden="true"><!-- sprite symbols here --></svg>
   <svg class="wm-ic"><use href="#ic-receipt-text"/></svg>
   ```

Inlining only the symbols you actually use keeps pages lean. (The Wisemonk portal
automates this with an `inline_sprite.py` script.)

---

## Components (CSS)

| Component | Base class | Modifiers |
|---|---|---|
| Button | `.wm-btn` | `--primary --secondary --outline --ghost --dark --danger --sm --lg --block` |
| Icon button | `.wm-icon-btn` | — |
| Pill / badge | `.wm-pill` | `--success --warning --danger --info --neutral` |
| Avatar | `.wm-avatar` | `--sm --lg --ink --muted` |
| Card | `.wm-card` | `--flat --raised` (+ `.wm-stat-title/-value/-sub`) |
| Banner | `.wm-banner` | `-body -title -desc -actions` |
| Table card | `.wm-table-card` | borderless white surface wrapping toolbar + table |
| Table | `.wm-table` | `--rows-clickable`; `.wm-cell-name`+`.wm-cell-text`, `.wm-table-empty` |
| Toolbar | `.wm-toolbar` | `.wm-toolbar-actions` |
| Search | `.wm-search` | `<input data-wm-table-search="#tbl">` |
| Filter dropdown | `.wm-dropdown` | `.wm-dd-trigger`/`.wm-dd-label`, `.wm-dd-menu`, `.wm-dd-item` |
| Comparison | `.wm-compare` | `.wm-col-feat/-a/-b`, `.wm-compare-cell .yes/.no` |
| Form field | `.wm-field` | `.wm-input .wm-select .wm-textarea`, `.wm-input-wrap`+`.wm-input-prefix`, `.wm-field-row`, `.wm-req`, `.wm-field-hint`, `.wm-field-error` (+`.wm-field--error`) |
| Floating-label field | `.wm-field-float` | portal-style label that sits centered then lifts on focus/fill; control **first**, `<label>` after; `.wm-field-float-row`; works with select + datepicker |
| Custom select | `.wm-selectbox` | built from a native `<select data-wm-select>`; `data-wm-select="search"` adds search; `multiple` → chips |
| Date picker | `.wm-datepicker` / `.wm-cal` | built from `<input data-wm-datepicker>`; calendar popover, ISO value |
| Toggle | `.wm-toggle` | child `button.active` |
| Note | `.wm-note` | `--success --warning --danger` |
| Breakdown | `.wm-breakdown` | `-row -total` |
| Option cards | `.wm-option-cards` / `.wm-option-card` | `.selected` |
| Modal | `.wm-modal-overlay` / `.wm-modal` | `--lg`, `-head -body -foot` |
| Drawer | `.wm-drawer-overlay` / `.wm-drawer` | `-head -body -foot` |
| Command palette | `.wm-cmdk-trigger` / `.wm-cmdk` | `.wm-kbd` |
| Toast | `.wm-toast` | `--success --danger` |

### Typography

`.wm-h1` `.wm-h2` `.wm-h3` `.wm-h4` `.wm-text` (`.wm-text-muted`) `.wm-label` `.wm-tag`

---

## Behaviors (JS)

Most things work declaratively — no JS to write.

```html
<!-- open / close any modal or drawer -->
<button data-wm-open="#myModal">Open</button>
<button data-wm-close>Close</button>          <!-- closes nearest overlay -->

<!-- segmented control -->
<div class="wm-toggle" data-wm-toggle>
  <button class="active" data-value="a">A</button>
  <button data-value="b">B</button>
</div>

<!-- single-select option cards -->
<div class="wm-option-cards" data-wm-option-group>
  <button class="wm-option-card selected" data-value="x">…</button>
  <button class="wm-option-card" data-value="y">…</button>
</div>

<!-- command palette trigger -->
<button data-wm-cmdk>Search…</button>

<!-- table: live search + filter dropdown (rows need data-<key> to filter) -->
<input data-wm-table-search="#people">
<div class="wm-dropdown" data-wm-filter="#people" data-wm-filter-key="status">
  <button class="wm-dd-trigger"><span class="wm-dd-label">All status</span> …</button>
  <div class="wm-dd-menu">
    <button class="wm-dd-item selected" data-value="all" data-label="All status">…</button>
    <button class="wm-dd-item" data-value="active" data-label="Active">…</button>
  </div>
</div>
<table id="people"><tbody><tr data-status="active">…</tr></tbody></table>

<!-- floating-label field (portal signature): control FIRST, then <label> -->
<div class="wm-field-float">
  <input class="wm-input" type="text" id="name" required placeholder=" ">
  <label for="name">Legal full name <span class="wm-req">*</span></label>
</div>
<!-- floating label also works wrapping a custom select or datepicker -->
<div class="wm-field-float">
  <select data-wm-select name="country" required>
    <option value="" disabled selected>Country of work</option>
    <option value="in">India</option>
  </select>
  <label>Country of work <span class="wm-req">*</span></label>
</div>

<!-- custom select (enhances a native <select> — submits with forms) -->
<select data-wm-select data-placeholder="Select a country" name="country">
  <option value="" disabled selected>Select a country</option>
  <option value="in">India</option>
  <option value="us">United States</option>
</select>
<select data-wm-select="search" name="currency">…</select>     <!-- searchable -->
<select multiple data-wm-select name="benefits">…</select>     <!-- multi-select chips -->

<!-- date picker (enhances a readonly text input; stores ISO in data-value / hidden input) -->
<input class="wm-input" type="text" data-wm-datepicker name="start_date" placeholder="Pick a date">

<!-- onboarding form with inline validation -->
<form data-wm-validate novalidate>
  <div class="wm-field">
    <label>Work email <span class="wm-req">*</span></label>
    <input class="wm-input" type="email" name="email" required>
    <small class="wm-field-error">Enter a valid email address</small>
  </div>
  <button type="submit" class="wm-btn wm-btn--primary">Submit</button>
</form>

<!-- copy to clipboard -->
<button data-wm-copy="text to copy" data-wm-copy-msg="Copied!">Copy</button>

<!-- auto platform key hint (becomes ⌘ K on mac, Ctrl K elsewhere) -->
<span class="wm-kbd" data-wm-kbd-meta>Ctrl K</span>
```

Modals and drawers close on backdrop click and `Esc`. The command palette opens
with `⌘/Ctrl + K` (only if a trigger or palette exists on the page).

### Programmatic API

```js
WMUI.open('#myDrawer');            // open a modal or drawer
WMUI.close('#myDrawer');           // close it
WMUI.toast('Saved', { type: 'success' });   // type: 'success' | 'danger' | (default)
WMUI.copy('text');                 // returns a Promise
WMUI.select.value('#mySelect');    // { value, label } — or { value:[], labels:[] } for multi
WMUI.validate('#myForm');          // returns true/false, marks invalid fields
WMUI.refresh();                    // re-wire after injecting new DOM (idempotent)

// command palette
WMUI.cmdk.open();
WMUI.cmdk.register([
  { section: 'Pages',   label: 'Dashboard', sub: 'Overview', icon: 'ic-home-2', href: '/dashboard' },
  { section: 'Actions', label: 'Invite contractor', icon: 'ic-user-add', action: () => WMUI.open('#invite') }
]);
```

Each component dispatches a bubbling event you can listen for:
`wm:open`, `wm:close`, `wm:toggle` (`detail.value`), `wm:select` (`detail.value`,
`detail.label`/`labels`), `wm:filter` (`detail.key`, `detail.value`),
`wm:datechange` (`detail.value` ISO, `detail.date`), `wm:valid` / `wm:invalid` (forms).

---

## Notes

- The drawer slides in via a forced reflow rather than `requestAnimationFrame`, so
  it animates reliably even in backgrounded / preview tabs.
- Open/close states use class names `.is-open` (and `.is-shown` for the drawer
  slide). If you script your own toggling, match those names.
- Tokens, type, and icons follow the official Wisemonk design system (Satoshi +
  Open Sans Light; Iconsax Vuesax linear; the documented primary/neutral/semantic
  palette). Don't introduce off-system colors, fonts, or icon sets.
