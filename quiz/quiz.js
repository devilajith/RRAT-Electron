document.addEventListener('DOMContentLoaded', () => {
    let quizData = {};
    const quizContainer = document.getElementById('quiz-container');
    const setButtonsContainer = document.getElementById('set-buttons');
    let currentDomainIndex = 0;
    let domains = [];
    let userAnswers = {};

    function loadQuizData() {
        window.electron.invoke('load-quiz-data')
            .then(data => {
                console.log('Quiz data loaded:', data);
                quizData = data.domains.reduce((acc, domain) => {
                    acc[domain.name] = domain.questions;
                    return acc;
                }, {});
                domains = Object.keys(quizData);
                console.log('Domains:', domains);
                domains.forEach(domain => {
                    userAnswers[domain] = {};
                });
                createDomainButtons();
                displayQuestionsForCurrentDomain();
                highlightCurrentDomainButton(domains[0]);
            })
            .catch(error => console.error('Error loading quiz data:', error));
    }

    function createDomainButtons() {
        setButtonsContainer.innerHTML = '';

        domains.forEach((domain, index) => {
            const button = document.createElement('button');
            button.id = `${domain.replace(/\s+/g, '-')}-btn`;
            button.innerText = domain;
            if (index === 0) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                currentDomainIndex = index;
                displayQuestionsForCurrentDomain();
                highlightCurrentDomainButton(domain);
            });
            setButtonsContainer.appendChild(button);
        });
    }

    function displayQuestionsForCurrentDomain() {
        quizContainer.innerHTML = '';
        const domain = domains[currentDomainIndex];

        console.log('Displaying questions for domain:', domain);

        quizContainer.scrollTop = 0;

        const explanationDiv = document.createElement('div');
        explanationDiv.classList.add('explanation-container');
        explanationDiv.id = `${domain.replace(/\s+/g, '-')}-explanation`;

        const explanationText = document.createElement('p');
        explanationText.classList.add('explanation-text');
        explanationText.innerText = `This is the explanation for ${domain}.`;
        explanationDiv.appendChild(explanationText);

        quizContainer.appendChild(explanationDiv);

        quizData[domain].forEach((questionData, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-container');
            questionDiv.id = `${domain.replace(/\s+/g, '-')}-question-${index}`;

            const questionRow = document.createElement('div');
            questionRow.classList.add('question-row');

            const questionText = document.createElement('h2');
            questionText.classList.add('question-text');
            questionText.innerText = questionData.question;
            questionRow.appendChild(questionText);

            questionDiv.appendChild(questionRow);

            const toggleContainer = document.createElement('div');
            toggleContainer.classList.add('toggle-container');

            const options = ['Yes', 'No', 'Partial'];
            options.forEach(option => {
                const button = document.createElement('div');
                button.classList.add('toggle-button');
                button.innerText = option;
                button.addEventListener('click', () => {
                    toggleContainer.querySelectorAll('.toggle-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    userAnswers[domain][index] = option.toLowerCase();
                });
                toggleContainer.appendChild(button);
            });

            questionDiv.appendChild(toggleContainer);

            const hintButton = document.createElement('button');
            hintButton.classList.add('collapsible');
            hintButton.innerText = 'Assessment Help';

            const hintContent = document.createElement('div');
            hintContent.classList.add('collapsible-content');
            hintContent.innerText = questionData['Assessment Help'];

            hintButton.addEventListener('click', () => {
                hintButton.classList.toggle('active');
                if (hintContent.style.display === 'block') {
                    hintContent.style.display = 'none';
                } else {
                    hintContent.style.display = 'block';
                }
            });

            questionDiv.appendChild(hintButton);
            questionDiv.appendChild(hintContent);

            quizContainer.appendChild(questionDiv);

            if (userAnswers[domain][index] !== undefined) {
                const previousAnswer = userAnswers[domain][index];
                const button = Array.from(toggleContainer.querySelectorAll('.toggle-button')).find(btn => btn.innerText.toLowerCase() === previousAnswer);
                if (button) {
                    button.classList.add('active');
                }
            }
        });

        const nextButton = document.createElement('button');
        nextButton.classList.add('submit-button');
        if (currentDomainIndex < domains.length - 1) {
            nextButton.innerText = 'Next';
            nextButton.addEventListener('click', () => {
                if (areAllQuestionsAnswered(domain)) {
                    currentDomainIndex++;
                    displayQuestionsForCurrentDomain();
                    highlightCurrentDomainButton(domains[currentDomainIndex]);
                } else {
                    alert('Please answer all questions before proceeding.');
                }
            });
        } else {
            nextButton.innerText = 'Submit';
            nextButton.addEventListener('click', () => {
                if (areAllQuestionsAnswered(domain)) {
                    const unansweredDomains = getUnansweredDomains();
                    if (unansweredDomains.length > 0) {
                        alert('Please complete all questions in the following domains: ' + unansweredDomains.join(', '));
                    } else {
                        saveQuizData();
                    }
                } else {
                    alert('Please answer all questions before submitting.');
                }
            });
        }
        quizContainer.appendChild(nextButton);
    }

    function highlightCurrentDomainButton(domain) {
        const buttons = setButtonsContainer.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.id.replace('-btn', '').replace(/-/g, ' ') === domain) {
                button.classList.add('active');
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const sidebar = document.querySelector('.sidebar');
                const buttonOffsetTop = button.offsetTop;
                const sidebarHeight = sidebar.clientHeight;
                sidebar.scrollTop = buttonOffsetTop - sidebarHeight / 2 + button.clientHeight / 2;
            } else {
                button.classList.remove('active');
            }
        });
    }

    loadQuizData();

    function saveQuizData() {
        const assessmentName = localStorage.getItem('assessmentName') || 'Unnamed Assessment';

        const quizAnswers = {};
        domains.forEach(domain => {
            quizAnswers[domain] = quizData[domain].map((questionData, index) => {
                return {
                    question: questionData.question,
                    answer: userAnswers[domain][index] || ""
                };
            });
        });

        const dataToSave = {
            assessmentName,
            answers: quizAnswers
        };

        console.log('Sending quiz data to save:', JSON.stringify(dataToSave, null, 2));
        window.electron.send('save-quiz-data', dataToSave);
    }

    window.electron.receive('save-quiz-data-reply', (response) => {
        console.log('Received reply from main process:', response.message);
        if (response.success) {
            alert('Quiz data saved successfully.');
        } else {
            alert('Failed to save quiz data.');
        }
    });

    function areAllQuestionsAnswered(domain) {
        return quizData[domain].every((_, index) => userAnswers[domain][index] !== undefined);
    }

    function getUnansweredDomains() {
        return domains.filter(domain => !areAllQuestionsAnswered(domain));
    }

    document.getElementById('logo').addEventListener('click', () => {
        window.location.href = '../dashboard.html';
    });
});
