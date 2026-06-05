/* ============================================================================
   Wisemonk UI — universal behaviors
   Framework-free JS companion to wisemonk-ui.css. Exposes a global `WMUI`
   object and auto-wires declarative data-attributes on DOMContentLoaded.

   Declarative wiring (no JS required):
     <button data-wm-open="#myModal">Open</button>      open a modal/drawer
     <button data-wm-close>Close</button>                close nearest overlay
     <div class="wm-toggle" data-wm-toggle>...buttons</div>   segmented control
     <button class="wm-option-card" ...>                 selectable option card
       (wrap in [data-wm-option-group] for single-select radio behavior)
     <button data-wm-copy="text to copy">Copy</button>   copy to clipboard
     <button data-wm-cmdk>...</button>                    open command palette

   Programmatic API:
     WMUI.open(el|selector)         open modal or drawer
     WMUI.close(el|selector)        close modal or drawer
     WMUI.toast(msg, {type,icon,duration})
     WMUI.cmdk.open() / .close()
     WMUI.cmdk.register(items)      [{label, sub, icon, href, action, section}]
   ========================================================================== */
(function (global) {
  'use strict';

  var DRAWER_MS = 320; // keep in sync with .wm-drawer transition

  /* ---- helpers ----------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function resolve(elOrSel) { return typeof elOrSel === 'string' ? $(elOrSel) : elOrSel; }
  function isDrawer(overlay) { return overlay.classList.contains('wm-drawer-overlay'); }
  function lockScroll(lock) { document.body.style.overflow = lock ? 'hidden' : ''; }

  /* ---- modal + drawer ---------------------------------------------------- */
  function open(elOrSel) {
    var ov = resolve(elOrSel);
    if (!ov) return;
    ov.classList.add('is-open');
    lockScroll(true);
    if (isDrawer(ov)) {
      // Force a synchronous reflow so the transform transition fires.
      // (requestAnimationFrame is throttled/paused in backgrounded tabs.)
      void ov.offsetWidth;
      ov.classList.add('is-shown');
    }
    var focusTarget = ov.querySelector('[autofocus], input, select, textarea, button');
    if (focusTarget) { try { focusTarget.focus({ preventScroll: true }); } catch (e) {} }
    ov.dispatchEvent(new CustomEvent('wm:open', { bubbles: true }));
  }

  function close(elOrSel) {
    var ov = resolve(elOrSel);
    if (!ov) return;
    if (isDrawer(ov)) {
      ov.classList.remove('is-shown');
      setTimeout(function () { ov.classList.remove('is-open'); finishClose(ov); }, DRAWER_MS);
    } else {
      ov.classList.remove('is-open');
      finishClose(ov);
    }
  }

  function finishClose(ov) {
    if (!anyOverlayOpen()) lockScroll(false);
    ov.dispatchEvent(new CustomEvent('wm:close', { bubbles: true }));
  }

  function anyOverlayOpen() {
    return !!document.querySelector('.wm-modal-overlay.is-open, .wm-drawer-overlay.is-open, .wm-cmdk-overlay.is-open');
  }

  function closeTopmost() {
    // command palette first, then any open modal/drawer
    if (cmdk.isOpen()) { cmdk.close(); return; }
    var open = $all('.wm-modal-overlay.is-open, .wm-drawer-overlay.is-open');
    if (open.length) close(open[open.length - 1]);
  }

  /* ---- toast ------------------------------------------------------------- */
  function ensureToastWrap() {
    var w = $('.wm-toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'wm-toast-wrap'; document.body.appendChild(w); }
    return w;
  }
  function toast(msg, opts) {
    opts = opts || {};
    var wrap = ensureToastWrap();
    var t = document.createElement('div');
    t.className = 'wm-toast' + (opts.type ? ' wm-toast--' + opts.type : '');
    var iconName = opts.icon || (opts.type === 'success' ? 'ic-tick-circle'
      : opts.type === 'danger' ? 'ic-close-circle' : 'ic-info-circle');
    if (iconName) {
      t.innerHTML = '<svg class="wm-ic"><use href="#' + iconName + '"/></svg>';
    }
    t.appendChild(document.createTextNode(msg));
    wrap.appendChild(t);
    var dur = opts.duration || 2600;
    setTimeout(function () {
      t.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, dur);
    return t;
  }

  /* ---- toggle (segmented control) --------------------------------------- */
  function initToggle(group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !group.contains(btn)) return;
      $all('button', group).forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      group.dispatchEvent(new CustomEvent('wm:toggle', {
        bubbles: true,
        detail: { value: btn.dataset.value || btn.textContent.trim(), button: btn }
      }));
    });
  }

  /* ---- option cards (selectable, optional single-select group) ---------- */
  function initOptionGroup(group) {
    group.addEventListener('click', function (e) {
      var card = e.target.closest('.wm-option-card');
      if (!card || !group.contains(card)) return;
      $all('.wm-option-card', group).forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      group.dispatchEvent(new CustomEvent('wm:select', {
        bubbles: true,
        detail: { value: card.dataset.value || '', card: card }
      }));
    });
  }
  function initLoneOptionCard(card) {
    card.addEventListener('click', function () { card.classList.toggle('selected'); });
  }

  /* ---- table search + filter dropdowns ----------------------------------- */
  // per-table state: { query: '', filters: { key: value } }
  var tableState = new WeakMap();

  function tableFor(selOrEl) {
    var el = resolve(selOrEl);
    if (!el) return null;
    return el.tagName === 'TABLE' ? el : el.querySelector('table');
  }
  function stateFor(table) {
    if (!tableState.has(table)) tableState.set(table, { query: '', filters: {} });
    return tableState.get(table);
  }
  function applyTableFilters(table) {
    if (!table) return;
    var st = stateFor(table);
    var q = st.query.toLowerCase();
    var rows = $all('tbody tr', table);
    var visible = 0;
    rows.forEach(function (tr) {
      var okText = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
      var okFilters = Object.keys(st.filters).every(function (key) {
        var v = st.filters[key];
        if (!v || v === 'all') return true;
        return (tr.dataset[key] || '') === v;
      });
      var show = okText && okFilters;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    // optional empty-state element inside the same table-card
    var card = table.closest('.wm-table-card') || table.parentNode;
    var empty = card && card.querySelector('.wm-table-empty');
    if (empty) empty.classList.toggle('show', visible === 0);
  }

  function initTableSearch(input) {
    var table = tableFor(input.getAttribute('data-wm-table-search'));
    if (!table) return;
    input.addEventListener('input', function () {
      stateFor(table).query = input.value || '';
      applyTableFilters(table);
    });
  }

  function initDropdown(dd) {
    var trigger = dd.querySelector('.wm-dd-trigger');
    var label = trigger && trigger.querySelector('.wm-dd-label');
    var table = tableFor(dd.getAttribute('data-wm-filter'));
    var key = dd.getAttribute('data-wm-filter-key') || 'status';
    if (trigger) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dd.classList.toggle('is-open');
        // close sibling dropdowns
        $all('.wm-dropdown.is-open').forEach(function (o) { if (o !== dd) o.classList.remove('is-open'); });
        dd.classList.toggle('is-open', open);
      });
    }
    $all('.wm-dd-item', dd).forEach(function (item) {
      item.addEventListener('click', function () {
        $all('.wm-dd-item', dd).forEach(function (i) { i.classList.toggle('selected', i === item); });
        if (label) label.textContent = item.dataset.label || item.textContent.trim();
        dd.classList.remove('is-open');
        if (table) { stateFor(table).filters[key] = item.dataset.value || 'all'; applyTableFilters(table); }
        dd.dispatchEvent(new CustomEvent('wm:filter', { bubbles: true, detail: { key: key, value: item.dataset.value || '' } }));
      });
    });
  }

  /* ---- custom select / multi-select (enhances a native <select>) --------- */
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function initSelectBox(sel) {
    if (sel.dataset.wmEnhanced) return;
    sel.dataset.wmEnhanced = '1';
    var multi = sel.multiple;
    var searchable = (sel.dataset.wmSelect === 'search') || sel.hasAttribute('data-searchable');
    var placeholder = sel.getAttribute('data-placeholder') || 'Select…';

    var box = document.createElement('div');
    box.className = 'wm-selectbox' + (multi ? ' wm-selectbox--multi' : '');
    sel.parentNode.insertBefore(box, sel);
    box.appendChild(sel);
    sel.classList.add('wm-selectbox-native');

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'wm-selectbox-trigger';
    trigger.innerHTML = (multi
      ? '<span class="wm-selectbox-chips"></span>'
      : '<span class="wm-selectbox-value"></span>') +
      '<span class="wm-selectbox-chevron">' + ICON_CHEVRON + '</span>';
    box.appendChild(trigger);

    var menu = document.createElement('div');
    menu.className = 'wm-selectbox-menu';
    var searchInput = null;
    if (searchable) {
      var sw = document.createElement('div');
      sw.className = 'wm-selectbox-search';
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search…';
      searchInput.autocomplete = 'off';
      sw.appendChild(searchInput);
      menu.appendChild(sw);
    }
    var optWrap = document.createElement('div');
    optWrap.className = 'wm-selectbox-options';
    menu.appendChild(optWrap);
    var emptyEl = document.createElement('div');
    emptyEl.className = 'wm-selectbox-empty';
    emptyEl.textContent = 'No matches';
    menu.appendChild(emptyEl);
    box.appendChild(menu);

    var opts = Array.prototype.slice.call(sel.options).filter(function (o) {
      // skip a leading empty/placeholder option, use it as placeholder text
      if (o.value === '' && o.disabled) { placeholder = o.textContent.trim() || placeholder; return false; }
      return true;
    });

    opts.forEach(function (o) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wm-selectbox-option';
      btn.setAttribute('role', 'option');
      btn.dataset.value = o.value;
      btn.setAttribute('aria-selected', o.selected ? 'true' : 'false');
      btn.innerHTML = (multi
          ? '<span class="wm-selectbox-option-box">' + ICON_CHECK + '</span>'
          : '') +
        '<span class="wm-selectbox-option-label">' + escapeHtml(o.textContent.trim()) + '</span>' +
        (multi ? '' : '<span class="wm-selectbox-option-check">' + ICON_CHECK + '</span>');
      btn._opt = o;
      optWrap.appendChild(btn);
      btn.addEventListener('click', function () {
        if (multi) {
          o.selected = !o.selected;
        } else {
          opts.forEach(function (x) { x.selected = false; });
          o.selected = true;
          box.classList.remove('is-open');
        }
        syncSelectBox(box);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        box.dispatchEvent(new CustomEvent('wm:select', { bubbles: true, detail: selectValue(sel) }));
      });
    });

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !box.classList.contains('is-open');
      $all('.wm-selectbox.is-open, .wm-dropdown.is-open, .wm-datepicker.is-open').forEach(function (o) {
        o.classList.remove('is-open');
      });
      box.classList.toggle('is-open', willOpen);
      if (willOpen && searchInput) { searchInput.value = ''; filterOptions(''); setTimeout(function () { searchInput.focus(); }, 20); }
    });

    if (searchInput) {
      searchInput.addEventListener('click', function (e) { e.stopPropagation(); });
      searchInput.addEventListener('input', function () { filterOptions(searchInput.value); });
    }

    function filterOptions(q) {
      q = (q || '').toLowerCase().trim();
      var shown = 0;
      $all('.wm-selectbox-option', optWrap).forEach(function (b) {
        var ok = !q || b.textContent.toLowerCase().indexOf(q) !== -1;
        b.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      emptyEl.style.display = shown ? 'none' : 'block';
    }

    syncSelectBox(box);
  }

  function selectValue(sel) {
    var picked = Array.prototype.slice.call(sel.options).filter(function (o) { return o.selected; });
    return sel.multiple
      ? { value: picked.map(function (o) { return o.value; }), labels: picked.map(function (o) { return o.textContent.trim(); }) }
      : { value: (picked[0] || {}).value || '', label: (picked[0] || {}).textContent.trim() || '' };
  }

  function syncSelectBox(box) {
    var sel = box.querySelector('select');
    var placeholder = sel.getAttribute('data-placeholder') || 'Select…';
    // option aria-selected
    $all('.wm-selectbox-option', box).forEach(function (b) {
      b.setAttribute('aria-selected', b._opt.selected ? 'true' : 'false');
    });
    var hasValue = Array.prototype.slice.call(sel.options).some(function (o) { return o.selected && !(o.value === '' && o.disabled); });
    box.classList.toggle('has-value', hasValue);
    if (sel.multiple) {
      var chips = box.querySelector('.wm-selectbox-chips');
      var picked = $all('.wm-selectbox-option', box).filter(function (b) { return b._opt.selected; });
      chips.innerHTML = '';
      if (!picked.length) {
        var ph = document.createElement('span');
        ph.className = 'is-placeholder';
        ph.textContent = placeholder;
        chips.appendChild(ph);
        return;
      }
      picked.forEach(function (b) {
        var chip = document.createElement('span');
        chip.className = 'wm-chip';
        chip.appendChild(document.createTextNode(b._opt.textContent.trim()));
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'wm-chip-x'; x.innerHTML = ICON_X; x.setAttribute('aria-label', 'Remove');
        x.addEventListener('click', function (e) {
          e.stopPropagation();
          b._opt.selected = false;
          syncSelectBox(box);
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        });
        chip.appendChild(x);
        chips.appendChild(chip);
      });
    } else {
      var val = box.querySelector('.wm-selectbox-value');
      var picked2 = Array.prototype.slice.call(sel.options).filter(function (o) { return o.selected && !(o.value === '' && o.disabled); });
      if (picked2.length) { val.textContent = picked2[0].textContent.trim(); val.classList.remove('is-placeholder'); }
      else { val.textContent = placeholder; val.classList.add('is-placeholder'); }
    }
  }

  /* ---- date picker (enhances a readonly text input) ---------------------- */
  var DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }

  function initDatePicker(input) {
    if (input.dataset.wmEnhanced) return;
    input.dataset.wmEnhanced = '1';
    input.readOnly = true;

    var wrap = document.createElement('div');
    wrap.className = 'wm-datepicker';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    // hidden ISO value for form submission (if a name was provided)
    var hidden = null;
    if (input.dataset.name || input.name) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = input.dataset.name || input.name;
      if (input.name) input.removeAttribute('name');
      wrap.appendChild(hidden);
    }

    var selected = parseISO(input.dataset.value || input.value);
    var view = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date();
    view.setDate(1);

    var cal = document.createElement('div');
    cal.className = 'wm-cal';
    wrap.appendChild(cal);

    function setValue(d) {
      selected = d;
      input.value = fmtDate(d);
      input.dataset.value = toISO(d);
      if (hidden) hidden.value = toISO(d);
      wrap.classList.add('has-value');
      wrap.classList.remove('is-open');
      input.dispatchEvent(new CustomEvent('wm:datechange', { bubbles: true, detail: { value: toISO(d), date: d } }));
    }

    function renderCal() {
      var y = view.getFullYear(), mo = view.getMonth();
      var first = new Date(y, mo, 1);
      var startDow = first.getDay();
      var daysInMonth = new Date(y, mo + 1, 0).getDate();
      var prevDays = new Date(y, mo, 0).getDate();
      var today = new Date(); var todayISO = toISO(today);
      var selISO = selected ? toISO(selected) : null;

      var html = '<div class="wm-cal-head">' +
        '<span class="wm-cal-title">' + MONTHS[mo] + ' ' + y + '</span>' +
        '<span class="wm-cal-nav">' +
          '<button type="button" data-nav="-1" aria-label="Previous month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
          '<button type="button" data-nav="1" aria-label="Next month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
        '</span></div><div class="wm-cal-grid">';
      DOW.forEach(function (d) { html += '<span class="wm-cal-dow">' + d + '</span>'; });
      for (var i = 0; i < startDow; i++) {
        html += '<button type="button" class="wm-cal-day is-muted" data-iso="' + toISO(new Date(y, mo - 1, prevDays - startDow + 1 + i)) + '">' + (prevDays - startDow + 1 + i) + '</button>';
      }
      for (var day = 1; day <= daysInMonth; day++) {
        var iso = toISO(new Date(y, mo, day));
        var cls = 'wm-cal-day';
        if (iso === todayISO) cls += ' is-today';
        if (iso === selISO) cls += ' is-selected';
        html += '<button type="button" class="' + cls + '" data-iso="' + iso + '">' + day + '</button>';
      }
      var cells = startDow + daysInMonth;
      var trail = (7 - (cells % 7)) % 7;
      for (var t = 1; t <= trail; t++) {
        html += '<button type="button" class="wm-cal-day is-muted" data-iso="' + toISO(new Date(y, mo + 1, t)) + '">' + t + '</button>';
      }
      html += '</div>';
      cal.innerHTML = html;
    }

    cal.addEventListener('click', function (e) {
      e.stopPropagation();
      var nav = e.target.closest('[data-nav]');
      if (nav) { view.setMonth(view.getMonth() + parseInt(nav.getAttribute('data-nav'), 10)); renderCal(); return; }
      var day = e.target.closest('.wm-cal-day');
      if (day) { var d = parseISO(day.getAttribute('data-iso')); if (d) setValue(d); }
    });

    input.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !wrap.classList.contains('is-open');
      $all('.wm-selectbox.is-open, .wm-dropdown.is-open, .wm-datepicker.is-open').forEach(function (o) {
        o.classList.remove('is-open');
      });
      if (willOpen) { view = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(); view.setDate(1); renderCal(); }
      wrap.classList.toggle('is-open', willOpen);
    });

    if (selected) setValue(selected); // normalize display from a preset ISO value
  }

  /* ---- form validation (onboarding behavior) ----------------------------- */
  // Mark a field invalid/valid: <div class="wm-field" data-wm-field><input required>…
  //   <small class="wm-field-error">message</small></div>
  function fieldOf(control) { return control.closest('.wm-field, .wm-field-float'); }

  function setFieldError(field, msg) {
    if (!field) return;
    field.classList.add('wm-field--error');
    var err = field.querySelector('.wm-field-error');
    if (err && msg) err.textContent = msg;
  }
  function clearFieldError(field) { if (field) field.classList.remove('wm-field--error'); }

  function validateField(control) {
    var field = fieldOf(control);
    if (!field) return true;
    var required = control.required || control.hasAttribute('required');
    var val;
    if (control.tagName === 'SELECT' && control.multiple) {
      val = Array.prototype.slice.call(control.selectedOptions).filter(function (o) { return o.value; }).length ? 'x' : '';
    } else if (control.dataset && control.dataset.wmEnhanced && control.classList.contains('wm-input')) {
      val = (control.dataset.value || '').trim();   // datepicker stores ISO here
    } else {
      val = (control.value || '').trim();
    }
    if (required && !val) { setFieldError(field, field.dataset.wmRequiredMsg || 'This field is required'); return false; }
    if (val && control.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
      setFieldError(field, 'Enter a valid email address'); return false;
    }
    clearFieldError(field);
    return true;
  }

  function validateForm(form) {
    form = resolve(form);
    if (!form) return true;
    var controls = $all('input, select, textarea', form).filter(function (c) {
      return c.type !== 'hidden' && (c.required || c.hasAttribute('required'));
    });
    var ok = true, firstBad = null;
    controls.forEach(function (c) {
      if (!validateField(c) && !firstBad) firstBad = c;
      if (!validateField(c)) ok = false;
    });
    if (firstBad) {
      var f = firstBad.closest('.wm-selectbox') || firstBad.closest('.wm-datepicker') || firstBad;
      if (f.scrollIntoView) f.scrollIntoView({ block: 'center', behavior: 'smooth' });
      var focusable = f.querySelector ? (f.querySelector('input, button, .wm-selectbox-trigger') || f) : f;
      try { focusable.focus({ preventScroll: true }); } catch (e) {}
    }
    return ok;
  }

  function initFormValidate(form) {
    form.addEventListener('submit', function (e) {
      if (!validateForm(form)) { e.preventDefault(); form.dispatchEvent(new CustomEvent('wm:invalid', { bubbles: true })); }
      else { form.dispatchEvent(new CustomEvent('wm:valid', { bubbles: true })); }
    });
    // clear errors as the user fixes them
    form.addEventListener('input', function (e) {
      var f = fieldOf(e.target);
      if (f && f.classList.contains('wm-field--error')) validateField(e.target);
    });
    form.addEventListener('change', function (e) {
      var f = fieldOf(e.target);
      if (f && f.classList.contains('wm-field--error')) validateField(e.target);
    });
  }

  /* ---- copy to clipboard ------------------------------------------------- */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  /* ---- command palette --------------------------------------------------- */
  var cmdk = (function () {
    var overlay, listEl, inputEl, emptyEl, items = [], activeIdx = 0, built = false;

    function build() {
      if (built) return;
      overlay = $('.wm-cmdk-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'wm-cmdk-overlay';
        overlay.innerHTML =
          '<div class="wm-cmdk" role="dialog" aria-label="Command palette">' +
            '<div class="wm-cmdk-search">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
              '<input type="text" placeholder="Search actions, pages…" autocomplete="off" spellcheck="false">' +
              '<span class="wm-kbd">Esc</span>' +
            '</div>' +
            '<div class="wm-cmdk-list"></div>' +
            '<div class="wm-cmdk-empty">No results found</div>' +
          '</div>';
        document.body.appendChild(overlay);
      }
      listEl = $('.wm-cmdk-list', overlay);
      inputEl = $('.wm-cmdk-search input', overlay);
      emptyEl = $('.wm-cmdk-empty', overlay);

      // harvest any markup-defined items so authors can declare them in HTML
      $all('.wm-cmdk-item', listEl).forEach(function (a) {
        items.push({
          label: (a.querySelector('.wm-cmdk-label') || a).textContent.trim(),
          sub: (a.querySelector('.wm-cmdk-item-sub') || {}).textContent || '',
          href: a.getAttribute('href') || '',
          section: a.dataset.section || '',
          _el: a
        });
      });

      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeP(); });
      inputEl.addEventListener('input', render);
      inputEl.addEventListener('keydown', onKeys);
      built = true;
    }

    function register(arr) { build(); items = items.concat(arr || []); }

    function openP() {
      build();
      overlay.classList.add('is-open');
      lockScroll(true);
      inputEl.value = ''; activeIdx = 0; render();
      setTimeout(function () { try { inputEl.focus(); } catch (e) {} }, 20);
    }
    function closeP() {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      if (!anyOverlayOpen()) lockScroll(false);
    }
    function isOpenP() { return overlay && overlay.classList.contains('is-open'); }

    function matches() {
      var q = (inputEl.value || '').toLowerCase().trim();
      if (!q) return items.slice();
      return items.filter(function (it) {
        return (it.label + ' ' + (it.sub || '') + ' ' + (it.section || '')).toLowerCase().indexOf(q) !== -1;
      });
    }

    function render() {
      var found = matches();
      activeIdx = Math.max(0, Math.min(activeIdx, found.length - 1));
      listEl.innerHTML = '';
      var lastSection = null;
      found.forEach(function (it, i) {
        if (it.section && it.section !== lastSection) {
          var s = document.createElement('div');
          s.className = 'wm-cmdk-section'; s.textContent = it.section;
          listEl.appendChild(s); lastSection = it.section;
        }
        var a = document.createElement(it.href ? 'a' : 'div');
        a.className = 'wm-cmdk-item' + (i === activeIdx ? ' active' : '');
        if (it.href) a.href = it.href;
        a.innerHTML =
          '<span class="wm-cmdk-ic"><svg class="wm-ic"><use href="#' + (it.icon || 'ic-arrow-right') + '"/></svg></span>' +
          '<span class="wm-cmdk-label">' + escapeHtml(it.label) + '</span>' +
          (it.sub ? '<span class="wm-cmdk-item-sub">' + escapeHtml(it.sub) + '</span>' : '');
        a.addEventListener('click', function (e) { activeIdx = i; trigger(e); });
        a.addEventListener('mousemove', function () {
          if (activeIdx === i) return;
          activeIdx = i;
          $all('.wm-cmdk-item', listEl).forEach(function (n) { n.classList.remove('active'); });
          a.classList.add('active');
        });
        listEl.appendChild(a);
      });
      emptyEl.style.display = found.length ? 'none' : 'block';
    }

    function onKeys(e) {
      var found = matches();
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, found.length - 1); render(); scrollActive(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); render(); scrollActive(); }
      else if (e.key === 'Enter') { e.preventDefault(); trigger(e); }
      else if (e.key === 'Escape') { e.preventDefault(); closeP(); }
    }
    function scrollActive() {
      var a = $('.wm-cmdk-item.active', listEl);
      if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    }
    function trigger(e) {
      var found = matches();
      var it = found[activeIdx];
      if (!it) return;
      if (typeof it.action === 'function') { e.preventDefault(); closeP(); it.action(); }
      else if (it.href) { closeP(); window.location.href = it.href; }
      else if (it._el) { it._el.click(); }
    }

    return { open: openP, close: closeP, isOpen: isOpenP, register: register };
  })();

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- platform keyboard hint (⌘ vs Ctrl) -------------------------------- */
  function applyKbdHints() {
    var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
    $all('[data-wm-kbd-meta]').forEach(function (el) {
      el.textContent = isMac ? '⌘ K' : 'Ctrl K';
    });
  }

  /* ---- declarative wiring + global keys ---------------------------------- */
  function init() {
    // open triggers
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-wm-open]');
      if (opener) { e.preventDefault(); open(opener.getAttribute('data-wm-open')); return; }

      var closer = e.target.closest('[data-wm-close]');
      if (closer) {
        e.preventDefault();
        var target = closer.getAttribute('data-wm-close');
        close(target ? target : closer.closest('.wm-modal-overlay, .wm-drawer-overlay'));
        return;
      }

      var cmdkBtn = e.target.closest('[data-wm-cmdk]');
      if (cmdkBtn) { e.preventDefault(); cmdk.open(); return; }

      var copyBtn = e.target.closest('[data-wm-copy]');
      if (copyBtn) {
        e.preventDefault();
        copy(copyBtn.getAttribute('data-wm-copy')).then(function () {
          toast(copyBtn.getAttribute('data-wm-copy-msg') || 'Copied to clipboard', { type: 'success' });
        });
        return;
      }
    });

    // overlay backdrop click closes (modal + drawer)
    $all('.wm-modal-overlay, .wm-drawer-overlay').forEach(function (ov) {
      ov.addEventListener('click', function (e) { if (e.target === ov) close(ov); });
    });

    // components
    $all('[data-wm-toggle], .wm-toggle').forEach(initToggle);
    $all('[data-wm-option-group]').forEach(initOptionGroup);
    $all('.wm-option-card').forEach(function (c) {
      if (!c.closest('[data-wm-option-group]')) initLoneOptionCard(c);
    });
    $all('[data-wm-table-search]').forEach(initTableSearch);
    $all('.wm-dropdown').forEach(initDropdown);
    $all('select[data-wm-select]').forEach(initSelectBox);
    $all('[data-wm-datepicker]').forEach(initDatePicker);
    $all('form[data-wm-validate]').forEach(function (f) {
      if (f.dataset.wmEnhanced) return; f.dataset.wmEnhanced = '1'; initFormValidate(f);
    });

    // close any open dropdown / select / datepicker on outside click
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.wm-dropdown')) {
        $all('.wm-dropdown.is-open').forEach(function (o) { o.classList.remove('is-open'); });
      }
      if (!e.target.closest('.wm-selectbox')) {
        $all('.wm-selectbox.is-open').forEach(function (o) { o.classList.remove('is-open'); });
      }
      if (!e.target.closest('.wm-datepicker')) {
        $all('.wm-datepicker.is-open').forEach(function (o) { o.classList.remove('is-open'); });
      }
    });

    applyKbdHints();

    // global keys: Esc closes topmost, Cmd/Ctrl+K toggles palette
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var openPop = $all('.wm-dropdown.is-open, .wm-selectbox.is-open, .wm-datepicker.is-open');
        if (openPop.length) { openPop.forEach(function (o) { o.classList.remove('is-open'); }); }
        else { closeTopmost(); }
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        if ($('.wm-cmdk-overlay') || document.querySelector('[data-wm-cmdk]')) {
          e.preventDefault();
          cmdk.isOpen() ? cmdk.close() : cmdk.open();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---- public API -------------------------------------------------------- */
  global.WMUI = {
    open: open,
    close: close,
    toast: toast,
    copy: copy,
    cmdk: cmdk,
    select: { value: function (selOrEl) { var el = resolve(selOrEl); var s = el && (el.tagName === 'SELECT' ? el : el.querySelector('select')); return s ? selectValue(s) : null; } },
    validate: validateForm,
    refresh: init
  };
})(window);
