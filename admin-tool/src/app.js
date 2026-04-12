// app.js — main page logic for index.html
// invokeCmd, toast, navTo, etc. are globals from admin-app.js — no re-declaration needed
var appData = {};

// ── Render module table ──────────────────────────────────────
function renderTable() {
    const tbody = document.getElementById('module-tbody');
    const keys = Object.keys(appData);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr id="empty-row"><td colspan="4">
            <div class="empty-state">
                <div class="empty-state-icon">&#x1F4DA;</div>
                <div class="empty-state-title">Aucun module</div>
                <div class="empty-state-desc">Importez un fichier Excel ou créez un nouveau module.</div>
            </div></td></tr>`;
        return;
    }
    tbody.innerHTML = keys.map(moduleName => {
        const moduleObj = appData[moduleName];
        const desc = escHtml(moduleObj._description || '');
        const quizCount = Object.keys(moduleObj).filter(k => k !== '_intro' && k !== '_description').length;
        const mJson = escHtml(JSON.stringify(moduleName));
        return `<tr data-module="${escHtml(moduleName)}">
            <td>
                <button class="module-name-link" onclick="navTo('module.html', {module: ${mJson}})">
                    ${escHtml(moduleName)}
                </button>
            </td>
            <td><span class="module-description" title="${desc}">${desc || '<span class=text-muted>\u2014</span>'}</span></td>
            <td class="text-center"><span class="badge badge-primary">${quizCount}</span></td>
            <td>
                <div class="actions-col">
                    <button class="btn btn-secondary btn-sm" onclick="navTo('module.html', {module: ${mJson}})">
                        Modifier
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteModule(${mJson})">
                        Supprimer
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── Delete module ────────────────────────────────────────────
async function deleteModule(name) {
    const ok = await confirmModal(`Supprimer le module \u00ab\u00a0${escHtml(name)}\u00a0\u00bb et tous ses quiz ?`);
    if (!ok) return;
    delete appData[name];
    await saveData(appData);
    renderTable();
    toast(`Module "${name}" supprim\u00e9.`, 'success');
}

// ── New module ───────────────────────────────────────────────
async function newModule() {
    const name = await promptModal('Nom du nouveau module :');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (appData[trimmed]) { toast('Un module avec ce nom existe d\u00e9j\u00e0.', 'error'); return; }
    appData[trimmed] = { _description: '', _intro: '' };
    await saveData(appData);
    renderTable();
    navTo('module.html', { module: trimmed });
}

// ── Test student app ─────────────────────────────────────────
async function testStudentApp() {
    try {
        await invokeCmd('open_student_app', { query: '' });
        toast('Application étudiant ouverte.', 'info');
    } catch (e) {
        toast('Impossible d\'ouvrir l\'application étudiant : ' + String(e), 'error');
    }
}

// ── Export all JSON ──────────────────────────────────────────
async function exportJson() {
    const path = await invokeCmd('save_json_dialog');
    if (!path) return;
    await invokeCmd('write_text_file_at', { path, content: JSON.stringify(appData, null, 2) });
    toast('Export Quizzes enregistr\u00e9.', 'success');
}

// ── Import JSON ──────────────────────────────────────────────
async function importJson() {
    const ok = await confirmModal('Remplacer toutes les donn\u00e9es actuelles par le contenu du fichier JSON ?\u003cbr\u003e\u003cbr\u003e\u003cstrong\u003eCette action est irr\u00e9versible.\u003c/strong\u003e');
    if (!ok) return;
    const path = await invokeCmd('open_json_dialog');
    if (!path) return;
    const text = await invokeCmd('read_text_file_at', { path });
    try {
        appData = JSON.parse(text);
        await saveData(appData);
        renderTable();
        toast('Quizzes import\u00e9s avec succ\u00e8s.', 'success');
    } catch (err) {
        toast('Fichier JSON invalide : ' + err.message, 'error');
    }
}

// ── Import Excel ─────────────────────────────────────────────
async function processExcelBuffer(buffer, fileName, logEl) {
    const log = (msg, cls) => {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        span.textContent = msg + '\n';
        logEl.appendChild(span);
        logEl.scrollTop = logEl.scrollHeight;
    };

    log(`Lecture de ${fileName}...`);
    let wb;
    try {
        wb = XLSX.read(buffer, { type: 'array', cellHTML: true });
    } catch (e) {
        log(`Erreur lecture : ${e.message}`, 'log-error');
        return;
    }

    const moduleName = fileName.replace(/\.xlsx$/i, '').trim();
    if (!appData[moduleName]) {
        appData[moduleName] = { _description: '', _intro: '' };
    }

    let quizCount = 0;

    wb.SheetNames.forEach(sheetName => {
        const isIntro = sheetName.trim().toLowerCase() === 'introduction';
        const sheet = wb.Sheets[sheetName];

        if (isIntro) {
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rows.length > 0) {
                const a1 = String(rows[0][0] || '').trim();
                if (a1.startsWith('<')) {
                    appData[moduleName]._intro = a1;
                    log('  Intro charg\u00e9e (HTML direct).');
                } else {
                    appData[moduleName]._intro = window.parseIntroXlsx(buffer);
                    log('  Intro convertie depuis tableau.');
                }
            }
            return;
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const questions = rows.map(row => ({
            Type: row.Type || row.type || '',
            Question: row.Question || row.question || '',
            Options: row.Options || row.options || '',
            Answer: row.Answer || row.answer || '',
            FeedbackCorrect: row.FeedbackCorrect || row.feedbackCorrect || row['Feedback Correct'] || '',
            FeedbackIncorrect: row.FeedbackIncorrect || row.feedbackIncorrect || row['Feedback Incorrect'] || '',
        })).filter(q => q.Type && q.Question);

        appData[moduleName][sheetName] = questions;
        quizCount++;
        log(`  Quiz "${sheetName}" : ${questions.length} question(s).`);
    });

    await saveData(appData);
    renderTable();
    log(`Module "${moduleName}" import\u00e9 \u2014 ${quizCount} quiz.`, 'log-success');
}

// ── Drop zone logic ──────────────────────────────────────────
function setupDropZone() {
    const zone = document.getElementById('drop-zone');
    const logEl = document.getElementById('import-log');

    zone.addEventListener('click', async () => {
        const files = await invokeCmd('open_and_read_excel_files');
        if (!files || files.length === 0) return;
        logEl.textContent = '';
        for (const [fileName, bytes] of files) {
            await processExcelBuffer(new Uint8Array(bytes).buffer, fileName, logEl);
        }
    });

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        logEl.textContent = '';
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx'));
        if (files.length === 0) { toast('Veuillez d\u00e9poser des fichiers .xlsx.', 'error'); return; }
        for (const file of files) {
            await processExcelBuffer(await file.arrayBuffer(), file.name, logEl);
        }
    });
}

