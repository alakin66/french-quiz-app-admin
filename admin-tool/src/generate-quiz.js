var moduleName      = getParam('module');
var cachedSettings  = {};
var moduleIntro     = '';
var templateContent = '';

var DEFAULT_TECH_PROMPT =
    'You are a French language quiz generator. ' +
    'Output ONLY valid JSON \u2014 no markdown, no code fences, no explanation. ' +
    'Output a JSON object with exactly two keys: "quizDescription" (string) and "questions" (array). ' +
    'Strip only documentation keys from question objects: "_comment", "_comment_type", "_note". ' +
    'Each question must have: Type, Question, Options, Answer, FeedbackCorrect, FeedbackIncorrect.';

function buildUserPrompt(quizName, quizInstructions, questionCount) {
    var introSection = moduleIntro
        ? 'MODULE GRAMMAR REFERENCE (from the module introduction):\n' + moduleIntro + '\n\n'
        : '';
    return (
        'Generate a single French grammar quiz.\n\n' +
        'Module: ' + moduleName + '\n' +
        'Quiz name: ' + quizName + '\n' +
        'Generation instructions: ' + quizInstructions + '\n' +
        'Number of questions: ' + questionCount + '\n\n' +
        'Output a JSON object with exactly two keys:\n' +
        '  "quizDescription": a concise 1-2 sentence description of the quiz (topic, level, question types)\n' +
        '  "questions": a JSON array of question objects\n\n' +
        introSection +
        'Use the question formats from this template:\n\n' +
        templateContent
    );
}

function refreshUserPrompt() {
    var quizName         = document.getElementById('gen-quiz-name').value.trim();
    var quizInstructions = document.getElementById('gen-quiz-instructions').value.trim();
    var questionCount    = document.getElementById('gen-question-count').value || '10';

    var introNote = moduleIntro
        ? '(Module grammar reference will be included from the module introduction.)\n\n'
        : '';

    document.getElementById('gen-user-prompt').value =
        'Generate a single French grammar quiz.\n\n' +
        'Module: '                  + (moduleName        || '[inconnu]') + '\n' +
        'Quiz name: '               + (quizName          || '[\u00e0 remplir]') + '\n' +
        'Generation instructions: ' + (quizInstructions  || '[\u00e0 remplir]') + '\n' +
        'Number of questions: '     + questionCount + '\n\n' +
        'Output a JSON object with exactly two keys:\n' +
        '  "quizDescription": concise 1-2 sentence description\n' +
        '  "questions": array of question objects\n\n' +
        introNote +
        '(Template content will be appended here at generation time.)';
}

document.addEventListener('DOMContentLoaded', async function() {
    if (!moduleName) {
        toast('Module non sp\u00e9cifi\u00e9.', 'error');
        return;
    }

    try {
        cachedSettings = JSON.parse(await invokeCmd('read_settings') || '{}');
    } catch (e) {
        cachedSettings = {};
    }

    var appData = await loadData();
    moduleIntro = (appData[moduleName] || {})._intro || '';

    try {
        templateContent = await invokeCmd('read_quiz_template');
    } catch (e) {
        toast('Impossible de charger quiz-template.json\u00a0: ' + String(e), 'error');
    }

    var bcLink = document.getElementById('bc-module-link');
    bcLink.textContent = moduleName;
    bcLink.href = 'module.html?module=' + encodeURIComponent(moduleName);

    var backBtn = document.getElementById('btn-back');
    backBtn.href = 'module.html?module=' + encodeURIComponent(moduleName);

    document.getElementById('gen-tech-prompt').value = DEFAULT_TECH_PROMPT;
    refreshUserPrompt();

    ['gen-quiz-name', 'gen-quiz-instructions', 'gen-question-count'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', refreshUserPrompt);
    });

    document.getElementById('btn-generate').addEventListener('click', async function() {
        var quizName         = document.getElementById('gen-quiz-name').value.trim();
        var quizInstructions = document.getElementById('gen-quiz-instructions').value.trim();
        var questionCount    = parseInt(document.getElementById('gen-question-count').value) || 10;

        if (!quizName) { toast('Entrez un nom de quiz.', 'error'); return; }
        if (!templateContent) { toast('Template non charg\u00e9. Red\u00e9marrez l\'application.', 'error'); return; }

        var systemPrompt = document.getElementById('gen-tech-prompt').value;
        var userPrompt   = buildUserPrompt(quizName, quizInstructions, questionCount);
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
        var quizName = document.getElementById('gen-quiz-name').value.trim();
        if (!quizName) { toast('Entrez un nom de quiz.', 'error'); return; }

        var raw = document.getElementById('gen-result').value.trim();
        var parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            toast('JSON invalide\u00a0: ' + e.message, 'error');
            return;
        }

        var questions, quizDescription;
        if (Array.isArray(parsed)) {
            questions = parsed;
            quizDescription = '';
        } else {
            questions = parsed.questions;
            quizDescription = parsed.quizDescription || '';
            if (!Array.isArray(questions)) {
                toast('Le r\u00e9sultat doit contenir un tableau "questions".', 'error');
                return;
            }
        }

        var appData = await loadData();
        if (!appData[moduleName]) { toast('Module introuvable.', 'error'); return; }

        if (appData[moduleName][quizName] !== undefined) {
            var ok = await confirmModal(
                'Le quiz <strong>' + escHtml(quizName) + '</strong> existe d\u00e9j\u00e0. Le remplacer\u00a0?'
            );
            if (!ok) return;
        }

        appData[moduleName][quizName] = questions;
        if (!appData[moduleName]._quizDescriptions) {
            appData[moduleName]._quizDescriptions = {};
        }
        if (quizDescription) {
            appData[moduleName]._quizDescriptions[quizName] = quizDescription;
        }
        await saveData(appData);
        toast('Quiz import\u00e9.', 'success');
        setTimeout(function() {
            navTo('module.html', { module: moduleName });
        }, 800);
    });
});
