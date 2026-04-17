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

function selectModal(labelHtml, options, preselect) {
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        var optsHtml = options.map(function(o) {
            return '<option value="' + escHtml(o) + '">' + escHtml(o) + '</option>';
        }).join('');
        overlay.innerHTML =
            '<div class="modal">' +
            '<div class="modal-title">S\u00e9lectionner</div>' +
            '<div class="modal-body">' +
            '<div class="form-group" style="margin-bottom:0">' +
            '<label>' + labelHtml + '</label>' +
            '<select class="form-control" id="_sel_inp">' + optsHtml + '</select>' +
            '</div></div>' +
            '<div class="modal-actions">' +
            '<button class="btn btn-secondary" id="_sel_cancel">Annuler</button>' +
            '<button class="btn btn-primary" id="_sel_ok">Confirmer</button>' +
            '</div></div>';
        document.body.appendChild(overlay);
        var sel = overlay.querySelector('#_sel_inp');
        if (preselect !== undefined) sel.value = preselect;
        function done(val) { document.body.removeChild(overlay); resolve(val); }
        overlay.querySelector('#_sel_ok').addEventListener('click', function() { done(sel.value); });
        overlay.querySelector('#_sel_cancel').addEventListener('click', function() { done(null); });
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
            if (key === '_quizDescriptions') { return; }
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

async function callLlm(settings, systemPrompt, userPrompt) {
    const provider = settings.llmProvider || 'claude';
    const apiKey   = settings.llmApiKey   || '';
    if (!apiKey) throw new Error('Aucune clé API configurée dans les paramètres.');

    if (provider === 'claude') {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key':         apiKey,
                'anthropic-version': '2023-06-01',
                'content-type':      'application/json',
            },
            body: JSON.stringify({
                model:      'claude-sonnet-4-6',
                max_tokens: 8192,
                system:     systemPrompt,
                messages:   [{ role: 'user', content: userPrompt }],
            }),
        });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error('Claude API ' + resp.status + ': ' + err);
        }
        const data = await resp.json();
        return data.content[0].text;
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=' + apiKey;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
            ],
            generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
        }),
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error('Gemini API ' + resp.status + ': ' + err);
    }
    const data = await resp.json();
    return data.candidates[0].content.parts[0].text;
}

window.AdminApp = {
    invokeCmd,
    toast,
    confirmModal,
    promptModal,
    selectModal,
    navTo,
    getParam,
    loadData,
    saveData,
    buildStudentJs,
    escHtml,
    shortQuizName,
    callLlm,
};
