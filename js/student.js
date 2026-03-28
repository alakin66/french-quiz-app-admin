document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let quizzesData = null;
    let selectedQuizKey = null;
    let selectedTopicKey = null;
    let currentQuiz = [];
    let incorrectQuestions = [];  // questions answered wrong in last session
    let currentQuestionIndex = 0;
    let score = 0;
    let hasAnsweredCurrent = false;

    // =============================================
    // LocalStorage History Module
    // =============================================
    const HISTORY_KEY = 'french_quiz_history';

    function loadHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; }
        catch(e) { return {}; }
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

    function getQuizResult(topic, quizKey) {
        const h = loadHistory();
        return (h[topic] || {})[quizKey] || null;
    }

    function clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
    }

    function hasAnyHistory() {
        const h = loadHistory();
        return Object.keys(h).length > 0;
    }

    function scoreBadge(result) {
        if (!result) return '';
        const pct = Math.round((result.lastScore / result.lastTotal) * 100);
        const emoji = pct >= 80 ? '✅' : pct >= 50 ? '🟡' : '🔴';
        return emoji;
    }

    // DOM Elements
    // Screens
    const topicScreen = document.getElementById('topic-screen');
    const introScreen = document.getElementById('intro-screen');
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultsScreen = document.getElementById('results-screen');
    const headerScore = document.getElementById('header-score');

    // Controls
    const quizSelect = document.getElementById('quiz-select');
    const startBtn = document.getElementById('start-btn');
    const introStartBtn = document.getElementById('intro-start-btn');
    const introQuizSelect = document.getElementById('intro-quiz-select');
    const nextBtn = document.getElementById('next-btn');
    const returnBtn = document.getElementById('return-btn');
    const retryWrongBtn = document.getElementById('retry-wrong-btn');
    const backToTopicsBtn = document.getElementById('back-to-topics-btn');
    const loadingError = document.getElementById('loading-error');

    // Quiz elements
    const questionNumSpan = document.getElementById('current-question-num');
    const totalQuestionsSpan = document.getElementById('total-questions-num');
    const exitQuizBtn = document.getElementById('exit-quiz-btn');
    const progressFill = document.getElementById('progress-fill');
    const questionText = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackText = document.getElementById('feedback-text');
    const currentScoreStatus = document.getElementById('current-score');

    // Load Quiz Data from window namespace (self-contained)
    if (window.quizConfig && window.quizConfig.title) {
        document.querySelector('.logo-container h1').textContent = window.quizConfig.title;
        document.title = window.quizConfig.title;
        const welcomeCardH2 = document.querySelector('.welcome-card h2');
        if (welcomeCardH2) welcomeCardH2.textContent = window.quizConfig.title;
    }

    if (window.quizzesData && Object.keys(window.quizzesData).length > 0) {
        quizzesData = window.quizzesData;
        const topics = Object.keys(quizzesData);
        
        // Handle Direct Link routing via ?quiz= parameter
        const urlParams = new URLSearchParams(window.location.search);
        const directQuizParam = urlParams.get('quiz');
        let matchedTopic = null;

        if (directQuizParam) {
            const searchSlug = directQuizParam.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            matchedTopic = topics.find(t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-') === searchSlug);
        }

        if (matchedTopic) {
            // Auto-select the requested module
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
    } else {
        console.error("Failed to find window.quizzesData. Ensure quizzes.js is loaded in the HTML.");
        quizSelect.innerHTML = '<option disabled>Impossible de charger les quiz</option>';
        loadingError.classList.remove('hidden');
    }

    function populateTopics(topics) {
        const container = document.getElementById('topics-container');
        container.innerHTML = '';
        const history = loadHistory();
        topics.forEach(topic => {
            const topicHistory = history[topic] || {};
            const subQuizKeys = Object.keys((quizzesData[topic] || {})).filter(k => k !== '_intro');
            const doneCount = subQuizKeys.filter(k => topicHistory[k]).length;
            const allDone = doneCount > 0 && doneCount === subQuizKeys.length;

            const btn = document.createElement('button');
            btn.className = 'btn btn-outline topic-btn' + (allDone ? ' topic-done' : '');

            const label = document.createElement('span');
            label.textContent = topic;

            const right = document.createElement('div');
            right.className = 'topic-btn-right';

            if (doneCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'topic-badge' + (allDone ? ' badge-success' : ' badge-partial');
                badge.textContent = `${doneCount}/${subQuizKeys.length}`;
                right.appendChild(badge);
            }

            const chevron = document.createElement('i');
            chevron.className = 'ms-Icon ms-Icon--ChevronRightSmall';
            right.appendChild(chevron);

            btn.appendChild(label);
            btn.appendChild(right);
            btn.onclick = () => selectTopic(topic);
            container.appendChild(btn);
        });

        // Show / hide the clear history button
        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) clearBtn.classList.toggle('hidden', !hasAnyHistory());
    }

    function selectTopic(topic) {
        selectedTopicKey = topic;
        
        // Update Title & H1
        document.querySelector('.logo-container h1').textContent = topic;
        document.title = topic;
        const welcomeCardH2 = document.querySelector('#start-screen .welcome-card h2');
        if (welcomeCardH2) welcomeCardH2.textContent = topic;

        // Populate the dropdown with the subquizzes (both on start-screen and intro-screen)
        const subQuizzes = Object.keys(quizzesData[topic]).filter(k => k !== '_intro');
        const history = loadHistory();
        const topicHistory = history[topic] || {};

        const buildOptions = () => '<option value="" disabled selected>-- S\u00e9lectionnez un niveau/quiz --</option>'
            + subQuizzes.map(sub => {
                const result = topicHistory[sub];
                const badge = result ? ` \u00a0${scoreBadge(result)}` : '';
                return `<option value="${sub}">${sub}${badge}</option>`;
            }).join('');

        quizSelect.innerHTML = buildOptions();
        introQuizSelect.innerHTML = buildOptions();
        
        quizSelect.disabled = false;
        introQuizSelect.disabled = false;

        // Auto-select if there's only one subquiz
        if (subQuizzes.length === 1) {
            quizSelect.value = subQuizzes[0];
            introQuizSelect.value = subQuizzes[0];
            startBtn.disabled = false;
            introStartBtn.disabled = false;
        } else {
            quizSelect.value = '';
            introQuizSelect.value = '';
            startBtn.disabled = true;
            introStartBtn.disabled = true;
        }

        if (headerScore) headerScore.classList.add('hidden');

        // Show back button only if there are multiple topics total
        if (Object.keys(quizzesData).length > 1) {
            backToTopicsBtn.classList.remove('hidden');
        } else {
            backToTopicsBtn.classList.add('hidden');
        }

        // If topic has intro data, show intro screen first
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

    function renderIntro(topic, rows) {
        document.getElementById('intro-title').textContent = topic;
        const container = document.getElementById('intro-content');
        container.innerHTML = '';

        rows.forEach(row => {
            const nonEmpty = row.filter(c => String(c).trim() !== '');
            if (nonEmpty.length === 0) return;

            if (nonEmpty.length === 1) {
                // Single cell: heading or paragraph
                const text = String(nonEmpty[0]).trim();
                const el = document.createElement('h3');
                el.className = 'intro-section-heading';
                el.textContent = text;
                container.appendChild(el);
            } else {
                // Multi-cell: part of a table group — collect into a table
                // We need to group consecutive multi-cell rows
                const table = buildOrAppendTable(container, row);
            }
        });

        // Now reprocess: group multi-cell rows into <table> elements properly
        container.innerHTML = '';
        let currentTable = null;
        rows.forEach(row => {
            const nonEmpty = row.filter(c => String(c).trim() !== '');
            if (nonEmpty.length === 0) {
                currentTable = null;
                return;
            }
            if (nonEmpty.length === 1) {
                currentTable = null;
                const el = document.createElement('h3');
                el.className = 'intro-section-heading';
                el.textContent = String(nonEmpty[0]).trim();
                container.appendChild(el);
            } else {
                if (!currentTable) {
                    currentTable = document.createElement('table');
                    currentTable.className = 'intro-table';
                    container.appendChild(currentTable);
                }
                const tr = document.createElement('tr');
                row.forEach((cell, i) => {
                    const td = i === 0 ? document.createElement('th') : document.createElement('td');
                    td.textContent = String(cell);
                    tr.appendChild(td);
                });
                currentTable.appendChild(tr);
            }
        });
    }

    function buildOrAppendTable(container, row) { /* unused helper */ }

    backToTopicsBtn.addEventListener('click', () => {
        document.querySelector('.logo-container h1').textContent = "Quiz de Français";
        document.title = "Quiz de Français";
        switchScreen(startScreen, topicScreen);
    });

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyCleared = document.getElementById('history-cleared-msg');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            const confirmed = confirm(
                '⚠️ Voulez-vous vraiment effacer tout votre historique ?\n\nCela supprimera les résultats de tous vos quiz. Cette action est irréversible.'
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

    introQuizSelect.addEventListener('change', () => {
        if (introQuizSelect.value) introStartBtn.disabled = false;
    });

    introStartBtn.addEventListener('click', () => {
        selectedQuizKey = introQuizSelect.value;
        // Keep both selects in sync
        quizSelect.value = selectedQuizKey;
        launchQuiz(selectedQuizKey);
    });

    quizSelect.addEventListener('change', () => {
        if (quizSelect.value) {
            startBtn.disabled = false;
        }
    });

    startBtn.addEventListener('click', () => {
        selectedQuizKey = quizSelect.value;
        launchQuiz(selectedQuizKey);
    });

    function launchQuiz(quizKey) {
        const allQuestions = quizzesData[selectedTopicKey][quizKey];
        if (!allQuestions || allQuestions.length === 0) return;

        // Shuffle and pick 10 questions randomly
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
        currentQuiz = shuffled.slice(0, 10);

        // Initialize state
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
        if (confirm("Voulez-vous vraiment quitter ce quiz ? Votre progression sera perdue.")) {
            quizSelect.value = "";
            startBtn.disabled = true;
            if (headerScore) headerScore.classList.add('hidden');
            switchScreen(quizScreen, startScreen);
        }
    });

    if (retryWrongBtn) {
        retryWrongBtn.addEventListener('click', () => {
            if (incorrectQuestions.length === 0) return;
            
            // Prepare the retry session
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
        quizSelect.value = "";
        startBtn.disabled = true;
        if (headerScore) headerScore.classList.add('hidden');
        
        if (Object.keys(quizzesData).length > 1) {
            document.querySelector('.logo-container h1').textContent = "Quiz de Français";
            document.title = "Quiz de Français";
            switchScreen(resultsScreen, topicScreen);
        } else {
            switchScreen(resultsScreen, startScreen);
        }
    });

    function loadQuestion() {
        hasAnsweredCurrent = false;
        nextBtn.classList.add('hidden');
        feedbackContainer.classList.add('hidden');
        answersContainer.innerHTML = '';
        
        const q = currentQuiz[currentQuestionIndex];
        
        // Progress update
        questionNumSpan.textContent = currentQuestionIndex + 1;
        totalQuestionsSpan.textContent = currentQuiz.length;
        const width = ((currentQuestionIndex) / currentQuiz.length) * 100;
        progressFill.style.width = width + '%';

        // Question text
        questionText.textContent = q.Question;

        // Render answers based on type
        switch (q.Type) {
            case 'MultipleChoice':
                renderMultipleChoice(q, true);
                break;
            case 'OddOneOut':
                renderMultipleChoice(q, false);
                break;
            case 'TrueFalse':
                renderTrueFalse(q);
                break;
            case 'FillInBlank':
                renderFillInBlank(q);
                break;
            default:
                answersContainer.innerHTML = '<p>Type de question inconnu.</p>';
        }

        // Add subtle animation reset
        answersContainer.style.animation = 'none';
        answersContainer.offsetHeight; /* trigger reflow */
        answersContainer.style.animation = 'slideIn 0.3s ease';
    }

    function renderMultipleChoice(q, isMultiSelect = false) {
        // Options should be a comma separated string according to instructions
        const optionsList = typeof q.Options === 'string' ? q.Options.split(',').map(s => s.trim()) : q.Options;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'choices-wrapper';
        
        let selectedOptions = [];

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
                btn.onclick = () => validateAnswer(optionText, q.Answer, btn);
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
                validateAnswer(selectedOptions, q.Answer, null, null, wrapper);
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
            btn.onclick = () => validateAnswer(val, q.Answer, btn);
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
            validateAnswer(input.value, q.Answer, null, input);
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btn.click();
            }
        });

        wrapper.appendChild(btn);
        answersContainer.appendChild(input);
        answersContainer.appendChild(wrapper);
        
        // Auto focus
        setTimeout(() => input.focus(), 100);
    }

    function validateAnswer(userResponse, correctAnswer, btnElement, inputElement = null, wrapperElement = null) {
        if (hasAnsweredCurrent) return;
        hasAnsweredCurrent = true;

        // Clean arrays
        const userArr = Array.isArray(userResponse) ? userResponse : [userResponse];
        const correctArr = typeof correctAnswer === 'string' ? correctAnswer.split(',').map(s => s.trim().toLowerCase()) : [correctAnswer];

        const cleanUserSet = new Set(userArr.map(s => typeof s === 'string' ? s.trim().toLowerCase() : s));
        const cleanCorrectSet = new Set(correctArr);

        // Check if sets match exactly
        const isCorrect = cleanUserSet.size === cleanCorrectSet.size && [...cleanUserSet].every(val => cleanCorrectSet.has(val));

        if (isCorrect) {
            score++;
            updateScoreHeader();
            
            if (wrapperElement) {
                 const allButtons = wrapperElement.querySelectorAll('.btn-outline');
                 allButtons.forEach(b => {
                     if (cleanCorrectSet.has(b.textContent.trim().toLowerCase())) {
                         b.classList.add('correct-answer');
                     }
                 });
            } else if (btnElement) {
                btnElement.classList.add('correct-answer');
            } else if (inputElement) {
                inputElement.style.borderColor = 'var(--success-color)';
            }
            showFeedback(true, currentQuiz[currentQuestionIndex].FeedbackCorrect);
        } else {
            if (wrapperElement) {
                 const allButtons = wrapperElement.querySelectorAll('.btn-outline');
                 allButtons.forEach(b => {
                     const text = b.textContent.trim().toLowerCase();
                     if (cleanUserSet.has(text) && !cleanCorrectSet.has(text)) {
                         b.classList.add('wrong-answer');
                     }
                     if (cleanCorrectSet.has(text)) {
                         b.classList.add('correct-answer');
                     }
                 });
            } else if (btnElement) {
                btnElement.classList.add('wrong-answer');
                // Highlight the correct answer if it's a multiple choice
                const allButtons = answersContainer.querySelectorAll('.btn-outline');
                allButtons.forEach(b => {
                    if (cleanCorrectSet.has(b.textContent.trim().toLowerCase())) {
                        b.classList.add('correct-answer');
                    }
                });
            } else if (inputElement) {
                inputElement.style.borderColor = 'var(--error-color)';
            }
            showFeedback(false, currentQuiz[currentQuestionIndex].FeedbackIncorrect);
            // Track this question for retry
            incorrectQuestions.push(currentQuiz[currentQuestionIndex]);
        }

        // Disable all inputs
        const buttons = answersContainer.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);
        if (inputElement) inputElement.disabled = true;

        nextBtn.classList.remove('hidden');
    }

    function showFeedback(isCorrect, text) {
        feedbackContainer.className = 'feedback-container'; // reset
        feedbackContainer.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        feedbackIcon.innerHTML = isCorrect ? '<i class="ms-Icon ms-Icon--CheckMark" aria-hidden="true"></i>' : '<i class="ms-Icon ms-Icon--Cancel" aria-hidden="true"></i>';
        
        let feedbackMessage = `<strong>${isCorrect ? 'Correct !' : 'Faux !'}</strong> `;
        if (text) {
            feedbackMessage += `<br/>${text}`;
        }
        
        feedbackText.innerHTML = feedbackMessage;
        feedbackContainer.classList.remove('hidden');
    }


    function updateScoreHeader() {
        if (currentScoreStatus) currentScoreStatus.textContent = score;
    }

    function showResults() {
        // Save result to localStorage
        saveResult(selectedTopicKey, selectedQuizKey, score, currentQuiz.length);

        // Refresh topic list badges if we are coming back
        if (Object.keys(quizzesData).length > 1) {
            populateTopics(Object.keys(quizzesData));
        }
        // set 100% progress
        progressFill.style.width = '100%';
        
        setTimeout(() => {
            switchScreen(quizScreen, resultsScreen);
            
            if (retryWrongBtn) {
                if (incorrectQuestions && incorrectQuestions.length > 0) {
                    retryWrongBtn.classList.remove('hidden');
                } else {
                    retryWrongBtn.classList.add('hidden');
                }
            }

            document.getElementById('final-score').textContent = score;
            document.getElementById('final-total').textContent = currentQuiz.length;
            
            const pct = (score / currentQuiz.length) * 100;
            const circlePath = document.getElementById('score-circle-path');
            const pctText = document.getElementById('score-percentage');
            
            pctText.textContent = Math.round(pct) + '%';
            
            // Re-trigger animation
            circlePath.style.strokeDasharray = `0, 100`;
            setTimeout(() => {
                circlePath.style.strokeDasharray = `${pct}, 100`;
            }, 100);

            circlePath.className.baseVal = 'circle';
            if (pct >= 80) circlePath.classList.add('success');
            else if (pct >= 50) circlePath.classList.add('warning');
            else circlePath.classList.add('error');

        }, 500);
    }

    function switchScreen(hideOld, showNew) {
        hideOld.classList.remove('active');
        hideOld.classList.add('hidden');
        showNew.classList.remove('hidden');
        showNew.classList.add('active');
    }
});
