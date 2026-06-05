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
              '<svg class="wm-ic"><use href="#ic-search-normal"/></svg>' +
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

    applyKbdHints();

    // global keys: Esc closes topmost, Cmd/Ctrl+K toggles palette
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeTopmost(); }
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
    refresh: init
  };
})(window);
