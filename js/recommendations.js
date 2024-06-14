function showRecommendations() {
  fetch('ques.json')
    .then(response => response.json())
    .then(questionsData => {
      displayRecommendations(window.scoresData, questionsData);
    })
    .catch(error => console.error('Error fetching questions:', error));
}

function displayRecommendations(scoresData, questionsData) {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = ''; // Clear existing content

  if (!scoresData) {
      console.error('Scores data is not defined');
      return;
  }

  if (!questionsData) {
      console.error('Questions data is not defined');
      return;
  }

  questionsData.domains.forEach(domain => {
      const domainName = domain.name;
      const domainScores = scoresData[domainName];

      if (domainScores) {
          const filteredQuestions = domain.questions.filter((q, index) => {
              const answer = domainScores[index]?.answer.toLowerCase();
              return answer === 'no' || answer === 'partial';
          });

          if (filteredQuestions.length > 0) {
              const domainElement = document.createElement('div');
              domainElement.className = 'domain';

              const domainNameElement = document.createElement('h2');
              domainNameElement.textContent = domainName;
              domainElement.appendChild(domainNameElement);

              filteredQuestions.forEach((question, index) => {
                  const questionElement = document.createElement('div');
                  questionElement.className = 'question';

                  const questionText = document.createElement('p');
                  questionText.innerHTML = `<strong>${index + 1}. ${question.question}</strong>`;
                  questionElement.appendChild(questionText);

                  const recommendationText = document.createElement('p');
                  recommendationText.textContent = `Recommendation: ${question.Recommendation}`;
                  questionElement.appendChild(recommendationText);

                  domainElement.appendChild(questionElement);
              });

              container.appendChild(domainElement);
          }
      } else {
          console.error(`No scores found for domain ${domainName}`);
      }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const fileName = urlParams.get('file');
  console.log('Fetching file:', fileName); // Log the file name
  if (fileName) {
      window.electron.invoke('read-json-file', fileName)
          .then(data => {
              console.log('Data fetched successfully:', data); // Log the fetched data
              window.scoresData = data;  // Store data globally
              showRecommendations();
          })
          .catch(error => console.error('Error fetching data:', error));
  } else {
      console.error('No file specified in the URL.');
  }
});
