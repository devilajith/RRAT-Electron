document.addEventListener('DOMContentLoaded', () => {
    let quizData = {};
    const quizContainer = document.getElementById('quiz-container');
    const domainButtons = document.querySelectorAll('.sidebar button');

    function loadQuizData() {
        fetch('quizData.json')
            .then(response => response.json())
            .then(data => {
                quizData = data;
                displayAllQuestions();
                addDomainButtonListeners();
                observeQuestions();
            })
            .catch(error => console.error('Error loading quiz data:', error));
    }

    function displayAllQuestions() {
        quizContainer.innerHTML = ''; // Clear previous content
        Object.keys(quizData).forEach(domain => {
            // Create a div for the explanation
            const explanationDiv = document.createElement('div');
            explanationDiv.classList.add('explanation-container');
            explanationDiv.id = `${domain}-explanation`;

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
                questionDiv.id = `${domain}-question-${index}`;

                const questionRow = document.createElement('div');
                questionRow.classList.add('question-row');

                const questionText = document.createElement('h2');
                questionText.classList.add('question-text');
                questionText.innerText = questionData.Question; // Update to match the JSON structure
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

                // Append the answer buttons div after the question text
                questionDiv.appendChild(answerButtonsDiv);

                // Add hint button and collapsible content
                const hintButton = document.createElement('button');
                hintButton.classList.add('collapsible');
                hintButton.innerText = 'Show Hint';

                const hintContent = document.createElement('div');
                hintContent.classList.add('collapsible-content');
                hintContent.innerText = questionData['Assessment Help']; // Update to match the JSON structure

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

                questionDiv.addEventListener('click', () => {
                    highlightCurrentDomainButton(domain);
                });

                quizContainer.appendChild(questionDiv);
            });
        });
    }

    function addDomainButtonListeners() {
        domainButtons.forEach(button => {
            button.addEventListener('click', () => {
                const domain = button.id.replace('-btn', '').replace(/-/g, ' ');
                scrollToDomain(domain);
                highlightCurrentDomainButton(domain);
            });
        });
    }

    function scrollToDomain(domain) {
        const firstQuestionElement = document.getElementById(`${domain}-question-0`);
        if (firstQuestionElement) {
            firstQuestionElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function highlightCurrentDomainButton(domain) {
        domainButtons.forEach(button => {
            if (button.id.replace('-btn', '').replace(/-/g, ' ') === domain) {
                button.classList.add('active');
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                button.classList.remove('active');
            }
        });
    }

    function observeQuestions() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        const callback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const domain = entry.target.id.split('-')[0];
                    highlightCurrentDomainButton(domain);
                }
            });
        };

        const observer = new IntersectionObserver(callback, options);

        document.querySelectorAll('.question-container').forEach(question => {
            observer.observe(question);
        });
    }

    loadQuizData();
});
