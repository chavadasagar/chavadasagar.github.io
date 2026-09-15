/**
 * Table Module
 * Transforms standard markdown tables into interactive, high-performance datagrids.
 * Supports sorting, global search, column filters, resizable columns, row selection,
 * and multi-format exports (Excel, CSV, JSON, HTML, Markdown).
 * Attached to window.TableHandler.
 */

window.TableHandler = {
    makeTablesInteractive(container) {
        const tables = container.querySelectorAll('table');
        tables.forEach((table, index) => {
            if (table.closest('.rich-table-wrapper')) return;
            
            try {
                processTable(table, index + 1);
            } catch (e) {
                console.error('Error making table interactive:', e);
            }
        });
    }
};

function processTable(table, tableNum) {
    const parent = table.parentNode;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'rich-table-wrapper search-exclude';
    
    wrapper.innerHTML = `
        <div class="rich-table-toolbar">
            <div class="table-info">
                <span class="material-icons-round table-icon">grid_on</span>
                <span class="table-title">Table ${tableNum}</span>
                <span class="selection-count hidden">0 rows selected</span>
            </div>
            <div class="table-actions">
                <input type="text" class="table-search-input" placeholder="Search table...">
                
                <div class="dropdown-wrapper">
                    <button class="table-btn btn-export" title="Export"><span class="material-icons-round">shortcut</span> Export</button>
                    <div class="dropdown-menu">
                        <button class="export-format-btn" data-format="excel">Export Excel (.xlsx)</button>
                        <button class="export-format-btn" data-format="csv">Export CSV (.csv)</button>
                        <button class="export-format-btn" data-format="json">Export JSON (.json)</button>
                        <button class="export-format-btn" data-format="html">Export HTML</button>
                        <button class="export-format-btn" data-format="markdown">Export Markdown</button>
                    </div>
                </div>
                
                <div class="dropdown-wrapper">
                    <button class="table-btn btn-copy" title="Copy to Clipboard"><span class="material-icons-round">content_copy</span> Copy</button>
                    <div class="dropdown-menu">
                        <button class="copy-format-btn" data-scope="all">Copy All</button>
                        <button class="copy-format-btn disabled" data-scope="selected" id="copy-selected-btn">Copy Selected</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'rich-table-scroll-container';
    
    parent.replaceChild(wrapper, table);
    wrapper.appendChild(scrollContainer);
    scrollContainer.appendChild(table);

    table.classList.add('rich-table');

    const thead = table.querySelector('thead');
    if (!thead) return;

    const originalRows = thead.querySelectorAll('tr');
    if (originalRows.length === 0) return;
    const headerRow = originalRows[0];
    const ths = Array.from(headerRow.querySelectorAll('th'));

    const cbHeader = document.createElement('th');
    cbHeader.className = 'cb-col';
    cbHeader.innerHTML = '<input type="checkbox" class="select-all-rows">';
    headerRow.insertBefore(cbHeader, headerRow.firstChild);

    const tbody = table.querySelector('tbody');
    const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    
    rows.forEach(row => {
        const cbCell = document.createElement('td');
        cbCell.className = 'cb-cell';
        cbCell.innerHTML = '<input type="checkbox" class="select-row">';
        row.insertBefore(cbCell, row.firstChild);
    });

    const filterRow = document.createElement('tr');
    filterRow.className = 'column-filter-row';
    
    const emptyFilter = document.createElement('th');
    emptyFilter.className = 'cb-col-filter';
    filterRow.appendChild(emptyFilter);
    
    ths.forEach((th, i) => {
        const filterTh = document.createElement('th');
        filterTh.innerHTML = `<input type="text" class="col-filter-input" placeholder="Filter..." data-col-index="${i + 1}">`;
        filterRow.appendChild(filterTh);
    });
    thead.appendChild(filterRow);

    ths.forEach((th, i) => {
        const thContent = document.createElement('span');
        thContent.className = 'th-text';
        thContent.innerHTML = th.innerHTML;
        th.innerHTML = '';
        th.appendChild(thContent);

        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator material-icons-round';
        th.appendChild(indicator);

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        th.appendChild(resizeHandle);

        setupColumnResize(th, resizeHandle);
        setupColumnSorting(table, th, i + 1);
    });

    setupSelection(table, wrapper);
    setupSearching(table, wrapper);
    setupExportHandlers(table, wrapper, ths);
}

function setupColumnResize(th, handle) {
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        startWidth = th.offsetWidth;
        document.documentElement.style.cursor = 'col-resize';

        const doDrag = (ev) => {
            const width = startWidth + (ev.clientX - startX);
            th.style.width = `${Math.max(50, width)}px`;
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.documentElement.style.cursor = '';
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });
}

function setupColumnSorting(table, th, colIndex) {
    let sortDirection = 'none';
    const indicator = th.querySelector('.sort-indicator');

    th.addEventListener('click', (e) => {
        if (e.target.classList.contains('resize-handle')) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        const parentHeader = th.parentNode;
        parentHeader.querySelectorAll('.sort-indicator').forEach(ind => {
            if (ind !== indicator) ind.textContent = '';
        });
        parentHeader.querySelectorAll('th').forEach(header => {
            if (header !== th) header.setAttribute('data-sort', 'none');
        });

        if (sortDirection === 'none' || sortDirection === 'desc') {
            sortDirection = 'asc';
            indicator.textContent = 'arrow_upward';
            th.setAttribute('data-sort', 'asc');
        } else {
            sortDirection = 'desc';
            indicator.textContent = 'arrow_downward';
            th.setAttribute('data-sort', 'desc');
        }

        const isNumeric = rows.every(row => {
            const val = row.cells[colIndex].textContent.trim().replace(/[\$,]/g, '');
            return val === '' || !isNaN(Number(val));
        });

        rows.sort((a, b) => {
            let valA = a.cells[colIndex].textContent.trim();
            let valB = b.cells[colIndex].textContent.trim();

            if (isNumeric) {
                valA = valA === '' ? -Infinity : Number(valA.replace(/[\$,]/g, ''));
                valB = valB === '' ? -Infinity : Number(valB.replace(/[\$,]/g, ''));
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            } else {
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }
        });

        rows.forEach(row => tbody.appendChild(row));
    });
}

function setupSelection(table, wrapper) {
    const selectAllCb = table.querySelector('.select-all-rows');
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rowCbs = tbody.querySelectorAll('.select-row');
    const selectionCountLabel = wrapper.querySelector('.selection-count');
    const copySelectedBtn = wrapper.querySelector('#copy-selected-btn');

    const updateSelectionUI = () => {
        const selectedCount = tbody.querySelectorAll('.select-row:checked').length;
        
        if (selectedCount > 0) {
            selectionCountLabel.classList.remove('hidden');
            selectionCountLabel.textContent = `${selectedCount} row${selectedCount > 1 ? 's' : ''} selected`;
            copySelectedBtn.classList.remove('disabled');
        } else {
            selectionCountLabel.classList.add('hidden');
            copySelectedBtn.classList.add('disabled');
        }

        if (selectedCount === 0) {
            selectAllCb.checked = false;
            selectAllCb.indeterminate = false;
        } else if (selectedCount === rowCbs.length) {
            selectAllCb.checked = true;
            selectAllCb.indeterminate = false;
        } else {
            selectAllCb.checked = false;
            selectAllCb.indeterminate = true;
        }
    };

    selectAllCb.addEventListener('change', () => {
        const checked = selectAllCb.checked;
        tbody.querySelectorAll('tr').forEach(row => {
            const cb = row.querySelector('.select-row');
            if (cb) {
                cb.checked = checked;
                if (checked) {
                    row.classList.add('row-selected');
                } else {
                    row.classList.remove('row-selected');
                }
            }
        });
        updateSelectionUI();
    });

    tbody.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-row')) {
            const row = e.target.closest('tr');
            if (e.target.checked) {
                row.classList.add('row-selected');
            } else {
                row.classList.remove('row-selected');
            }
            updateSelectionUI();
        }
    });
}

function setupSearching(table, wrapper) {
    const searchInput = wrapper.querySelector('.table-search-input');
    const colFilterInputs = table.querySelectorAll('.col-filter-input');
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');

    const filterTable = () => {
        const query = searchInput.value.toLowerCase().trim();
        const filters = {};
        colFilterInputs.forEach(input => {
            const val = input.value.toLowerCase().trim();
            if (val !== '') {
                filters[input.getAttribute('data-col-index')] = val;
            }
        });

        rows.forEach(row => {
            let matchesGlobal = false;
            let matchesColumns = true;
            const cells = Array.from(row.cells);
            
            for (let i = 1; i < cells.length; i++) {
                if (cells[i].textContent.toLowerCase().includes(query)) {
                    matchesGlobal = true;
                    break;
                }
            }
            if (query === '') matchesGlobal = true;

            for (const colIdx in filters) {
                const filterVal = filters[colIdx];
                const cellVal = cells[colIdx].textContent.toLowerCase();
                if (!cellVal.includes(filterVal)) {
                    matchesColumns = false;
                    break;
                }
            }

            if (matchesGlobal && matchesColumns) {
                row.classList.remove('row-filtered');
            } else {
                row.classList.add('row-filtered');
            }
        });
    };

    searchInput.addEventListener('input', filterTable);
    colFilterInputs.forEach(input => {
        input.addEventListener('input', filterTable);
    });
}

function setupExportHandlers(table, wrapper, ths) {
    wrapper.querySelectorAll('.dropdown-wrapper').forEach(dw => {
        const btn = dw.querySelector('.table-btn');
        const menu = dw.querySelector('.dropdown-menu');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    });

    const getTableDataset = (onlySelected = false) => {
        const headerNames = ths.map(th => th.querySelector('.th-text').textContent.trim());
        const tbody = table.querySelector('tbody');
        if (!tbody) return { headers: headerNames, data: [] };

        let rows = Array.from(tbody.querySelectorAll('tr'));
        rows = rows.filter(row => !row.classList.contains('row-filtered'));

        if (onlySelected) {
            rows = rows.filter(row => row.querySelector('.select-row:checked'));
        }

        const data = rows.map(row => {
            const cells = Array.from(row.cells).slice(1);
            return cells.map(c => c.textContent.trim());
        });

        return {
            headers: headerNames,
            data
        };
    };

    const exportButtons = wrapper.querySelectorAll('.export-format-btn');
    exportButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.getAttribute('data-format');
            const hasSelected = table.querySelector('tbody .select-row:checked');
            const dataset = getTableDataset(!!hasSelected);
            
            if (dataset.data.length === 0) {
                window.Utils.showToast('No rows to export!', 'warning');
                return;
            }

            const fileName = `table-export-${Date.now()}`;
            performExport(dataset, format, fileName);
        });
    });

    const copyButtons = wrapper.querySelectorAll('.copy-format-btn');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled')) return;
            const scope = btn.getAttribute('data-scope');
            const dataset = getTableDataset(scope === 'selected');
            
            if (dataset.data.length === 0) {
                window.Utils.showToast('No rows to copy!', 'warning');
                return;
            }

            const mdText = formatAsMarkdown(dataset);
            window.Utils.copyToClipboard(mdText);
        });
    });
}

function performExport(dataset, format, fileName) {
    if (format === 'csv') {
        const csvContent = [
            dataset.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
            ...dataset.data.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        window.Utils.downloadFile(csvContent, `${fileName}.csv`, 'text/csv;charset=utf-8;');
        window.Utils.showToast('CSV Exported!', 'success');
    } 
    else if (format === 'excel') {
        if (typeof XLSX === 'undefined') {
            window.Utils.showToast('SheetJS Excel library not loaded!', 'error');
            return;
        }
        try {
            const aoa = [dataset.headers, ...dataset.data];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            XLSX.utils.book_append_sheet(wb, ws, "Table Data");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            window.Utils.showToast('Excel Exported!', 'success');
        } catch (e) {
            console.error(e);
            window.Utils.showToast('Failed to export Excel file', 'error');
        }
    } 
    else if (format === 'json') {
        const jsonArr = dataset.data.map(row => {
            const obj = {};
            dataset.headers.forEach((h, i) => {
                obj[h] = row[i];
            });
            return obj;
        });
        window.Utils.downloadFile(JSON.stringify(jsonArr, null, 2), `${fileName}.json`, 'application/json;charset=utf-8;');
        window.Utils.showToast('JSON Exported!', 'success');
    } 
    else if (format === 'html') {
        const trs = dataset.data.map(row => `    <tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('\n');
        const html = `<table>\n  <thead>\n    <tr>${dataset.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>\n  </thead>\n  <tbody>\n${trs}\n  </tbody>\n</table>`;
        window.Utils.downloadFile(html, `${fileName}.html`, 'text/html;charset=utf-8;');
        window.Utils.showToast('HTML Exported!', 'success');
    } 
    else if (format === 'markdown') {
        const md = formatAsMarkdown(dataset);
        window.Utils.downloadFile(md, `${fileName}.md`, 'text/markdown;charset=utf-8;');
        window.Utils.showToast('Markdown Exported!', 'success');
    }
}

function formatAsMarkdown(dataset) {
    const colWidths = dataset.headers.map((h, colIdx) => {
        const cellLengths = dataset.data.map(row => row[colIdx] ? row[colIdx].length : 0);
        return Math.max(h.length, ...cellLengths, 3);
    });

    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

    const headerLine = '| ' + dataset.headers.map((h, i) => pad(h, colWidths[i])).join(' | ') + ' |';
    const separatorLine = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';
    const bodyLines = dataset.data.map(row => {
        return '| ' + row.map((cell, i) => pad(cell || '', colWidths[i])).join(' | ') + ' |';
    });

    return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function escapeHtml(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return string.replace(/[&<>"']/g, function(m) { return map[m]; });
}
