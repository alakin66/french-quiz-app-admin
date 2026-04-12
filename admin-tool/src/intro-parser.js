// intro-parser.js — Convert an Excel ArrayBuffer (Introduction sheet) to HTML
// Requires window.XLSX (SheetJS) to be loaded before calling parseIntroXlsx.

/**
 * Parse an Excel file's "Introduction" sheet into an HTML string.
 * @param {ArrayBuffer} buffer - Raw bytes of the .xlsx file
 * @returns {string} HTML string, or empty string on error
 */
function parseIntroXlsx(buffer) {
    if (!window.XLSX) {
        console.error('intro-parser: window.XLSX not available');
        return '';
    }
    try {
        const workbook = XLSX.read(buffer, { type: 'array', cellHTML: true });

        // Find the Introduction sheet (case-insensitive)
        const sheetName = workbook.SheetNames.find(
            n => n.trim().toLowerCase() === 'introduction'
        ) || workbook.SheetNames[0];

        if (!sheetName) return '';

        const sheet = workbook.Sheets[sheetName];
        // Get raw row arrays (header: 1 mode)
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) return '';

        // HTML passthrough detection: if A1 starts with '<', return the cell value as-is
        const a1 = String(rows[0][0] || '').trim();
        if (a1.startsWith('<')) {
            return a1;
        }

        return buildIntroHtml(sheet, rows);
    } catch (e) {
        console.error('intro-parser error:', e);
        return '';
    }
}

/**
 * Extract metadata (description) from an Excel workbook's document properties.
 * @param {ArrayBuffer} buffer
 * @returns {{ description: string }}
 */
function parseIntroMeta(buffer) {
    try {
        const wb = XLSX.read(buffer, { type: 'array' });
        const desc = (wb.Props && (wb.Props.Subject || wb.Props.Title)) || '';
        return { description: String(desc).trim() };
    } catch (e) {
        return { description: '' };
    }
}

function boolProp(el) {
    if (!el) return false;
    var v = el.getAttribute('val');
    return v === null || (v !== '0' && v !== 'false');
}

function richTextToHtml(cellR) {
    if (!cellR || typeof cellR !== 'string') return null;
    try {
        var parser = new DOMParser();
        var doc = parser.parseFromString('<x>' + cellR + '</x>', 'text/xml');
        if (doc.querySelector('parsererror')) return null;
        var runs = doc.querySelectorAll('r');
        if (!runs.length) return null;
        var html = '';
        runs.forEach(function(run) {
            var tEl = run.querySelector('t');
            if (!tEl) return;
            var text = tEl.textContent;
            if (text === null || text === undefined) return;
            var rPr = run.querySelector('rPr');
            var colorEl = rPr && rPr.querySelector('color');
            var rgb = colorEl && colorEl.getAttribute('rgb');
            var colorStyle = '';
            if (rgb && rgb.length === 8) {
                colorStyle = 'color:#' + rgb.slice(2) + ';';
            }
            var bold      = boolProp(rPr && rPr.querySelector('b'));
            var italic    = boolProp(rPr && rPr.querySelector('i'));
            var underline = boolProp(rPr && rPr.querySelector('u'));
            var content = escapeHtml(text);
            if (underline) content = '<u>' + content + '</u>';
            if (italic) content = '<i>' + content + '</i>';
            if (bold) content = '<b>' + content + '</b>';
            if (colorStyle) {
                html += '<span style="' + colorStyle + '">' + content + '</span>';
            } else {
                html += content;
            }
        });
        return html || null;
    } catch (e) {
        return null;
    }
}

function buildIntroHtml(sheet, rows) {
    // Trim trailing empty rows (Excel sheets often have 1000 default rows)
    var lastNonEmpty = rows.length - 1;
    while (lastNonEmpty >= 0) {
        var r = rows[lastNonEmpty];
        if (r.some(function(c) { return c !== '' && c != null; })) break;
        lastNonEmpty--;
    }
    var trimmedRows = rows.slice(0, lastNonEmpty + 1);

    var lines = [];
    lines.push('<table class="xlsx-table intro-table">');
    lines.push('<colgroup>');
    lines.push('  <col style="width:33.33%">');
    lines.push('  <col style="width:33.33%">');
    lines.push('  <col style="width:33.34%">');
    lines.push('</colgroup>');
    lines.push('<tbody>');

    var titleRowEmitted = false;

    trimmedRows.forEach(function(row, rowIdx) {
        var lastCell = -1;
        for (var i = row.length - 1; i >= 0; i--) {
            if (row[i] !== '' && row[i] != null) { lastCell = i; break; }
        }
        var cellCount = lastCell + 1;

        if (cellCount === 0) {
            lines.push('  <tr class="blank-row"><td colspan="3">&nbsp;</td></tr>');
            return;
        }

        if (!titleRowEmitted) {
            titleRowEmitted = true;
            if (cellCount === 1) {
                var tVal = getCellHtml(sheet, rowIdx, 0, row[0]);
                lines.push('  <tr class="title-row"><td colspan="3">' + tVal + '</td></tr>');
            } else {
                var tV0 = getCellHtml(sheet, rowIdx, 0, row[0]);
                var tV1 = getCellHtml(sheet, rowIdx, 1, row[1]);
                lines.push('  <tr class="title-row"><th>' + tV0 + '</th><td colspan="2">' + tV1 + '</td></tr>');
            }
            return;
        }

        if (cellCount === 1) {
            var val = getCellHtml(sheet, rowIdx, 0, row[0]);
            lines.push('  <tr class="section-header"><td colspan="3">' + val + '</td></tr>');
            return;
        }

        if (cellCount === 2) {
            var v0 = getCellHtml(sheet, rowIdx, 0, row[0]);
            var v1 = getCellHtml(sheet, rowIdx, 1, row[1]);
            lines.push('  <tr class="focus-point"><th>' + v0 + '</th><td colspan="2">' + v1 + '</td></tr>');
            return;
        }

        var e0 = getCellHtml(sheet, rowIdx, 0, row[0]);
        var e1 = getCellHtml(sheet, rowIdx, 1, row[1]);
        var e2 = getCellHtml(sheet, rowIdx, 2, row[2]);
        lines.push('  <tr class="explanation"><td>' + e0 + '</td><td>' + e1 + '</td><td>' + e2 + '</td></tr>');
    });

    lines.push('</tbody>');
    lines.push('</table>');
    return lines.join('\n');
}

function getCellHtml(sheet, rowIdx, colIdx, fallback) {
    var addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    var cell = sheet[addr];
    if (!cell) return '';
    // Prefer rich text parsing: cell.r has color info that cell.h discards
    if (cell.r) {
        var richHtml = richTextToHtml(cell.r);
        if (richHtml !== null) return richHtml;
    }
    if (cell.h) return cell.h;
    var text = cell.w || String(cell.v || fallback || '');
    return escapeHtml(text);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.parseIntroXlsx = parseIntroXlsx;
window.parseIntroMeta = parseIntroMeta;
