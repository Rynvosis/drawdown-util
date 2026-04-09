// Main app — registers drawdown modules and manages tabs.
//
// To add a new drawdown type:
// 1. Create a new file in js/drawdowns/  (copy payment-type.js as a template)
// 2. Export: id, label, setup(panelContainer)
// 3. Import it below and add it to the DRAWDOWNS array

import * as paymentType from './drawdowns/payment-type.js';

const DRAWDOWNS = [
  paymentType,
  // Add new drawdown modules here:
  // import * as newType from './drawdowns/new-type.js';
  // then add: newType,
];

// ── Bootstrap ──
const tabsEl = document.getElementById('tabs');
const panelsEl = document.getElementById('panels');

DRAWDOWNS.forEach((mod, i) => {
  const tab = document.createElement('button');
  tab.className = 'tab' + (i === 0 ? ' active' : '');
  tab.textContent = mod.label;
  tab.dataset.type = mod.id;
  tabsEl.appendChild(tab);

  mod.setup(panelsEl);

  // Hide non-first panels
  if (i > 0) {
    document.getElementById(`drawdown-${mod.id}`).style.display = 'none';
  }
});

// Tab switching
tabsEl.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.drawdown-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('drawdown-' + tab.dataset.type);
  if (panel) panel.style.display = '';

  // Reset results when switching
  document.getElementById('results').style.display = 'none';
});
