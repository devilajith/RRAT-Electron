const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    let quizData = {};
    const quizContainer = document.getElementById('quiz-container');
    const setButtonsContainer = document.getElementById('set-buttons');
    let currentDomainIndex = 0;
    let domains = [];
    let userAnswers = {}; // Object to store user answers for all domains

    function loadQuizData() {
        fetch('Qdata.json')
            .then(response => response.json())
            .then(data => {
                quizData = data.domains.reduce((acc, domain) => {
                    acc[domain.name] = domain.questions;
                    return acc;
                }, {});
                domains = Object.keys(quizData);
                domains.forEach(domain => {
                    userAnswers[domain] = {}; // Initialize user answers for each domain
                });
                createDomainButtons(); // Create the domain buttons dynamically
                displayQuestionsForCurrentDomain();
                highlightCurrentDomainButton(domains[0]); // Highlight the first button by default
            })
            .catch(error => console.error('Error loading quiz data:', error));
    }

    function createDomainButtons() {
        // Clear the container before adding new buttons
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
        quizContainer.innerHTML = ''; // Clear previous content
        const domain = domains[currentDomainIndex];

        // Scroll to the top of the quiz container
        quizContainer.scrollTop = 0;

        // Create a div for the explanation
        const explanationDiv = document.createElement('div');
        explanationDiv.classList.add('explanation-container');
        explanationDiv.id = `${domain.replace(/\s+/g, '-')}-explanation`;

        // Add some placeholder explanation text (you can customize this)
        const explanationText = document.createElement('p');
        explanationText.classList.add('explanation-text');
        explanationText.innerText = `This is the explanation for ${domain}.`; // Customize as needed
        explanationDiv.appendChild(explanationText);

        // Append the explanation div to the quiz container
        quizContainer.appendChild(explanationDiv);

        // Append the questions
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

            // Create the toggle bar
            const toggleContainer = document.createElement('div');
            toggleContainer.classList.add('toggle-container');

            const options = ['Yes', 'No', 'Partial'];
            options.forEach(option => {
                const button = document.createElement('div');
                button.classList.add('toggle-button');
                button.innerText = option;
                button.addEventListener('click', () => {
                    // Remove active class from all buttons
                    toggleContainer.querySelectorAll('.toggle-button').forEach(btn => btn.classList.remove('active'));
                    // Add active class to the clicked button
                    button.classList.add('active');
                    // Save the user's answer
                    userAnswers[domain][index] = option.toLowerCase();
                });
                toggleContainer.appendChild(button);
            });

            // Append the toggle bar after the question text
            questionDiv.appendChild(toggleContainer);

            // Add hint button and collapsible content
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

            // Append the hint button and content after the answer buttons
            questionDiv.appendChild(hintButton);
            questionDiv.appendChild(hintContent);

            quizContainer.appendChild(questionDiv);

            // Restore user's previous answer if it exists
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
        const quizAnswers = {};
        domains.forEach(domain => {
            quizAnswers[domain] = quizData[domain].map((questionData, index) => {
                return {
                    question: questionData.question,
                    answer: userAnswers[domain][index] || ""
                };
            });
        });

        ipcRenderer.send('save-quiz-data', quizAnswers);
    }

    ipcRenderer.on('save-quiz-data-reply', (event, message) => {
        alert(message);
    });

    function areAllQuestionsAnswered(domain) {
        return quizData[domain].every((_, index) => userAnswers[domain][index] !== undefined);
    }

    function getUnansweredDomains() {
        return domains.filter(domain => !areAllQuestionsAnswered(domain));
    }
});
