/* ==========================================================================
   Toggle Docs — Table Insertion & Editing Module (ES module)
   Google Docs-style table creation, contextual row/column manipulation,
   and clean HTML table management.
   ========================================================================== */
'use strict';

import { showToast } from './state.js';
import { scheduleAutoSave } from './documents.js';
import { Editor } from './editor.js';

let modalEl = null;
let activeTableCell = null;

export function initTableControls() {
  modalEl = document.getElementById('modal-table');
  if (!modalEl) return;

  const btnInsert = document.getElementById('btn-table-insert');
  const btnCancel = modalEl.querySelector('.modal-close');
  const rowsInput = document.getElementById('table-rows-input');
  const colsInput = document.getElementById('table-cols-input');
  const headerCheck = document.getElementById('table-header-check');

  if (btnInsert && rowsInput && colsInput) {
    btnInsert.addEventListener('click', () => {
      const rows = parseInt(rowsInput.value, 10) || 3;
      const cols = parseInt(colsInput.value, 10) || 3;
      const hasHeader = headerCheck ? headerCheck.checked : true;

      insertTable(rows, cols, hasHeader);
      closeTableModal();
    });
  }

  // Visual grid selector if present
  const gridPicker = document.getElementById('table-grid-picker');
  if (gridPicker) {
    setupGridPicker(gridPicker, rowsInput, colsInput);
  }

  // Detect when cursor is inside a table to show contextual table controls
  document.addEventListener('selectionchange', onCellSelectionChange);
}

function setupGridPicker(container, rowsInput, colsInput) {
  container.innerHTML = '';
  const maxRows = 6;
  const maxCols = 6;

  for (let r = 1; r <= maxRows; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-picker-row';
    for (let c = 1; c <= maxCols; c++) {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'grid-picker-cell';
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;

      cellDiv.addEventListener('mouseenter', () => {
        highlightGrid(container, r, c);
        if (rowsInput) rowsInput.value = r;
        if (colsInput) colsInput.value = c;
        const label = document.getElementById('table-grid-label');
        if (label) label.textContent = `${r} × ${c}`;
      });

      cellDiv.addEventListener('click', () => {
        const headerCheck = document.getElementById('table-header-check');
        const hasHeader = headerCheck ? headerCheck.checked : true;
        insertTable(r, c, hasHeader);
        closeTableModal();
      });

      rowDiv.appendChild(cellDiv);
    }
    container.appendChild(rowDiv);
  }
}

function highlightGrid(container, maxR, maxC) {
  const cells = container.querySelectorAll('.grid-picker-cell');
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    cell.classList.toggle('highlighted', r <= maxR && c <= maxC);
  });
}

export function openTableModal() {
  if (!modalEl) initTableControls();
  if (!modalEl) return;

  modalEl.classList.remove('hidden');
  const rowsInput = document.getElementById('table-rows-input');
  if (rowsInput) {
    rowsInput.focus();
    rowsInput.select();
  }
}

export function closeTableModal() {
  if (modalEl) modalEl.classList.add('hidden');
}

export function insertTable(rows = 3, cols = 3, hasHeader = true) {
  const editor = document.getElementById('editor');
  if (!editor) return;

  editor.focus();

  // Clamp rows & columns to sensible bounds
  rows = Math.max(1, Math.min(rows, 20));
  cols = Math.max(1, Math.min(cols, 12));

  let tableHtml = '<table class="gdocs-table"><tbody>';

  for (let r = 0; r < rows; r++) {
    tableHtml += '<tr>';
    for (let c = 0; c < cols; c++) {
      if (r === 0 && hasHeader) {
        tableHtml += '<th scope="col"><p>Header ' + (c + 1) + '</p></th>';
      } else {
        tableHtml += '<td><p><br></p></td>';
      }
    }
    tableHtml += '</tr>';
  }

  tableHtml += '</tbody></table><p><br></p>';

  document.execCommand('insertHTML', false, tableHtml);
  scheduleAutoSave();
  Editor.updateStats();
  showToast(`Inserted ${rows}×${cols} table`);
}

