document.addEventListener('DOMContentLoaded', () => {
    let quizData = {};
    const quizContainer = document.getElementById('quiz-container');
    const setButtonsContainer = document.getElementById('set-buttons');
    let currentDomainIndex = 0;
    let domains = [];
    let userAnswers = {};

    function loadQuizData() {
        window.electron.loadQuizData()
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

            questionDiv.appendChild(answerButtonsDiv);

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

            questionDiv.appendChild(hintButton);
            questionDiv.appendChild(hintContent);

            quizContainer.appendChild(questionDiv);

            if (userAnswers[domain][index] !== undefined) {
                const radioButton = document.querySelector(`input[name="answer-${domain}-${index}"][value="${userAnswers[domain][index]}"]`);
                if (radioButton) {
                    radioButton.checked = true;
                }
            }

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

    // Add event listener to the logo to navigate to dashboard.html
    document.getElementById('logo').addEventListener('click', () => {
        window.location.href = '../dashboard.html';
    });
});
