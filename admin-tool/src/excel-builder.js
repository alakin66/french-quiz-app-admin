// excel-builder.js — Build an .xlsx workbook from admin module data
// Requires window.XLSX (SheetJS) to be loaded before calling buildModuleXlsx.

/**
 * Build a Uint8Array representing an .xlsx workbook for a single module.
 * @param {string} moduleName
 * @param {object} moduleObj  — shape: { _intro?: string, _description?: string, QuizKey: [questions] }
 * @returns {Uint8Array}
 */
function buildModuleXlsx(moduleName, moduleObj) {
    if (!window.XLSX) throw new Error('window.XLSX not available');

    const wb = XLSX.utils.book_new();

    // ── Introduction sheet ──────────────────────────────────────
    const introHtml = moduleObj._intro || '';
    // Store the raw HTML string in cell A1 so intro-parser can round-trip it
    const introSheet = XLSX.utils.aoa_to_sheet([[introHtml]]);
    XLSX.utils.book_append_sheet(wb, introSheet, 'Introduction');

    // ── Quiz sheets ─────────────────────────────────────────────
    const HEADERS = ['Type', 'Question', 'Options', 'Answer', 'FeedbackCorrect', 'FeedbackIncorrect'];

    Object.entries(moduleObj).forEach(([key, questions]) => {
        if (key === '_intro' || key === '_description') return;
        if (!Array.isArray(questions)) return;

        // Derive a short sheet name by stripping "ModuleName - " prefix
        let sheetName = key;
        const prefix = moduleName + ' - ';
        if (sheetName.startsWith(prefix)) {
            sheetName = sheetName.slice(prefix.length);
        }
        // Excel sheet names max 31 chars, strip invalid chars
        sheetName = sheetName.replace(/[\\/?*[\]:]/g, '_').slice(0, 31);

        // Build rows: headers + one row per question
        const rows = [HEADERS];
        questions.forEach(q => {
            rows.push([
                q.Type || '',
                q.Question || '',
                q.Options || '',
                q.Answer || '',
                q.FeedbackCorrect || '',
                q.FeedbackIncorrect || '',
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Column widths (approximate)
        ws['!cols'] = [
            { wch: 16 },  // Type
            { wch: 48 },  // Question
            { wch: 36 },  // Options
            { wch: 24 },  // Answer
            { wch: 32 },  // FeedbackCorrect
            { wch: 32 },  // FeedbackIncorrect
        ];

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * Trigger a browser download of a Uint8Array as an .xlsx file.
 * @param {Uint8Array} data
 * @param {string} filename
 */
function downloadXlsx(data, filename) {
    const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
}

window.buildModuleXlsx = buildModuleXlsx;
window.downloadXlsx = downloadXlsx;
