document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let quizzesData = null;
    let selectedQuizKey = null;
    let selectedTopicKey = null;
    let currentQuiz = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let hasAnsweredCurrent = false;

    // DOM Elements
    // Screens
    const topicScreen = document.getElementById('topic-screen');
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultsScreen = document.getElementById('results-screen');
    const headerScore = document.getElementById('header-score');

    // Controls
    const quizSelect = document.getElementById('quiz-select');
    const startBtn = document.getElementById('start-btn');
    const nextBtn = document.getElementById('next-btn');
    const returnBtn = document.getElementById('return-btn');
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
        
        if (topics.length === 1) {
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
        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline topic-btn';
            btn.innerHTML = `<span>${topic}</span><i class="ms-Icon ms-Icon--ChevronRightSmall"></i>`;
            btn.onclick = () => selectTopic(topic);
            container.appendChild(btn);
        });
    }

    function selectTopic(topic) {
        selectedTopicKey = topic;
        
        // Update Title & H1
        document.querySelector('.logo-container h1').textContent = topic;
        document.title = topic;
        const welcomeCardH2 = document.querySelector('#start-screen .welcome-card h2');
        if (welcomeCardH2) welcomeCardH2.textContent = topic;

        // Populate the dropdown with the subquizzes
        const subQuizzes = Object.keys(quizzesData[topic]);
        quizSelect.innerHTML = '<option value="" disabled selected>-- Sélectionnez un niveau/quiz --</option>';
        
        subQuizzes.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            quizSelect.appendChild(option);
        });
        
        quizSelect.disabled = false;
        startBtn.disabled = true;
        quizSelect.value = '';

        // Show back button only if there are multiple topics total
        if (Object.keys(quizzesData).length > 1) {
            backToTopicsBtn.classList.remove('hidden');
        } else {
            backToTopicsBtn.classList.add('hidden');
        }

        if (topicScreen.classList.contains('active')) {
            switchScreen(topicScreen, startScreen);
        } else if (resultsScreen.classList.contains('active')) {
            switchScreen(resultsScreen, startScreen);
        }
    }

    backToTopicsBtn.addEventListener('click', () => {
        document.querySelector('.logo-container h1').textContent = "Quiz de Français";
        document.title = "Quiz de Français";
        switchScreen(startScreen, topicScreen);
    });

    quizSelect.addEventListener('change', () => {
        if (quizSelect.value) {
            startBtn.disabled = false;
        }
    });

    startBtn.addEventListener('click', () => {
        selectedQuizKey = quizSelect.value;
        const allQuestions = quizzesData[selectedTopicKey][selectedQuizKey];
        if (!allQuestions || allQuestions.length === 0) return;

        // Shuffle and pick 10 questions randomly
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
        currentQuiz = shuffled.slice(0, 10);

        // Initialize state
        currentQuestionIndex = 0;
        score = 0;
        updateScoreHeader();
        
        switchScreen(startScreen, quizScreen);
        headerScore.classList.remove('hidden');
        
        loadQuestion();
    });

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
            headerScore.classList.add('hidden');
            switchScreen(quizScreen, startScreen);
        }
    });

    returnBtn.addEventListener('click', () => {
        quizSelect.value = "";
        startBtn.disabled = true;
        headerScore.classList.add('hidden');
        
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
        currentScoreStatus.textContent = score;
    }

    function showResults() {
        // set 100% progress
        progressFill.style.width = '100%';
        
        setTimeout(() => {
            switchScreen(quizScreen, resultsScreen);
            
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
