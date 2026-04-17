document.addEventListener('DOMContentLoaded', () => {
    let quizzesData = null;
    let selectedQuizKey = null;
    let selectedTopicKey = null;
    let currentQuiz = [];
    let incorrectQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let hasAnsweredCurrent = false;

    const HISTORY_KEY = 'french_quiz_history';

    function loadHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; }
        catch (e) { return {}; }
    }

    function saveResult(topic, quizKey, quizScore, total) {
        const history = loadHistory();
        if (!history[topic]) history[topic] = {};
        history[topic][quizKey] = {
            lastScore: quizScore,
            lastTotal: total,
            lastDate: new Date().toISOString(),
            attempts: ((history[topic][quizKey] || {}).attempts || 0) + 1
        };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    function clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
    }

    function hasAnyHistory() {
        return Object.keys(loadHistory()).length > 0;
    }

    function scoreBadge(result) {
        if (!result) return '';
        const pct = Math.round((result.lastScore / result.lastTotal) * 100);
        return pct >= 80 ? '✅' : pct >= 50 ? '🟡' : '🔴';
    }

    // DOM — Screens
    const topicScreen    = document.getElementById('topic-screen');
    const introScreen    = document.getElementById('intro-screen');
    const startScreen    = document.getElementById('start-screen');
    const quizScreen     = document.getElementById('quiz-screen');
    const resultsScreen  = document.getElementById('results-screen');
    const headerScore    = document.getElementById('header-score');

    // DOM — Controls
    const quizSelect        = document.getElementById('quiz-select');
    const startBtn          = document.getElementById('start-btn');
    const introStartBtn     = document.getElementById('intro-start-btn');
    const introQuizSelect   = document.getElementById('intro-quiz-select');
    const nextBtn           = document.getElementById('next-btn');
    const returnBtn         = document.getElementById('return-btn');
    const retryWrongBtn     = document.getElementById('retry-wrong-btn');
    const backToTopicsBtn   = document.getElementById('back-to-topics-btn');
    const loadingError      = document.getElementById('loading-error');

    // DOM — Quiz
    const questionNumSpan   = document.getElementById('current-question-num');
    const totalQuestionsSpan = document.getElementById('total-questions-num');
    const exitQuizBtn       = document.getElementById('exit-quiz-btn');
    const progressFill      = document.getElementById('progress-fill');
    const questionText      = document.getElementById('question-text');
    const answersContainer  = document.getElementById('answers-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon      = document.getElementById('feedback-icon');
    const feedbackText      = document.getElementById('feedback-text');
    const currentScoreStatus = document.getElementById('current-score');

    // DOM — Question count (start-screen)
    const questionCountSelect = document.getElementById('question-count');
    const questionCountCustom = document.getElementById('question-count-custom');
    const questionCountRandom = document.getElementById('question-count-random');

    // DOM — Question count (intro-screen)
    const introCountSelect = document.getElementById('intro-question-count');
    const introCountCustom = document.getElementById('intro-question-count-custom');
    const introCountRandom = document.getElementById('intro-question-count-random');

    if (window.quizzesData && Object.keys(window.quizzesData).length > 0) {
        quizzesData = window.quizzesData;
        initApp();
    } else {
        console.error('Failed to find window.quizzesData. Ensure quizzes.js is loaded in the HTML.');
        showLoadError();
    }

    function showLoadError() {
        quizSelect.innerHTML = '<option disabled>Impossible de charger les quiz</option>';
        loadingError.classList.remove('hidden');
    }

    function initApp() {
        const topics = Object.keys(quizzesData);
        const urlParams = new URLSearchParams(window.location.search);
        const directQuizParam = urlParams.get('quiz');
        const preselectParam = urlParams.get('preselect');

        let matchedTopic = null;
        if (directQuizParam) {
            const searchSlug = directQuizParam.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            matchedTopic = topics.find(t =>
                t.toLowerCase().replace(/[^a-z0-9]+/g, '-') === searchSlug
            );
        }

        if (matchedTopic) {
            selectTopic(matchedTopic);
        } else if (topics.length === 1) {
            selectTopic(topics[0]);
        } else {
            populateTopics(topics);
            startScreen.classList.remove('active');
            startScreen.classList.add('hidden');
            topicScreen.classList.remove('hidden');
            topicScreen.classList.add('active');
        }

        if (preselectParam) {
            var optStart = quizSelect.querySelector('option[value="' + preselectParam + '"]');
            if (optStart) {
                quizSelect.value = preselectParam;
                introQuizSelect.value = preselectParam;
                selectedQuizKey = preselectParam;
                startBtn.disabled = false;
                introStartBtn.disabled = false;
                var preTotal = (selectedTopicKey
                    ? (quizzesData[selectedTopicKey][preselectParam] || []).length
                    : 0);
                if (preTotal > 0) {
                    initCountControls(preTotal);
                    launchQuiz(preselectParam);
                }
            }
        }
    }

    function populateTopics(topics) {
        const container = document.getElementById('topics-container');
        container.innerHTML = '';
        const history = loadHistory();

        topics.forEach(topic => {
            const topicHistory = history[topic] || {};
            const subQuizKeys = Object.keys(quizzesData[topic] || {})
                .filter(k => k !== '_intro' && k !== '_description');
            const doneCount = subQuizKeys.filter(k => topicHistory[k]).length;
            const allDone = doneCount > 0 && doneCount === subQuizKeys.length;

            const btn = document.createElement('button');
            btn.className = 'btn btn-outline topic-btn' + (allDone ? ' topic-done' : '');

            const left = document.createElement('div');
            left.className = 'topic-btn-left';

            const label = document.createElement('span');
            label.className = 'topic-name';
            label.textContent = topic;
            left.appendChild(label);

            const desc = (quizzesData[topic] || {})._description;
            if (desc) {
                const descEl = document.createElement('span');
                descEl.className = 'topic-desc';
                descEl.textContent = desc;
                left.appendChild(descEl);
            }

            const right = document.createElement('div');
            right.className = 'topic-btn-right';

            if (doneCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'topic-badge' + (allDone ? ' badge-success' : ' badge-partial');
                badge.textContent = `${doneCount}/${subQuizKeys.length}`;
                right.appendChild(badge);
            }

            const chevron = document.createElement('span');
            chevron.className = 'icon';
            chevron.setAttribute('aria-hidden', 'true');
            chevron.textContent = '→';
            right.appendChild(chevron);

            btn.appendChild(left);
            btn.appendChild(right);
            btn.onclick = () => selectTopic(topic);
            container.appendChild(btn);
        });

        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) clearBtn.classList.toggle('hidden', !hasAnyHistory());
    }

    function selectTopic(topic) {
        selectedTopicKey = topic;

        document.querySelector('.logo-container h1').textContent = topic;
        document.title = topic;
        const welcomeH2 = document.querySelector('#start-screen .welcome-card h2');
        if (welcomeH2) welcomeH2.textContent = topic;

        const subQuizKeys = Object.keys(quizzesData[topic])
            .filter(k => k !== '_intro' && k !== '_description');
        const history = loadHistory();
        const topicHistory = history[topic] || {};

        const buildOptions = () =>
            '<option value="" disabled selected>-- Sélectionnez un niveau/quiz --</option>'
            + subQuizKeys.map(key => {
                const result = topicHistory[key];
                const badge = result ? ` \u00a0${scoreBadge(result)}` : '';
                const label = key.startsWith(topic + ' - ')
                    ? key.slice(topic.length + 3)
                    : key;
                return `<option value="${key}">${label}${badge}</option>`;
            }).join('');

        quizSelect.innerHTML = buildOptions();
        introQuizSelect.innerHTML = buildOptions();
        quizSelect.disabled = false;
        introQuizSelect.disabled = false;

        if (subQuizKeys.length === 1) {
            quizSelect.value = subQuizKeys[0];
            introQuizSelect.value = subQuizKeys[0];
            startBtn.disabled = false;
            introStartBtn.disabled = false;
            initCountControls((quizzesData[topic][subQuizKeys[0]] || []).length);
        } else {
            quizSelect.value = '';
            introQuizSelect.value = '';
            startBtn.disabled = true;
            introStartBtn.disabled = true;
            resetCountControls();
        }

        if (headerScore) headerScore.classList.add('hidden');

        if (Object.keys(quizzesData).length > 1) {
            backToTopicsBtn.classList.remove('hidden');
        } else {
            backToTopicsBtn.classList.add('hidden');
        }

        if (quizzesData[topic]._intro) {
            renderIntro(topic, quizzesData[topic]._intro);
            const fromScreen = topicScreen.classList.contains('active') ? topicScreen
                             : resultsScreen.classList.contains('active') ? resultsScreen
                             : startScreen;
            switchScreen(fromScreen, introScreen);
        } else {
            const fromScreen = topicScreen.classList.contains('active') ? topicScreen : resultsScreen;
            switchScreen(fromScreen, startScreen);
        }
    }

    function renderIntro(topic, intro) {
        document.getElementById('intro-title').textContent = topic;
        const container = document.getElementById('intro-content');
        if (typeof intro === 'string') {
            container.innerHTML = intro;
            return;
        }
        container.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'intro-table';
        const tbody = document.createElement('tbody');
        let titleEmitted = false;

        intro.forEach(row => {
            const nonEmpty = row.filter(c => String(c).trim() !== '');
            const tr = document.createElement('tr');

            if (nonEmpty.length === 0) {
                tr.className = 'blank-row';
                const td = document.createElement('td');
                td.colSpan = 3;
                td.innerHTML = '&nbsp;';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            if (!titleEmitted) {
                titleEmitted = true;
                tr.className = 'title-row';
                if (nonEmpty.length === 1) {
                    const td = document.createElement('td');
                    td.colSpan = 3;
                    td.textContent = String(nonEmpty[0]).trim();
                    tr.appendChild(td);
                } else {
                    const th = document.createElement('th');
                    th.textContent = String(row[0]).trim();
                    tr.appendChild(th);
                    const td = document.createElement('td');
                    td.colSpan = 2;
                    td.textContent = String(row[1] || '').trim();
                    tr.appendChild(td);
                }
            } else if (nonEmpty.length === 1) {
                tr.className = 'section-header';
                const td = document.createElement('td');
                td.colSpan = 3;
                td.textContent = String(nonEmpty[0]).trim();
                tr.appendChild(td);
            } else if (nonEmpty.length === 2) {
                tr.className = 'focus-point';
                const th = document.createElement('th');
                th.textContent = String(row[0]).trim();
                tr.appendChild(th);
                const td = document.createElement('td');
                td.colSpan = 2;
                td.textContent = String(row[1] || '').trim();
                tr.appendChild(td);
            } else {
                tr.className = 'explanation';
                row.slice(0, 3).forEach(cell => {
                    const td = document.createElement('td');
                    td.textContent = String(cell || '').trim();
                    tr.appendChild(td);
                });
            }

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }

    backToTopicsBtn.addEventListener('click', () => {
        document.querySelector('.logo-container h1').textContent = 'Quiz de Français';
        document.title = 'Quiz de Français';
        switchScreen(startScreen, topicScreen);
    });

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyCleared  = document.getElementById('history-cleared-msg');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            const confirmed = confirm(
                '⚠️ Voulez-vous vraiment effacer tout votre historique ?\n\n' +
                'Cela supprimera les résultats de tous vos quiz. Cette action est irréversible.'
            );
            if (confirmed) {
                clearHistory();
                populateTopics(Object.keys(quizzesData));
                clearHistoryBtn.classList.add('hidden');
                historyCleared.classList.remove('hidden');
                setTimeout(() => historyCleared.classList.add('hidden'), 3000);
            }
        });
    }

    document.getElementById('back-from-intro-btn').addEventListener('click', () => {
        switchScreen(introScreen, topicScreen);
    });

    introQuizSelect.addEventListener('change', function() {
        introStartBtn.disabled = !introQuizSelect.value;
        quizSelect.value = introQuizSelect.value;
        if (introQuizSelect.value && selectedTopicKey) {
            var total = (quizzesData[selectedTopicKey][introQuizSelect.value] || []).length;
            initCountControls(total);
        } else {
            resetCountControls();
        }
    });

    introStartBtn.addEventListener('click', function() {
        selectedQuizKey = introQuizSelect.value;
        quizSelect.value = selectedQuizKey;
        launchQuiz(selectedQuizKey);
    });

    quizSelect.addEventListener('change', function() {
        startBtn.disabled = !quizSelect.value;
        introQuizSelect.value = quizSelect.value;
        if (quizSelect.value && selectedTopicKey) {
            var total = (quizzesData[selectedTopicKey][quizSelect.value] || []).length;
            initCountControls(total);
        } else {
            resetCountControls();
        }
    });

    startBtn.addEventListener('click', function() {
        selectedQuizKey = quizSelect.value;
        launchQuiz(selectedQuizKey);
    });

    // ── Question count selector helpers ──────────────────────────────────────

    var isRandomActive = true;

    function resetCountControls() {
        [questionCountSelect, introCountSelect].forEach(function(sel) {
            sel.innerHTML = '<option value="" disabled selected>\u2014</option>';
            sel.disabled = true;
        });
        [questionCountCustom, introCountCustom].forEach(function(inp) {
            inp.value = '';
            inp.disabled = true;
        });
        [questionCountRandom, introCountRandom].forEach(function(btn) {
            btn.disabled = true;
            btn.classList.remove('active');
        });
    }

    function initCountControls(total) {
        var defaultN = Math.min(10, total);

        [questionCountSelect, introCountSelect].forEach(function(sel) {
            sel.innerHTML = '';
            [
                { value: 'default', text: 'D\u00e9faut' },
                { value: 'all',     text: 'Toutes les questions' },
                { value: 'custom',  text: 'Autres (1 - ' + total + ')' },
            ].forEach(function(item) {
                var o = document.createElement('option');
                o.value = item.value;
                o.textContent = item.text;
                sel.appendChild(o);
            });
            sel.value = 'default';
            sel.disabled = false;
        });

        [questionCountCustom, introCountCustom].forEach(function(inp) {
            inp.value = String(defaultN);
            inp.max = String(total);
            inp.disabled = true;
        });

        isRandomActive = true;
        [questionCountRandom, introCountRandom].forEach(function(btn) {
            btn.disabled = false;
            btn.classList.add('active');
        });
    }

    function onCountSelectChange(srcSel, srcInp, destSel, destInp) {
        var key = quizSelect.value || introQuizSelect.value;
        var total = (key && selectedTopicKey)
            ? (quizzesData[selectedTopicKey][key] || []).length
            : 10;
        var defaultN = Math.min(10, total);
        var val = srcSel.value;

        if (val === 'default') {
            srcInp.value = String(defaultN);
            srcInp.disabled = true;
        } else if (val === 'all') {
            srcInp.value = String(total);
            srcInp.disabled = true;
        } else {
            srcInp.value = String(defaultN);
            srcInp.max = String(total);
            srcInp.disabled = false;
            srcInp.focus();
        }

        destSel.value = val;
        destInp.value = srcInp.value;
        destInp.disabled = srcInp.disabled;
        destInp.max = srcInp.max || '';
    }

    questionCountSelect.addEventListener('change', function() {
        onCountSelectChange(questionCountSelect, questionCountCustom,
                            introCountSelect,    introCountCustom);
    });

    introCountSelect.addEventListener('change', function() {
        onCountSelectChange(introCountSelect,    introCountCustom,
                            questionCountSelect, questionCountCustom);
    });

    [questionCountRandom, introCountRandom].forEach(function(btn) {
        btn.addEventListener('click', function() {
            isRandomActive = !isRandomActive;
            [questionCountRandom, introCountRandom].forEach(function(b) {
                b.classList.toggle('active', isRandomActive);
            });
        });
    });

    questionCountCustom.addEventListener('input', function() {
        introCountCustom.value = questionCountCustom.value;
    });

    introCountCustom.addEventListener('input', function() {
        questionCountCustom.value = introCountCustom.value;
    });

    // ── Quiz launch ───────────────────────────────────────────────────────────

    function launchQuiz(quizKey) {
        var allQuestions = quizzesData[selectedTopicKey][quizKey];
        if (!allQuestions || allQuestions.length === 0) return;

        var total = allQuestions.length;
        var val = questionCountSelect.value;
        var count;
        if (val === 'all') {
            count = total;
        } else if (val === 'custom') {
            var n = parseInt(questionCountCustom.value, 10);
            count = isNaN(n) || n < 1 ? Math.min(10, total) : Math.min(n, total);
        } else {
            count = Math.min(10, total);
        }

        var pool = isRandomActive
            ? [...allQuestions].sort(() => 0.5 - Math.random())
            : [...allQuestions];
        currentQuiz = pool.slice(0, count);

        incorrectQuestions = [];
        if (retryWrongBtn) retryWrongBtn.classList.add('hidden');
        currentQuestionIndex = 0;
        score = 0;
        updateScoreHeader();

        const fromScreen = introScreen.classList.contains('active') ? introScreen : startScreen;
        switchScreen(fromScreen, quizScreen);
        if (headerScore) headerScore.classList.remove('hidden');

        loadQuestion();
    }

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuiz.length) {
            loadQuestion();
        } else {
            showResults();
        }
    });

    exitQuizBtn.addEventListener('click', () => {
        if (confirm('Voulez-vous vraiment quitter ce quiz ? Votre progression sera perdue.')) {
            quizSelect.value = '';
            startBtn.disabled = true;
            if (headerScore) headerScore.classList.add('hidden');
            if (selectedTopicKey && quizzesData[selectedTopicKey]?._intro) {
                switchScreen(quizScreen, introScreen);
            } else {
                switchScreen(quizScreen, startScreen);
            }
        }
    });

    if (retryWrongBtn) {
        retryWrongBtn.addEventListener('click', () => {
            if (incorrectQuestions.length === 0) return;
            currentQuiz = [...incorrectQuestions];
            incorrectQuestions = [];
            currentQuestionIndex = 0;
            score = 0;
            updateScoreHeader();
            switchScreen(resultsScreen, quizScreen);
            if (headerScore) headerScore.classList.remove('hidden');
            loadQuestion();
        });
    }

    returnBtn.addEventListener('click', () => {
        quizSelect.value = '';
        startBtn.disabled = true;
        if (headerScore) headerScore.classList.add('hidden');
        if (Object.keys(quizzesData).length > 1) {
            document.querySelector('.logo-container h1').textContent = 'Quiz de Français';
            document.title = 'Quiz de Français';
            switchScreen(resultsScreen, topicScreen);
        } else {
            switchScreen(resultsScreen, startScreen);
        }
    });

    // ── Question rendering ────────────────────────────────────────────────────

    function loadQuestion() {
        hasAnsweredCurrent = false;
        nextBtn.classList.add('hidden');
        feedbackContainer.classList.add('hidden');
        answersContainer.innerHTML = '';

        const q = currentQuiz[currentQuestionIndex];

        questionNumSpan.textContent = currentQuestionIndex + 1;
        totalQuestionsSpan.textContent = currentQuiz.length;
        progressFill.style.width = ((currentQuestionIndex / currentQuiz.length) * 100) + '%';
        questionText.textContent = q.Question;

        switch (q.Type) {
            case 'MultipleChoice': renderMultipleChoice(q, true);  break;
            case 'OddOneOut':      renderMultipleChoice(q, false); break;
            case 'TrueFalse':      renderTrueFalse(q);             break;
            case 'FillInBlank':    renderFillInBlank(q);           break;
            case 'Vocabulary':     renderVocabulary(q);            break;
            default: answersContainer.innerHTML = '<p>Type de question inconnu.</p>';
        }
    }

    function renderMultipleChoice(q, isMultiSelect) {
        const optionsList = typeof q.Options === 'string'
            ? q.Options.split(',').map(s => s.trim())
            : q.Options;

        const wrapper = document.createElement('div');
        wrapper.className = 'choices-wrapper';
        const selectedOptions = [];

        optionsList.forEach(optionText => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline';
            btn.textContent = optionText;
            if (isMultiSelect) {
                btn.onclick = () => {
                    const idx = selectedOptions.indexOf(optionText);
                    if (idx > -1) {
                        selectedOptions.splice(idx, 1);
                        btn.classList.remove('selected');
                    } else {
                        selectedOptions.push(optionText);
                        btn.classList.add('selected');
                    }
                };
            } else {
                btn.onclick = () => validateAnswer(optionText, q.Answer, btn, null, null, false);
            }
            wrapper.appendChild(btn);
        });

        answersContainer.appendChild(wrapper);

        if (isMultiSelect) {
            const submitWrapper = document.createElement('div');
            submitWrapper.className = 'submit-btn-wrapper';
            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.textContent = 'Soumettre';
            submitBtn.onclick = () => {
                if (selectedOptions.length === 0) return;
                submitBtn.style.display = 'none';
                validateAnswer(selectedOptions, q.Answer, null, null, wrapper, false);
            };
            submitWrapper.appendChild(submitBtn);
            answersContainer.appendChild(submitWrapper);
        }
    }

    function renderTrueFalse(q) {
        ['Vrai', 'Faux'].forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline';
            btn.textContent = val;
            btn.onclick = () => validateAnswer(val, q.Answer, btn, null, null, false);
            answersContainer.appendChild(btn);
        });
    }

    function renderFillInBlank(q) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Tapez votre réponse ici...';
        input.className = 'text-input';

        const wrapper = document.createElement('div');
        wrapper.className = 'submit-btn-wrapper';
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'Soumettre';
        btn.onclick = () => {
            if (input.value.trim() === '') return;
            btn.style.display = 'none';
            validateAnswer(input.value, q.Answer, null, input, null, false);
        };
        input.addEventListener('keypress', e => { if (e.key === 'Enter') btn.click(); });

        wrapper.appendChild(btn);
        answersContainer.appendChild(input);
        answersContainer.appendChild(wrapper);
        setTimeout(() => input.focus(), 100);
    }

    function renderVocabulary(q) {
        if (q.Options && String(q.Options).trim()) {
            const hint = document.createElement('p');
            hint.className = 'vocabulary-hint';
            hint.textContent = String(q.Options).trim();
            answersContainer.appendChild(hint);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Tapez votre réponse ici...';
        input.className = 'text-input';

        const wrapper = document.createElement('div');
        wrapper.className = 'submit-btn-wrapper';
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'Soumettre';
        btn.onclick = () => {
            if (input.value.trim() === '') return;
            btn.style.display = 'none';
            validateAnswer(input.value, q.Answer, null, input, null, true);
        };
        input.addEventListener('keypress', e => { if (e.key === 'Enter') btn.click(); });

        wrapper.appendChild(btn);
        answersContainer.appendChild(input);
        answersContainer.appendChild(wrapper);
        setTimeout(() => input.focus(), 100);
    }

    // ── Answer validation ─────────────────────────────────────────────────────

    function validateAnswer(userResponse, correctAnswer, btnElement, inputElement, wrapperElement, isVocabulary) {
        if (hasAnsweredCurrent) return;
        hasAnsweredCurrent = true;

        const userArr = Array.isArray(userResponse) ? userResponse : [userResponse];
        const correctArr = typeof correctAnswer === 'string'
            ? correctAnswer.split(',').map(s => s.trim().toLowerCase())
            : [String(correctAnswer).toLowerCase()];

        const cleanUser    = new Set(userArr.map(s => String(s).trim().toLowerCase()));
        const cleanCorrect = new Set(correctArr);

        const isCorrect = isVocabulary
            ? correctArr.some(a => a === String(userResponse).trim().toLowerCase())
            : cleanUser.size === cleanCorrect.size && [...cleanUser].every(v => cleanCorrect.has(v));

        if (isCorrect) {
            score++;
            updateScoreHeader();
            if (wrapperElement) {
                wrapperElement.querySelectorAll('.btn-outline').forEach(b => {
                    if (cleanCorrect.has(b.textContent.trim().toLowerCase())) b.classList.add('correct-answer');
                });
            } else if (btnElement) {
                btnElement.classList.add('correct-answer');
            } else if (inputElement) {
                inputElement.style.borderColor = 'var(--success)';
            }
            showFeedback(true, currentQuiz[currentQuestionIndex].FeedbackCorrect);
        } else {
            if (wrapperElement) {
                wrapperElement.querySelectorAll('.btn-outline').forEach(b => {
                    const text = b.textContent.trim().toLowerCase();
                    if (cleanUser.has(text) && !cleanCorrect.has(text)) b.classList.add('wrong-answer');
                    if (cleanCorrect.has(text)) b.classList.add('correct-answer');
                });
            } else if (btnElement) {
                btnElement.classList.add('wrong-answer');
                answersContainer.querySelectorAll('.btn-outline').forEach(b => {
                    if (cleanCorrect.has(b.textContent.trim().toLowerCase())) b.classList.add('correct-answer');
                });
            } else if (inputElement) {
                inputElement.style.borderColor = 'var(--error)';
            }
            showFeedback(false, currentQuiz[currentQuestionIndex].FeedbackIncorrect);
            incorrectQuestions.push(currentQuiz[currentQuestionIndex]);
        }

        answersContainer.querySelectorAll('button').forEach(b => { b.disabled = true; });
        if (inputElement) inputElement.disabled = true;
        nextBtn.classList.remove('hidden');
    }

    function showFeedback(isCorrect, text) {
        feedbackContainer.className = 'feedback-container';
        feedbackContainer.classList.add(isCorrect ? 'correct' : 'incorrect');
        feedbackIcon.textContent = isCorrect ? '✓' : '✕';
        let msg = `<strong>${isCorrect ? 'Correct !' : 'Faux !'}</strong>`;
        if (text) msg += `<br/>${text}`;
        feedbackText.innerHTML = msg;
        feedbackContainer.classList.remove('hidden');
    }

    function updateScoreHeader() {
        if (currentScoreStatus) currentScoreStatus.textContent = score;
    }

    function showResults() {
        saveResult(selectedTopicKey, selectedQuizKey, score, currentQuiz.length);
        if (Object.keys(quizzesData).length > 1) populateTopics(Object.keys(quizzesData));
        progressFill.style.width = '100%';

        setTimeout(() => {
            switchScreen(quizScreen, resultsScreen);
            if (retryWrongBtn) {
                retryWrongBtn.classList.toggle('hidden', incorrectQuestions.length === 0);
            }
            document.getElementById('final-score').textContent = score;
            document.getElementById('final-total').textContent = currentQuiz.length;

            const pct = (score / currentQuiz.length) * 100;
            const circlePath = document.getElementById('score-circle-path');
            const pctText    = document.getElementById('score-percentage');
            pctText.textContent = Math.round(pct) + '%';
            circlePath.style.strokeDasharray = '0, 100';
            setTimeout(() => { circlePath.style.strokeDasharray = `${pct}, 100`; }, 100);
            circlePath.className.baseVal = 'circle';
            if (pct >= 80)      circlePath.classList.add('success');
            else if (pct >= 50) circlePath.classList.add('warning');
            else                circlePath.classList.add('error');
        }, 500);
    }

    function switchScreen(hideOld, showNew) {
        hideOld.classList.remove('active');
        hideOld.classList.add('hidden');
        showNew.classList.remove('hidden');
        showNew.classList.add('active');
    }
});
