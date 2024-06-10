const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    let quizData = {};
    const quizContainer = document.getElementById('quiz-container');
    const domainButtons = document.querySelectorAll('.sidebar button');
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
                displayQuestionsForCurrentDomain();
                addDomainButtonListeners();
                highlightCurrentDomainButton(domains[0]); // Highlight the first button by default
            })
            .catch(error => console.error('Error loading quiz data:', error));
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

            const answerButtonsDiv = document.createElement('div');
            answerButtonsDiv.classList.add('answer-buttons');

            const yesLabel = document.createElement('label');
            yesLabel.innerHTML = `<input type="radio" name="answer-${domain}-${index}" value="yes"> Yes`;
            answerButtonsDiv.appendChild(yesLabel);

            const noLabel = document.createElement('label');
            noLabel.innerHTML = `<input type="radio" name="answer-${domain}-${index}" value="no"> No`;
            answerButtonsDiv.appendChild(noLabel);

            const partialLabel = document.createElement('label');
            partialLabel.innerHTML = `<input type="radio" name="answer-${domain}-${index}" value="partial"> Partial`;
            answerButtonsDiv.appendChild(partialLabel);

            // Append the answer buttons div after the question text
            questionDiv.appendChild(answerButtonsDiv);

            // Add hint button and collapsible content
            const hintButton = document.createElement('button');
            hintButton.classList.add('collapsible');
            hintButton.innerText = 'Show Hint';

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
                const radioButton = document.querySelector(`input[name="answer-${domain}-${index}"][value="${userAnswers[domain][index]}"]`);
                if (radioButton) {
                    radioButton.checked = true;
                }
            }

            // Add event listener to save user's answer
            const radioButtons = document.getElementsByName(`answer-${domain}-${index}`);
            radioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    userAnswers[domain][index] = radio.value;
                });
            });
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

    function addDomainButtonListeners() {
        domainButtons.forEach(button => {
            button.addEventListener('click', () => {
                const domain = button.id.replace('-btn', '').replace(/-/g, ' ');
                const domainIndex = domains.indexOf(domain);
                if (domainIndex !== -1) {
                    currentDomainIndex = domainIndex;
                    displayQuestionsForCurrentDomain();
                    highlightCurrentDomainButton(domain);
                }
            });
        });
    }

    function areAllQuestionsAnswered(domain) {
        const questions = quizData[domain];
        return questions.every((_, index) => {
            return userAnswers[domain][index] !== undefined;
        });
    }

    function getUnansweredDomains() {
        return domains.filter(domain => {
            return !areAllQuestionsAnswered(domain);
        });
    }

    function highlightCurrentDomainButton(domain) {
        domainButtons.forEach(button => {
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
        domains.forEach(domain => {  // domains is now within the scope
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

    // Add event listeners to adjust container height when switching domains
    document.querySelectorAll('.sidebar button').forEach(button => {
        button.addEventListener('click', () => {
            // Hide all content sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.style.display = 'none';
            });

            // Show the clicked content section
            const contentId = button.getAttribute('data-content-id');
            document.getElementById(contentId).style.display = 'block';

            // Adjust the height of the container
            const quizContainer = document.getElementById('quiz-container');
            quizContainer.style.height = 'auto'; // Reset height to auto
            const newHeight = quizContainer.scrollHeight; // Get the new height
            quizContainer.style.height = `${newHeight}px`; // Set the new height
        });
    });
});
