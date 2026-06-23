/* ============================================================================
   Wisemonk client wallet — tiny shared store for FX surplus credits.

   Money in:  pay.html credits the surplus left over when a payment converts
              favourably at the locked FX rate (if the client opts to keep it).
   Money out: pay.html debits credit applied toward a future invoice payment.
   Display:   wallet.html reads the balance + ledger and renders them.

   State lives in localStorage so it persists across the static pages:
     wm_wallet_balance → number (USD)
     wm_wallet_ledger  → [{ date, type:'credit'|'debit', amount, ref, note, balanceAfter }]
   ========================================================================== */
(function () {
  'use strict';
  var KB = 'wm_wallet_balance', KL = 'wm_wallet_ledger';

  function round2(v) { return Math.round((parseFloat(v) || 0) * 100) / 100; }
  function balance() { return round2(localStorage.getItem(KB)); }
  function setBalance(v) { localStorage.setItem(KB, String(round2(v))); }
  function ledger() { try { return JSON.parse(localStorage.getItem(KL)) || []; } catch (e) { return []; } }
  function writeLedger(l) { localStorage.setItem(KL, JSON.stringify(l)); }

  function todayLabel() {
    var d = new Date();
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // Record a movement, update the running balance, and prepend it to the ledger
  // (newest first). Returns the new balance.
  function record(type, amount, ref, note, date) {
    amount = round2(amount);
    if (amount <= 0) return balance();
    var bal = round2(balance() + (type === 'credit' ? amount : -amount));
    if (bal < 0) bal = 0;
    setBalance(bal);
    var l = ledger();
    l.unshift({ date: date || todayLabel(), type: type, amount: amount, ref: ref || '', note: note || '', balanceAfter: bal });
    writeLedger(l);
    return bal;
  }
  function credit(amount, ref, note, date) { return record('credit', amount, ref, note, date); }
  function debit(amount, ref, note, date) { return record('debit', amount, ref, note, date); }

  // First-run sample data so the wallet screen demos with content.
  function seedIfEmpty() {
    if (localStorage.getItem(KL) !== null) return;
    writeLedger([
      { date: 'Jun 12, 2026', type: 'credit', amount: 42.10, ref: '#INV-1034', note: 'Payment surplus', balanceAfter: 60.85 },
      { date: 'May 28, 2026', type: 'credit', amount: 18.75, ref: '#INV-1029', note: 'Payment surplus', balanceAfter: 18.75 }
    ]);
    setBalance(60.85);
  }

  seedIfEmpty();
  window.WMWallet = { balance: balance, ledger: ledger, credit: credit, debit: debit };
})();
