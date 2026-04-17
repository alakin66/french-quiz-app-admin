var cachedSettings  = {};
var templateContent = '';

var DEFAULT_TECH_PROMPT =
    'You are a French language quiz generator. ' +
    'Output ONLY valid JSON \u2014 no markdown, no code fences, no explanation.\n' +
    'IMPORTANT: your output must contain these keys at module level \u2014 do NOT omit any:\n' +
    '  "_description": a short subtitle for the module, MAX 40 characters.\n' +
    '  "_intro": a non-empty HTML string using the table structure from "_intro_html_guide" ' +
    '(xlsx-table intro-table, colgroup with 3 columns at 33%/33%/34%, ' +
    'row classes: title-row, section-header, focus-point, explanation, blank-row).\n' +
    '  "_quizDescriptions": an object mapping each quiz name to a concise 1-2 sentence description.\n' +
    'Strip ONLY these documentation keys: "_TEMPLATE_GUIDE", "_comment", ' +
    '"_comment_module", "_comment_quizzes", "_comment_type", "_note", "_type", "_purpose", ' +
    '"_top_level_structure", "_quiz_key_naming", "_intro_html_guide", "_question_types", ' +
    '"_feedback_tips", "_multi_select_note".\n' +
    'The quiz value must be a plain JSON array of question objects. ' +
    'Follow the structure of the template exactly.';

function buildUserPrompt(moduleName, moduleInstructions, quizName, quizInstructions, questionCount) {
    return (
        'Generate a French grammar module using the template below.\n\n' +
        'Module name: ' + moduleName + '\n' +
        'Generation instructions: ' + moduleInstructions + '\n\n' +
        'REQUIRED outputs at module level:\n' +
        '  "_description": write a short subtitle (MAX 40 characters) that summarises the module topic\n' +
        '  "_quizDescriptions": { "' + quizName + '": "<concise 1-2 sentence description of this quiz>" }\n\n' +
        'REQUIRED: generate a complete "_intro" HTML table for this module. ' +
        'The "_intro" must include these sections in order:\n' +
        '  1. D\u00e9finition \u2014 a clear definition of the grammar topic\n' +
        '  2. R\u00e8gles \u2014 the main grammar rules, each with an example sentence\n' +
        '  3. Exemples \u2014 2\u20133 concrete example sentences showing the rule in use\n' +
        '  4. Conseils \u2014 1\u20132 practical tips or memory aids for the student\n' +
        'Use the row types from the template: title-row, section-header, focus-point, explanation, blank-row.\n\n' +
        'Generate exactly 1 quiz:\n' +
        'Quiz name: ' + quizName + '\n' +
        'Generation instructions: ' + quizInstructions + '\n' +
        'Number of questions: ' + questionCount + '\n\n' +
        'TEMPLATE:\n' + templateContent
    );
}

function refreshUserPrompt() {
    var moduleName         = document.getElementById('gen-module-name').value.trim();
    var moduleInstructions = document.getElementById('gen-module-instructions').value.trim();
    var quizName           = document.getElementById('gen-quiz-name').value.trim();
    var quizInstructions   = document.getElementById('gen-quiz-instructions').value.trim();
    var questionCount      = document.getElementById('gen-question-count').value || '10';

    document.getElementById('gen-user-prompt').value =
        'Generate a French grammar module using the template below.\n\n' +
        'Module name: '             + (moduleName         || '[\u00e0 remplir]') + '\n' +
        'Generation instructions: ' + (moduleInstructions || '[\u00e0 remplir]') + '\n\n' +
        'REQUIRED: "_description" (max 40 chars), "_quizDescriptions", "_intro" HTML table ' +
        '(D\u00e9finition, R\u00e8gles, Exemples, Conseils).\n\n' +
        'Generate exactly 1 quiz:\n' +
        'Quiz name: '               + (quizName           || '[\u00e0 remplir]') + '\n' +
        'Generation instructions: ' + (quizInstructions   || '[\u00e0 remplir]') + '\n' +
        'Number of questions: '     + questionCount + '\n\n' +
        '(Template content will be appended here at generation time.)';
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        cachedSettings = JSON.parse(await invokeCmd('read_settings') || '{}');
    } catch (e) {
        cachedSettings = {};
    }

    try {
        templateContent = await invokeCmd('read_quiz_template');
    } catch (e) {
        toast('Impossible de charger quiz-template.json\u00a0: ' + String(e), 'error');
    }

    document.getElementById('gen-tech-prompt').value = DEFAULT_TECH_PROMPT;
    refreshUserPrompt();

    ['gen-module-name', 'gen-module-instructions', 'gen-quiz-name', 'gen-quiz-instructions', 'gen-question-count'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', refreshUserPrompt);
    });

    document.getElementById('btn-generate').addEventListener('click', async function() {
        var moduleName         = document.getElementById('gen-module-name').value.trim();
        var moduleInstructions = document.getElementById('gen-module-instructions').value.trim();
        var quizName           = document.getElementById('gen-quiz-name').value.trim();
        var quizInstructions   = document.getElementById('gen-quiz-instructions').value.trim();
        var questionCount      = parseInt(document.getElementById('gen-question-count').value) || 10;

        if (!moduleName) { toast('Entrez un nom de module.', 'error'); return; }
        if (!quizName)   { toast('Entrez un nom de quiz.', 'error'); return; }
        if (!templateContent) { toast('Template non charg\u00e9. Red\u00e9marrez l\'application.', 'error'); return; }

        var systemPrompt = document.getElementById('gen-tech-prompt').value;
        var userPrompt   = buildUserPrompt(moduleName, moduleInstructions, quizName, quizInstructions, questionCount);
        document.getElementById('gen-user-prompt').value = userPrompt;

        var spinner = document.getElementById('gen-spinner');
        var btn     = document.getElementById('btn-generate');
        spinner.classList.remove('hidden');
        btn.disabled = true;

        try {
            var result = await callLlm(cachedSettings, systemPrompt, userPrompt);
            document.getElementById('gen-result').value = result;
            document.getElementById('result-card').classList.remove('hidden');
            document.getElementById('result-card').scrollIntoView({ behavior: 'smooth' });
            toast('G\u00e9n\u00e9ration termin\u00e9e.', 'success');
        } catch (e) {
            toast('Erreur LLM\u00a0: ' + String(e), 'error');
        } finally {
            spinner.classList.add('hidden');
            btn.disabled = false;
        }
    });

    document.getElementById('btn-import-result').addEventListener('click', async function() {
        var raw = document.getElementById('gen-result').value.trim();
        var incoming;
        try {
            incoming = JSON.parse(raw);
        } catch (e) {
            toast('JSON invalide \u2014 corrigez le r\u00e9sultat avant d\'importer.', 'error');
            return;
        }

        var appData    = await loadData();
        var moduleKeys = Object.keys(incoming);
        if (moduleKeys.length === 0) { toast('Aucun module dans le r\u00e9sultat.', 'error'); return; }

        var conflicts = moduleKeys.filter(function(k) { return appData[k] !== undefined; });
        if (conflicts.length > 0) {
            var ok = await confirmModal(
                'Le(s) module(s) <strong>' + conflicts.map(escHtml).join(', ') +
                '</strong> existent d\u00e9j\u00e0. Les remplacer\u00a0?'
            );
            if (!ok) return;
        }

        moduleKeys.forEach(function(k) { appData[k] = incoming[k]; });
        await saveData(appData);
        toast('Module(s) import\u00e9(s).', 'success');
        setTimeout(function() {
            navTo('module.html', { module: moduleKeys[0] });
        }, 800);
    });
});
