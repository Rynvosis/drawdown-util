// Shared rendering utilities for drawdown output

export function fmt(n) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtCell(n) {
  if (n === 0) return '<span class="cell-zero">0.00</span>';
  if (n < 0) return `<span class="cell-negative">(${fmt(Math.abs(n))})</span>`;
  return fmt(n);
}

export function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function cleanStaffName(s) {
  if (!s) return '';
  return s.replace(/\(\d+\)$/, '').trim();
}

export function cleanGroupName(g) {
  if (!g) return 'Unknown';
  return g.replace(/\(\d+\)$/, '').trim() || g;
}

export function formatDate(d) {
  if (!d) return '';
  const [day, month] = d.split('/');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[parseInt(month, 10) - 1] || month}`;
}

export function groupByKey(entries, keyFn) {
  const groups = {};
  for (const e of entries) {
    const k = keyFn(e);
    if (!groups[k]) groups[k] = [];
    groups[k].push(e);
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}

export function renderSummaryCards(container, cards) {
  container.innerHTML = cards.map(c => `
    <div class="card">
      <div class="card-label">${c.label}</div>
      <div class="card-value ${c.color || ''}">${c.value}</div>
    </div>
  `).join('');
}

export function buildSheetSection(title, entries, columns, groupKeyFn, color) {
  const section = document.createElement('div');
  section.className = 'section';

  const groups = groupByKey(entries, groupKeyFn);

  // Totals
  const totals = {};
  for (const col of columns) {
    if (col.num && col.key) {
      totals[col.key] = entries.reduce((s, e) => s + (Number(e[col.key]) || 0), 0);
    }
  }

  const totalValue = totals[columns.find(c => c.totalHighlight)?.key] || 0;

  section.innerHTML = `
    <div class="section-header">
      <div>
        <span class="section-title">${title}</span>
        <span class="section-badge ${color}">${entries.length} items &bull; &pound;${fmt(totalValue)}</span>
        <span class="section-meta">${groups.length} GL groups</span>
      </div>
      <button class="export-btn">Export CSV</button>
    </div>
  `;

  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';

  const table = document.createElement('table');

  // Sort state
  let sortCol = null;
  let sortAsc = true;

  // Header with sortable columns
  const thead = document.createElement('thead');
  const headTr = document.createElement('tr');
  const rowNumTh = document.createElement('th');
  rowNumTh.className = 'row-num';
  rowNumTh.textContent = '#';
  headTr.appendChild(rowNumTh);

  columns.forEach((c, i) => {
    const th = document.createElement('th');
    th.className = (c.num ? 'num ' : '') + 'sortable';
    th.innerHTML = `${c.label} <span class="sort-indicator"></span>`;
    th.addEventListener('click', () => {
      if (sortCol === i) {
        sortAsc = !sortAsc;
      } else {
        sortCol = i;
        sortAsc = true;
      }
      updateSortIndicators(headTr, columns, sortCol, sortAsc);
      renderBody();
    });
    headTr.appendChild(th);
  });
  thead.appendChild(headTr);
  table.appendChild(thead);

  // Tfoot
  const tfoot = document.createElement('tfoot');
  tfoot.innerHTML = `<tr>
    <td class="row-num"></td>
    ${columns.map((c, i) => {
      if (i === 0) return `<td><strong>TOTAL</strong></td>`;
      if (!c.num) return '<td></td>';
      const val = totals[c.key] || 0;
      if (!c.currency) return `<td class="num">${Math.round(val)}</td>`;
      const bold = c.totalHighlight ? '<strong>' : '';
      const boldEnd = c.totalHighlight ? '</strong>' : '';
      return `<td class="num">${bold}&pound;${fmt(val)}${boldEnd}</td>`;
    }).join('')}
  </tr>`;
  table.appendChild(tfoot);

  // Tbody — rebuilt on sort
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  function renderBody() {
    tbody.innerHTML = '';
    let rowNum = 0;

    // Sort entries within each group if a sort column is active
    const sortedGroups = groups.map(([name, items]) => {
      if (sortCol === null) return [name, items];
      const col = columns[sortCol];
      const sorted = [...items].sort((a, b) => {
        const av = a[col.key], bv = b[col.key];
        let cmp;
        if (col.num) {
          cmp = (Number(av) || 0) - (Number(bv) || 0);
        } else {
          cmp = String(av || '').localeCompare(String(bv || ''));
        }
        return sortAsc ? cmp : -cmp;
      });
      return [name, sorted];
    });

    for (const [groupName, items] of sortedGroups) {
      const groupId = 'g-' + Math.random().toString(36).slice(2, 8);

      const gTotals = {};
      for (const col of columns) {
        if (col.num && col.key) {
          gTotals[col.key] = items.reduce((s, e) => s + (Number(e[col.key]) || 0), 0);
        }
      }

      const headerRow = document.createElement('tr');
      headerRow.className = 'gl-group-header';
      headerRow.innerHTML = `
        <td class="row-num"></td>
        ${columns.map((c, i) => {
          if (i === 0) return `<td><span class="toggle-arrow" data-group="${groupId}">&#9660;</span>${groupName} <span style="font-weight:400;color:var(--text-muted)">(${items.length})</span></td>`;
          if (!c.num) return '<td></td>';
          if (!c.currency) return `<td class="num">${Math.round(gTotals[c.key] || 0)}</td>`;
          return `<td class="num">${c.key === '_discount' && gTotals[c.key] === 0 ? '—' : '&pound;' + fmt(gTotals[c.key] || 0)}</td>`;
        }).join('')}
      `;
      headerRow.addEventListener('click', () => toggleGroup(groupId));
      tbody.appendChild(headerRow);

      for (const e of items) {
        rowNum++;
        const row = document.createElement('tr');
        row.className = `${groupId} detail`;
        row.innerHTML = `<td class="row-num">${rowNum}</td>` +
          columns.map(c => {
            const val = e[c.key];
            const numVal = Number(val) || 0;
            if (c.num) {
              if (c.key === '_discount' && numVal === 0) return '<td class="num"><span class="cell-zero">—</span></td>';
              const cellClass = c.totalHighlight ? 'num cell-currency' : 'num';
              const bold = c.totalHighlight;
              return `<td class="${cellClass}">${bold ? '<strong>' : ''}${fmtCell(numVal)}${bold ? '</strong>' : ''}</td>`;
            }
            const style = c.style || '';
            const titleAttr = c.title ? ` title="${escapeAttr(String(val || ''))}"` : '';
            return `<td${titleAttr} style="${style}">${c.format ? c.format(val, e) : escapeHtml(String(val || ''))}</td>`;
          }).join('');
        tbody.appendChild(row);
      }
    }
  }

  renderBody();

  wrap.appendChild(table);
  section.appendChild(wrap);

  section.querySelector('.export-btn').addEventListener('click', () => {
    exportCSV(title, columns, entries);
  });

  return section;
}

function updateSortIndicators(headTr, columns, sortCol, sortAsc) {
  const ths = headTr.querySelectorAll('th.sortable');
  ths.forEach((th, i) => {
    const indicator = th.querySelector('.sort-indicator');
    if (i === sortCol) {
      indicator.textContent = sortAsc ? '\u25B2' : '\u25BC';
    } else {
      indicator.textContent = '';
    }
  });
}

function toggleGroup(groupId) {
  const rows = document.querySelectorAll('.' + groupId + '.detail');
  const arrow = document.querySelector(`.toggle-arrow[data-group="${groupId}"]`);
  const hidden = rows[0]?.classList.contains('hidden-row');
  rows.forEach(r => r.classList.toggle('hidden-row', !hidden));
  arrow?.classList.toggle('collapsed', !hidden);
}

function exportCSV(title, columns, entries) {
  const headers = columns.map(c => c.label);
  let csv = headers.join(',') + '\n';
  for (const e of entries) {
    const row = columns.map(c => {
      let val = e[c.exportKey || c.key] || '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csv += row.join(',') + '\n';
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-drawdown.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
