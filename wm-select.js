/* Wisemonk custom select — replaces the native OS option list with a branded
 * popup while leaving each <select> in place as the (already-styled) trigger.
 * Selecting an option writes back to the native select and fires input+change,
 * so every existing change handler and floating-label behaviour keeps working.
 *
 * Opt out per element with  <select data-wm-native>  (or any ancestor with it).
 * Re-scan after injecting selects dynamically with  window.wmSelectRefresh().
 */
(function () {
  'use strict';
  if (window.__wmSelectInit) return;
  window.__wmSelectInit = true;

  var CSS = [
    '.wm-select-pop{position:fixed;z-index:5000;display:none;min-width:160px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 12px 34px rgba(18,22,32,0.16);padding:6px;overflow-y:auto;font-family:"Satoshi",system-ui,sans-serif;}',
    '.wm-select-pop.is-open{display:block;animation:wmSelIn .13s ease;}',
    '@keyframes wmSelIn{from{opacity:.4;transform:translateY(-4px);}to{opacity:1;transform:none;}}',
    '.wm-select-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;color:#363D4D;line-height:1.3;}',
    '.wm-select-opt-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.wm-select-opt-check{width:16px;height:16px;flex-shrink:0;color:#2684FF;opacity:0;}',
    '.wm-select-opt.is-selected{color:#1A6FE0;font-weight:700;}',
    '.wm-select-opt.is-selected .wm-select-opt-check{opacity:1;}',
    '.wm-select-opt.is-active{background:#F1F6FF;}',
    '.wm-select-opt.is-disabled{color:#C4CAD6;cursor:default;}',
    '.wm-select-opt.is-disabled.is-active{background:transparent;}',
    '.wm-select-pop::-webkit-scrollbar{width:11px;}',
    '.wm-select-pop::-webkit-scrollbar-thumb{background:#DDE1E9;border-radius:8px;border:3px solid #fff;}',
    'select.wm-select-bound{cursor:pointer;}'
  ].join('');

  var style = document.createElement('style');
  style.id = 'wm-select-css';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  var pop = document.createElement('div');
  pop.className = 'wm-select-pop';
  pop.setAttribute('role', 'listbox');
  var popReady = false;
  function ensurePop() { if (!popReady && document.body) { document.body.appendChild(pop); popReady = true; } }

  var current = null;   // open <select>
  var items = [];       // [{el, opt, idx}]
  var activeIdx = -1;

  var CHECK = '<svg class="wm-select-opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function build(sel) {
    pop.innerHTML = '';
    items = [];
    Array.prototype.forEach.call(sel.options, function (opt, i) {
      if (opt.hidden) return;                       // skip hidden placeholders
      var el = document.createElement('div');
      el.className = 'wm-select-opt';
      el.setAttribute('role', 'option');
      if (opt.disabled) el.classList.add('is-disabled');
      if (i === sel.selectedIndex) el.classList.add('is-selected');
      var label = document.createElement('span');
      label.className = 'wm-select-opt-label';
      label.textContent = opt.textContent;
      el.appendChild(label);
      el.insertAdjacentHTML('beforeend', CHECK);
      el.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep focus on select
      el.addEventListener('click', function () { if (!opt.disabled) choose(i); });
      el.addEventListener('mousemove', function () { setActive(i); });
      pop.appendChild(el);
      items.push({ el: el, opt: opt, idx: i });
    });
  }

  function setActive(i) {
    activeIdx = i;
    items.forEach(function (it) { it.el.classList.toggle('is-active', it.idx === i); });
  }

  function position(sel) {
    var r = sel.getBoundingClientRect();
    pop.style.minWidth = r.width + 'px';
    pop.style.left = Math.round(r.left) + 'px';
    pop.style.maxHeight = 'none';
    var h = Math.min(pop.scrollHeight + 2, 300);
    var below = window.innerHeight - r.bottom - 10;
    var above = r.top - 10;
    if (below < h && above > below) {
      var ah = Math.min(h, above);
      pop.style.maxHeight = ah + 'px';
      pop.style.top = Math.round(r.top - ah - 6) + 'px';
    } else {
      pop.style.maxHeight = Math.min(h, below) + 'px';
      pop.style.top = Math.round(r.bottom + 6) + 'px';
    }
  }

  function open(sel) {
    ensurePop();
    if (current === sel) { close(); return; }
    current = sel;
    build(sel);
    pop.classList.add('is-open');
    position(sel);
    setActive(sel.selectedIndex);
    var sIt = items.filter(function (it) { return it.idx === sel.selectedIndex; })[0];
    if (sIt) sIt.el.scrollIntoView({ block: 'nearest' });
    sel.setAttribute('aria-expanded', 'true');
  }

  function close() {
    if (!current) return;
    current.removeAttribute('aria-expanded');
    current = null;
    pop.classList.remove('is-open');
  }

  function choose(i) {
    var sel = current;
    if (!sel) return;
    if (sel.selectedIndex !== i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close();
    try { sel.focus({ preventScroll: true }); } catch (e) { sel.focus(); }
  }

  function move(dir) {
    var i = activeIdx;
    do { i += dir; } while (i >= 0 && i < items.length && items[i].opt.disabled);
    if (i >= 0 && i < items.length) { setActive(i); items[i].el.scrollIntoView({ block: 'nearest' }); }
  }

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    switch (e.key) {
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break;
      case 'Enter': case ' ':
        e.preventDefault(); e.stopPropagation();
        if (activeIdx >= 0 && items[activeIdx] && !items[activeIdx].opt.disabled) choose(activeIdx);
        break;
      case 'ArrowDown': e.preventDefault(); e.stopPropagation(); move(1); break;
      case 'ArrowUp': e.preventDefault(); e.stopPropagation(); move(-1); break;
      case 'Tab': close(); break;
    }
  }, true);

  document.addEventListener('mousedown', function (e) {
    if (current && !pop.contains(e.target) && e.target !== current) close();
  }, true);
  window.addEventListener('scroll', function () { if (current) close(); }, true);
  window.addEventListener('resize', function () { if (current) close(); });

  function skip(sel) {
    return sel.multiple || sel.size > 1 || sel.hasAttribute('data-wm-native') || !!sel.closest('[data-wm-native]');
  }

  function attach(sel) {
    if (sel.__wmSel || skip(sel)) return;
    sel.__wmSel = true;
    sel.classList.add('wm-select-bound');
    sel.addEventListener('mousedown', function (e) { if (sel.disabled) return; e.preventDefault(); sel.focus(); open(sel); });
    sel.addEventListener('click', function (e) { e.preventDefault(); });
    sel.addEventListener('keydown', function (e) {
      if (current === sel || sel.disabled) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(sel); }
    });
  }

  function scan() { Array.prototype.forEach.call(document.querySelectorAll('select'), attach); }
  window.wmSelectRefresh = scan;

  // Enhance selects added later (e.g. cloned from <template>).
  function observe() {
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'SELECT') attach(n);
          else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('select'), attach);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() { scan(); observe(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
