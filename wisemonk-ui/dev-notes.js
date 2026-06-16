/* ============================================================================
   Wisemonk Dev Notes — standalone, drop-in design annotations for developers.

   Works on ANY page (no dependency on wisemonk-ui.css/js). One line to enable:
     <script defer src="https://anjuchorotiya.github.io/Client-freelancer/wisemonk-ui/dev-notes.js"></script>

   Then tag any element:
     <button data-wm-note="Calls POST /payouts; amount in paise">Send payout</button>

   A floating "Dev notes" button appears (bottom-right). Toggle it on, then hover
   any annotated element to read its note (a side panel listing all notes opens on
   pin-click). Hidden from end-users by default; open via the button, Alt+N, or a
   ?notes URL parameter. Self-injects its own CSS so colours match the palette.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__wmDevNotes) return;               // avoid double-loading
  window.__wmDevNotes = true;
  if (window.WMUI && window.WMUI.notes) return;   // full library already provides it

  var CSS = ''
    + '.wm-notes-toggle{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 15px;border-radius:100px;background:#1A1D24;color:#fff;font-family:"Satoshi",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:13px;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,.35)}'
    + '.wm-notes-toggle svg{width:16px;height:16px}'
    + '.wm-notes-toggle.is-on{background:#2684FF}'
    + '.wm-notes-toggle .wm-notes-count{background:#F79009;color:#fff;border-radius:100px;font-size:11px;font-weight:700;padding:1px 7px}'
    + 'body.wm-notes-on [data-wm-note]{outline:1.5px dashed #F79009;outline-offset:2px}'
    // table rows can't paint an outline reliably — tint the cells and box them instead
    + 'body.wm-notes-on tr[data-wm-note]{outline:none}'
    + 'body.wm-notes-on tr[data-wm-note]>td,body.wm-notes-on tr[data-wm-note]>th{border-top:2px dashed #F79009;border-bottom:2px dashed #F79009}'
    + 'body.wm-notes-on tr[data-wm-note]>:first-child{border-left:2px dashed #F79009}'
    + 'body.wm-notes-on tr[data-wm-note]>:last-child{border-right:2px dashed #F79009}'
    + '.wm-note-pin--row{right:8px}'
    + '.wm-note-pin{position:absolute;z-index:40;top:-11px;right:-11px;width:22px;height:22px;border-radius:50%;background:#F79009;color:#fff;font-family:"Satoshi",system-ui,sans-serif;font-size:12px;font-weight:700;display:none;align-items:center;justify-content:center;cursor:pointer;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)}'
    + 'body.wm-notes-on .wm-note-pin{display:flex}'
    + '.wm-note-pin.is-active{background:#2684FF;transform:scale(1.15)}'
    + '.wm-notes-panel{position:fixed;top:0;right:0;bottom:0;width:min(340px,90vw);background:#fff;border-left:1px solid #EEF0F4;box-shadow:-2px 0 24px rgba(0,0,0,.18);z-index:2147483001;transform:translateX(100%);transition:transform .26s ease;display:flex;flex-direction:column}'
    + '.wm-notes-panel.is-open{transform:translateX(0)}'
    + '.wm-notes-panel-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #EEF0F4;flex-shrink:0}'
    + '.wm-notes-panel-head strong{font-family:"Satoshi",system-ui,sans-serif;font-size:15px;color:#222733}'
    + '.wm-notes-panel-head button{border:none;background:none;cursor:pointer;color:#9AA2B2;padding:4px;display:flex}'
    + '.wm-notes-panel-head button svg{width:18px;height:18px}'
    + '.wm-notes-list{overflow-y:auto;padding:10px 12px 24px}'
    + '.wm-note-item{display:flex;gap:10px;padding:11px 10px;border-radius:8px;cursor:pointer}'
    + '.wm-note-item:hover,.wm-note-item.is-active{background:#F7F8FA}'
    + '.wm-note-num{flex-shrink:0;width:20px;height:20px;border-radius:50%;background:#F79009;color:#fff;font-family:"Satoshi",system-ui,sans-serif;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}'
    + '.wm-note-text{font-family:"Satoshi",system-ui,sans-serif;font-size:13.5px;line-height:1.5;color:#363D4D}'
    + '.wm-notes-empty{padding:24px;color:#9AA2B2;font-size:13px;text-align:center}'
    + '.wm-note-tip{position:fixed;z-index:2147483002;max-width:280px;padding:8px 11px;border-radius:8px;background:#1A1D24;color:#fff;font-family:"Satoshi",system-ui,sans-serif;font-size:12.5px;font-weight:500;line-height:1.45;box-shadow:0 8px 24px -8px rgba(0,0,0,.4);pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .12s ease,transform .12s ease}'
    + '.wm-note-tip.is-show{opacity:1;transform:none}';

  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  var btn = null, panel = null, listEl = null, tip = null, on = false, pins = [];
  function targets() { return $all('[data-wm-note]'); }

  function build() {
    btn = document.createElement('button');
    btn.className = 'wm-notes-toggle';
    btn.type = 'button';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span>Dev notes</span><span class="wm-notes-count"></span>';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
    panel = document.createElement('aside');
    panel.className = 'wm-notes-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Dev notes');
    panel.innerHTML = '<div class="wm-notes-panel-head"><strong>Dev notes</strong>'
      + '<button type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>'
      + '<div class="wm-notes-list"></div>';
    document.body.appendChild(panel);
    listEl = $('.wm-notes-list', panel);
    $('.wm-notes-panel-head button', panel).addEventListener('click', closePanel);
    tip = document.createElement('div');
    tip.className = 'wm-note-tip';
    document.body.appendChild(tip);
    document.addEventListener('mouseover', function (e) {
      if (!on) return;
      var el = e.target.closest('[data-wm-note]');
      if (el) showTip(el);
    });
    document.addEventListener('mouseout', function (e) {
      if (!on) return;
      var el = e.target.closest('[data-wm-note]');
      if (el && !el.contains(e.relatedTarget)) hideTip();
    });
    window.addEventListener('scroll', function () { if (on) hideTip(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); toggle(); }
    });
  }
  function showTip(el) {
    var note = el.getAttribute('data-wm-note');
    if (!note) return;
    tip.textContent = note;
    tip.classList.add('is-show');
    var r = el.getBoundingClientRect();
    var tr = tip.getBoundingClientRect();
    var top = r.top - tr.height - 10;
    if (top < 8) top = r.bottom + 10;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - tr.width - 8));
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('is-show'); }
  function openPanel() { if (panel) panel.classList.add('is-open'); }
  function closePanel() { if (panel) panel.classList.remove('is-open'); }

  function render() {
    var els = targets();
    $('.wm-notes-count', btn).textContent = els.length;
    pins.forEach(function (p) { if (p.parentNode) p.parentNode.removeChild(p); });
    pins = [];
    listEl.innerHTML = '';
    if (!els.length) { listEl.innerHTML = '<div class="wm-notes-empty">No notes on this screen.</div>'; return; }
    els.forEach(function (el, i) {
      var n = i + 1;
      // a <tr> can't host an absolutely-positioned pin — anchor it in the last cell
      var isRow = (el.tagName === 'TR');
      var host = isRow ? (el.lastElementChild || el) : el;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      var pin = document.createElement('span');
      pin.className = isRow ? 'wm-note-pin wm-note-pin--row' : 'wm-note-pin';
      pin.textContent = n;
      pin.addEventListener('click', function (e) { e.stopPropagation(); openPanel(); activate(i, true); });
      host.appendChild(pin);
      pins.push(pin);
      var item = document.createElement('div');
      item.className = 'wm-note-item';
      item.innerHTML = '<span class="wm-note-num">' + n + '</span><span class="wm-note-text"></span>';
      $('.wm-note-text', item).textContent = el.getAttribute('data-wm-note') || '';
      item.addEventListener('click', function () { openPanel(); activate(i, true); });
      listEl.appendChild(item);
    });
  }
  function activate(i, scroll) {
    pins.forEach(function (p, j) { p.classList.toggle('is-active', j === i); });
    $all('.wm-note-item', listEl).forEach(function (it, j) { it.classList.toggle('is-active', j === i); });
    if (scroll) { var els = targets(); if (els[i]) els[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  function show() { if (!btn) return; render(); document.body.classList.add('wm-notes-on'); btn.classList.add('is-on'); on = true; }
  function hide() { if (!btn) return; document.body.classList.remove('wm-notes-on'); closePanel(); hideTip(); btn.classList.remove('is-on'); on = false; }
  function toggle() { on ? hide() : show(); }
  function refresh() { if (!btn) { init(); return; } if (on) render(); else $('.wm-notes-count', btn).textContent = targets().length; }
  function init() {
    if (btn || !targets().length) return;
    build();
    $('.wm-notes-count', btn).textContent = targets().length;
    if (/[?&]notes(=1)?(&|$)/.test(location.search)) show();
  }

  function boot() {
    var style = document.createElement('style');
    style.setAttribute('data-wm-dev-notes', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    init();
    window.DevNotes = { init: init, show: show, hide: hide, toggle: toggle, refresh: refresh };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