// ── Publish ──────────────────────────────────────────────────
async function publishQuizzes() {
    const msgEl = document.getElementById('commit-msg');
    const logEl = document.getElementById('publish-log');
    const spinner = document.getElementById('publish-spinner');
    const btn = document.getElementById('publish-confirm');

    logEl.textContent = '';
    spinner.classList.remove('hidden');
    btn.disabled = true;

    const appendLog = (msg, cls) => {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        span.textContent = msg + '\n';
        logEl.appendChild(span);
        logEl.scrollTop = logEl.scrollHeight;
    };

    try {
        appendLog('G\u00e9n\u00e9ration de quizzes.js...');
        const js = buildStudentJs(appData);
        await invokeCmd('write_quizzes_js', { content: js });
        appendLog('quizzes.js \u00e9crit.', 'log-success');

        appendLog('Publication Git...');
        const result = await invokeCmd('git_publish', { commitMsg: msgEl.value || 'chore: update quizzes.js' });
        appendLog(result, 'log-success');
        toast('Publi\u00e9 avec succ\u00e8s !', 'success');
    } catch (e) {
        appendLog(String(e), 'log-error');
        toast('Erreur lors de la publication.', 'error');
    } finally {
        spinner.classList.add('hidden');
        btn.disabled = false;
    }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try { appData = await loadData(); }
    catch (e) { appData = {}; }
    renderTable();
    setupDropZone();

    document.getElementById('btn-test-app').addEventListener('click', testStudentApp);
    document.getElementById('btn-new-module').addEventListener('click', newModule);
    document.getElementById('btn-export-json').addEventListener('click', exportJson);
    document.getElementById('btn-import-json').addEventListener('click', importJson);

    // Import Excel modal
    const importModal = document.getElementById('import-modal');
    document.getElementById('btn-import-excel').addEventListener('click', () => {
        document.getElementById('import-log').textContent = 'En attente de fichiers...';
        importModal.classList.remove('hidden');
    });
    document.getElementById('import-close').addEventListener('click', () => {
        importModal.classList.add('hidden');
    });
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) importModal.classList.add('hidden');
    });

    // Publish modal
    const publishModal = document.getElementById('publish-modal');
    document.getElementById('btn-publish').addEventListener('click', () => {
        document.getElementById('publish-log').textContent = 'Pr\u00eat \u00e0 publier.';
        publishModal.classList.remove('hidden');
    });
    document.getElementById('publish-close').addEventListener('click', () => {
        publishModal.classList.add('hidden');
    });
    document.getElementById('publish-confirm').addEventListener('click', publishQuizzes);
    publishModal.addEventListener('click', (e) => {
        if (e.target === publishModal) publishModal.classList.add('hidden');
    });

    // Quit
    document.getElementById('btn-quit').addEventListener('click', () => {
        invokeCmd('quit_app');
    });
});
