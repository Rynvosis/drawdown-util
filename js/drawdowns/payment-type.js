// Transactions by Payment Type
// Cross-references Payment Type CSV with Transactions CSV.
// User selects which payment methods count as "Room Billing" — the rest are "Till Payments".
// Groups both sets by GL code.

import { createUploadBox } from '../upload.js';
import {
  fmt, cleanStaffName, cleanGroupName, formatDate,
  renderSummaryCards, buildSheetSection
} from '../render.js';

export const id = 'payment-type';
export const label = 'Transactions by Payment Type';

export function setup(panelContainer) {
  const panel = document.createElement('div');
  panel.className = 'drawdown-panel';
  panel.id = `drawdown-${id}`;

  const uploadArea = document.createElement('div');
  uploadArea.className = 'upload-area';

  const paymentUpload = createUploadBox('Payment Type CSV');
  const transactionUpload = createUploadBox('Transactions CSV');
  uploadArea.append(paymentUpload.el, transactionUpload.el);

  // Method picker — shown after payment CSV is loaded
  const pickerWrap = document.createElement('div');
  pickerWrap.className = 'method-picker';
  pickerWrap.style.display = 'none';

  const pickerLabel = document.createElement('div');
  pickerLabel.className = 'picker-label';
  pickerLabel.textContent = 'Select room billing methods:';

  const pickerList = document.createElement('div');
  pickerList.className = 'picker-list';

  pickerWrap.append(pickerLabel, pickerList);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const processBtn = document.createElement('button');
  processBtn.className = 'btn';
  processBtn.disabled = true;
  processBtn.textContent = 'Process';

  const info = document.createElement('span');
  info.className = 'info';

  actions.append(processBtn, info);
  panel.append(uploadArea, pickerWrap, actions);
  panelContainer.appendChild(panel);

  // When payment CSV loads, detect methods and show picker
  paymentUpload.onChange(data => {
    const methods = new Set();
    for (const p of data) {
      const m = cleanMethodName(p.Method || '');
      if (m) methods.add(m);
    }

    pickerList.innerHTML = '';
    for (const m of [...methods].sort()) {
      const label = document.createElement('label');
      label.className = 'picker-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = m;
      // Auto-check anything that looks like room billing
      if (m.toLowerCase().includes('charge to room') || m.toLowerCase().includes('bill to room')) {
        cb.checked = true;
      }
      const span = document.createElement('span');
      span.textContent = m;
      label.append(cb, span);
      pickerList.appendChild(label);
    }

    pickerWrap.style.display = methods.size > 0 ? '' : 'none';
    checkReady();
  });

  transactionUpload.onChange(checkReady);

  function checkReady() {
    const ready = paymentUpload.getData() && transactionUpload.getData();
    processBtn.disabled = !ready;
    info.textContent = ready ? 'Ready to process.' : '';
  }

  processBtn.addEventListener('click', () => {
    const roomMethods = new Set(
      [...pickerList.querySelectorAll('input:checked')].map(cb => cb.value)
    );
    process(paymentUpload.getData(), transactionUpload.getData(), roomMethods);
  });
}

function cleanMethodName(m) {
  return m.replace(/\(\d+\)$/, '').trim();
}

function process(payments, transactions, roomMethods) {
  const accountMethod = {};
  const accountRef = {};
  for (const p of payments) {
    accountMethod[p.Account] = cleanMethodName(p.Method || '');
    accountRef[p.Account] = p.PaymentRef || '';
  }

  const room = [];
  const till = [];
  let unmatched = 0;

  for (const t of transactions) {
    const method = accountMethod[t.Account];
    if (method === undefined) { unmatched++; continue; }

    const entry = {
      _glCode: cleanGroupName(t.Group),
      _date: (t.Date || '').split(' ')[0] || '',
      _time: (t.Date || '').split(' ')[1] || '',
      _item: t.Item || '',
      _staff: cleanStaffName(t.Staff),
      _ref: accountRef[t.Account] || '',
      _qty: t.Qty || '0',
      _unitPrice: parseFloat(t.UnitPrice) || 0,
      _discount: parseFloat(t.Discount) || 0,
      _finalPrice: parseFloat(t.FinalPrice) || 0,
      _preTax: parseFloat(t.PreTax) || 0,
      _taxAmount: parseFloat(t.TaxAmount) || 0,
      _taxName: t.TaxName || '',
    };

    if (roomMethods.has(method)) room.push(entry);
    else till.push(entry);
  }

  render(room, till, unmatched);
}

const COLUMNS = [
  { key: '_glCode', label: 'GL Code', style: 'color:var(--text-muted);font-size:0.75rem' },
  { key: '_date', label: 'Date', format: v => formatDate(v) },
  { key: '_time', label: 'Time' },
  { key: '_item', label: 'Item', title: true },
  { key: '_staff', label: 'Staff' },
  { key: '_ref', label: 'Ref', style: 'font-size:0.75rem' },
  { key: '_qty', label: 'Qty', num: true },
  { key: '_unitPrice', label: 'Unit Price', num: true, currency: true },
  { key: '_discount', label: 'Discount', num: true, currency: true },
  { key: '_finalPrice', label: 'Final Price', num: true, currency: true, totalHighlight: true },
  { key: '_preTax', label: 'Pre-Tax', num: true, currency: true },
  { key: '_taxAmount', label: 'VAT', num: true, currency: true },
  { key: '_taxName', label: 'Tax Rate', style: 'font-size:0.75rem' },
];

function render(room, till, unmatched) {
  document.getElementById('results').style.display = 'block';

  const roomTotal = room.reduce((s, e) => s + e._finalPrice, 0);
  const tillTotal = till.reduce((s, e) => s + e._finalPrice, 0);

  renderSummaryCards(document.getElementById('summaryCards'), [
    { label: 'Room Billing', value: `\u00A3${fmt(roomTotal)}`, color: 'green' },
    { label: 'Till Payments', value: `\u00A3${fmt(tillTotal)}`, color: 'orange' },
    { label: 'Grand Total', value: `\u00A3${fmt(roomTotal + tillTotal)}` },
    { label: 'Transactions', value: `${room.length + till.length}${unmatched ? ` (${unmatched} unmatched)` : ''}` },
  ]);

  const sections = document.getElementById('reportSections');
  sections.innerHTML = '';
  sections.appendChild(buildSheetSection('Room Billing', room, COLUMNS, e => e._glCode, 'green'));
  sections.appendChild(buildSheetSection('Till Payments', till, COLUMNS, e => e._glCode, 'orange'));
}
