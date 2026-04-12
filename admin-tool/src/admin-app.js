// admin-app.js — shared utilities for all Quiz Admin pages
// Uses window.__TAURI__ globals (requires withGlobalTauri: true in tauri.conf.json)

function tauriInvoke() {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        return window.__TAURI__.core.invoke;
    }
    return null;
}

async function invokeCmd(name, args) {
    const fn = tauriInvoke();
    if (!fn) {
        const msg = 'Tauri non disponible (window.__TAURI__ absent).';
        toast(msg, 'error');
        throw new Error(msg);
    }
    try {
        return await fn(name, args || {});
    } catch (err) {
        toast(String(err), 'error');
        throw err;
    }
}

function toast(msg, type) {
    type = type || 'info';
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('toast-visible'));
    });
    setTimeout(() => {
        el.classList.remove('toast-visible');
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

function confirmModal(msg) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <p class="modal-msg">${msg}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
                    <button class="btn btn-danger" id="modal-confirm">Confirmer</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#modal-confirm').onclick = () => { overlay.remove(); resolve(true); };
        overlay.querySelector('#modal-cancel').onclick = () => { overlay.remove(); resolve(false); };
    });
}

function promptModal(msg, defaultValue) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <p class="modal-msg">${msg}</p>
                <div class="form-group" style="margin-bottom:0">
                    <input class="form-control" id="prompt-input" type="text" value="${defaultValue || ''}" autocomplete="off">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="prompt-cancel">Annuler</button>
                    <button class="btn btn-primary" id="prompt-confirm">OK</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#prompt-input');
        const confirm = () => { const v = input.value.trim(); overlay.remove(); resolve(v || null); };
        const cancel = () => { overlay.remove(); resolve(null); };
        overlay.querySelector('#prompt-confirm').onclick = confirm;
        overlay.querySelector('#prompt-cancel').onclick = cancel;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); });
        requestAnimationFrame(() => input.focus());
    });
}

function navTo(page, params) {
    const url = new URL(page, window.location.href);
    if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    window.location.href = url.toString();
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
}

async function loadData() {
    const raw = await invokeCmd('read_data');
    try {
        return JSON.parse(raw || '{}');
    } catch (e) {
        toast('Erreur de parsing JSON des données.', 'error');
        return {};
    }
}

async function saveData(data) {
    await invokeCmd('write_data', { json: JSON.stringify(data, null, 2) });
    await invokeCmd('write_quizzes_js', { content: buildStudentJs(data) });
}

function buildStudentJs(data) {
    const studentData = {};
    Object.entries(data).forEach(([moduleName, moduleObj]) => {
        studentData[moduleName] = {};
        Object.entries(moduleObj).forEach(([key, val]) => {
            if (key === '_intro') {
                studentData[moduleName]._intro = val;
                return;
            }
            if (key === '_description') {
                if (val) studentData[moduleName]._description = val;
                return;
            }
            const fullKey = moduleName + ' - ' + key;
            studentData[moduleName][fullKey] = val;
        });
    });
    return 'window.quizzesData = ' + JSON.stringify(studentData, null, 2) + ';\n';
}

/**
 * Escape HTML special characters for safe display in innerHTML contexts.
 */
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Format a quiz key for display by stripping leading "ModuleName - " prefix.
 */
function shortQuizName(moduleName, fullKey) {
    const prefix = moduleName + ' - ';
    return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
}

window.AdminApp = {
    invokeCmd,
    toast,
    confirmModal,
    promptModal,
    navTo,
    getParam,
    loadData,
    saveData,
    buildStudentJs,
    escHtml,
    shortQuizName,
};
