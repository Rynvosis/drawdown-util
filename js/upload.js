// Reusable file upload box with drag-and-drop

import { parseCSV } from './csv.js';

export function createUploadBox(label, options = {}) {
  const { hint, requiredColumns = [] } = options;

  const box = document.createElement('div');
  box.className = 'upload-box';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';

  const labelEl = document.createElement('div');
  labelEl.className = 'upload-label';
  labelEl.textContent = label;

  const hintEl = document.createElement('div');
  hintEl.className = 'upload-hint';
  hintEl.textContent = hint || 'Drop or click to browse';

  const statusEl = document.createElement('div');
  statusEl.className = 'upload-status';

  box.append(input, labelEl, hintEl, statusEl);

  let data = null;
  let onChangeCallback = null;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      const error = validate(parsed, requiredColumns);
      if (error) {
        data = null;
        box.classList.remove('loaded');
        box.classList.add('error');
        statusEl.textContent = `${file.name} — ${error}`;
      } else {
        data = parsed;
        box.classList.remove('error');
        box.classList.add('loaded');
        statusEl.textContent = `${file.name} — ${data.length} rows`;
      }
      if (onChangeCallback) onChangeCallback(data);
    };
    reader.readAsText(file);
  });

  box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('dragover'); });
  box.addEventListener('dragleave', () => box.classList.remove('dragover'));
  box.addEventListener('drop', e => {
    e.preventDefault();
    box.classList.remove('dragover');
    if (e.dataTransfer.files[0]) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });

  return {
    el: box,
    getData: () => data,
    onChange(cb) { onChangeCallback = cb; }
  };
}

function validate(rows, requiredColumns) {
  if (!rows.length) return 'empty or unreadable CSV';
  const have = new Set(Object.keys(rows[0]));
  const missing = requiredColumns.filter(c => !have.has(c));
  if (missing.length) return `missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')} — wrong file?`;
  return null;
}
