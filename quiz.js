document.addEventListener('DOMContentLoaded', () => {
    let quizData = {};
    let currentDomain = 'domain1';
    let currentQuestionIndex = 0;
    let domains = [];

    const questionElement = document.getElementById('question');
    const yesRadio = document.getElementById('yes-radio');
    const noRadio = document.getElementById('no-radio');
    const hintButton = document.getElementById('hint-btn');
    const hintPopup = document.getElementById('hint-popup');
    const hintText = document.getElementById('hint-text');
    const closeHint = document.querySelector('.close');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');
    const pauseButton = document.getElementById('pause-btn');
    const resumeButton = document.getElementById('resume-btn');
    const pauseOverlay = document.getElementById('pause-overlay');
    const domainButtons = document.querySelectorAll('.sidebar button');

    function loadQuizData() {
        fetch('quizData.json')
            .then(response => response.json())
            .then(data => {
                quizData = data;
                domains = Object.keys(quizData);
                loadQuestion();
                addDomainButtonListeners();
                highlightCurrentDomain();
            })
            .catch(error => console.error('Error loading quiz data:', error));
    }

    function loadQuestion() {
        const currentQuestion = quizData[currentDomain][currentQuestionIndex];
        if (!currentQuestion) {
            console.error('No question found for current domain and index.');
            return;
        }
        questionElement.innerText = currentQuestion.question;
        hintPopup.style.display = 'none';
        yesRadio.checked = false;
        noRadio.checked = false;
        highlightCurrentDomain();
        console.log('Loaded question:', currentQuestion.question); // Debug log
    }

    function showHint() {
        const currentQuestion = quizData[currentDomain][currentQuestionIndex];
        hintText.innerText = currentQuestion.hint;
        const rect = hintButton.getBoundingClientRect();
        hintPopup.style.top = `${rect.bottom + window.scrollY}px`;
        hintPopup.style.left = `${rect.left + window.scrollX}px`;
        hintPopup.style.display = 'block';
    }

    function prevQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
            console.log('Moved to previous question in the same domain.'); // Debug log
        } else {
            console.log('Reached the first question of the current domain.');
            goToPrevDomain();
        }
    }

    function nextQuestion() {
        const selectedAnswer = document.querySelector('input[name="answer"]:checked');
        if (selectedAnswer) {
            quizData[currentDomain][currentQuestionIndex].answered = selectedAnswer.value;
            console.log('Answered question:', selectedAnswer.value); // Debug log
            if (currentQuestionIndex < quizData[currentDomain].length - 1) {
                currentQuestionIndex++;
                loadQuestion();
                console.log('Moved to next question in the same domain.'); // Debug log
            } else {
                console.log('Reached the last question of the current domain.');
                goToNextDomain();
            }
        } else {
            alert('Please select an answer.');
        }
    }

    function goToNextDomain() {
        const domainIndex = domains.indexOf(currentDomain);
        if (domainIndex < domains.length - 1) {
            currentDomain = domains[domainIndex + 1];
            currentQuestionIndex = 0;
            console.log('Switched to next domain:', currentDomain); // Debug log
            loadQuestion();
        } else {
            console.log('You have completed all the domains!');
        }
    }

    function goToPrevDomain() {
        const domainIndex = domains.indexOf(currentDomain);
        if (domainIndex > 0) {
            currentDomain = domains[domainIndex - 1];
            currentQuestionIndex = quizData[currentDomain].length - 1;
            console.log('Switched to previous domain:', currentDomain); // Debug log
            loadQuestion();
        } else {
            console.log('You are already on the first domain!');
        }
    }

    function switchDomain(domain) {
        currentDomain = domain;
        currentQuestionIndex = 0;
        loadQuestion();
    }

    function addDomainButtonListeners() {
        domainButtons.forEach((button) => {
            button.addEventListener('click', () => switchDomain(button.id.replace('-btn', '')));
        });
    }

    function pauseQuiz() {
        pauseOverlay.style.display = 'flex';
    }

    function resumeQuiz() {
        pauseOverlay.style.display = 'none';
    }

    function highlightCurrentDomain() {
        domainButtons.forEach((button) => {
            if (button.id.replace('-btn', '') === currentDomain) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    prevButton.addEventListener('click', prevQuestion);
    nextButton.addEventListener('click', nextQuestion);
    hintButton.addEventListener('click', showHint);
    closeHint.addEventListener('click', () => hintPopup.style.display = 'none');
    pauseButton.addEventListener('click', pauseQuiz);
    resumeButton.addEventListener('click', resumeQuiz);

    loadQuizData();
});