function onCellSelectionChange() {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) {
    updateContextualBar(null);
    return;
  }

  let node = sel.anchorNode;
  if (node.nodeType === 3) node = node.parentNode;

  while (node && node !== document.body && !['TD', 'TH'].includes(node.nodeName)) {
    node = node.parentNode;
  }

  if (node && ['TD', 'TH'].includes(node.nodeName)) {
    activeTableCell = node;
    updateContextualBar(node);
  } else {
    activeTableCell = null;
    updateContextualBar(null);
  }
}

function updateContextualBar(cellNode) {
  const bar = document.getElementById('table-context-toolbar');
  if (!bar) return;

  if (cellNode) {
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

export function insertRow(position = 'below') {
  if (!activeTableCell) {
    showToast('Click inside a table cell first');
    return;
  }

  const row = activeTableCell.closest('tr');
  const table = activeTableCell.closest('table');
  if (!row || !table) return;

  const colCount = row.cells.length;
  const newRow = document.createElement('tr');

  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.innerHTML = '<p><br></p>';
    newRow.appendChild(td);
  }

  if (position === 'above') {
    row.parentNode.insertBefore(newRow, row);
  } else {
    if (row.nextSibling) {
      row.parentNode.insertBefore(newRow, row.nextSibling);
    } else {
      row.parentNode.appendChild(newRow);
    }
  }

  scheduleAutoSave();
  showToast('Row added ' + position);
}

export function insertColumn(position = 'right') {
  if (!activeTableCell) {
    showToast('Click inside a table cell first');
    return;
  }

  const cell = activeTableCell;
  const colIndex = cell.cellIndex;
  const table = cell.closest('table');
  if (!table) return;

  const rows = table.rows;
  for (let r = 0; r < rows.length; r++) {
    const isHeader = rows[r].cells[colIndex] && rows[r].cells[colIndex].nodeName === 'TH';
    const newCell = document.createElement(isHeader ? 'th' : 'td');
    newCell.innerHTML = '<p><br></p>';

    if (position === 'left') {
      rows[r].insertBefore(newCell, rows[r].cells[colIndex]);
    } else {
      const nextCell = rows[r].cells[colIndex + 1];
      if (nextCell) {
        rows[r].insertBefore(newCell, nextCell);
      } else {
        rows[r].appendChild(newCell);
      }
    }
  }

  scheduleAutoSave();
  showToast('Column added ' + position);
}

export function deleteCurrentRow() {
  if (!activeTableCell) return;
  const row = activeTableCell.closest('tr');
  const table = activeTableCell.closest('table');
  if (!row || !table) return;

  if (table.rows.length <= 1) {
    table.parentNode.removeChild(table);
  } else {
    row.parentNode.removeChild(row);
  }

  activeTableCell = null;
  updateContextualBar(null);
  scheduleAutoSave();
  showToast('Row deleted');
}

export function deleteCurrentColumn() {
  if (!activeTableCell) return;
  const cell = activeTableCell;
  const colIndex = cell.cellIndex;
  const table = cell.closest('table');
  if (!table) return;

  const rows = table.rows;
  if (rows[0].cells.length <= 1) {
    table.parentNode.removeChild(table);
    activeTableCell = null;
    updateContextualBar(null);
    scheduleAutoSave();
    showToast('Table deleted');
    return;
  }

  for (let r = 0; r < rows.length; r++) {
    if (rows[r].cells[colIndex]) {
      rows[r].deleteCell(colIndex);
    }
  }

  activeTableCell = null;
  updateContextualBar(null);
  scheduleAutoSave();
  showToast('Column deleted');
}

export function deleteCurrentTable() {
  if (!activeTableCell) return;
  const table = activeTableCell.closest('table');
  if (table && table.parentNode) {
    table.parentNode.removeChild(table);
    activeTableCell = null;
    updateContextualBar(null);
    scheduleAutoSave();
    showToast('Table removed');
  }
}
