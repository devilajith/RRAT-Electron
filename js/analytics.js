function updateProgressBars(scores) {
  const container = document.getElementById('analytics-container');
  container.innerHTML = ''; // Clear existing content

  let totalScoreSum = 0;
  let totalScoreCount = 0;

  // Skip non-domain keys
  const domainKeys = Object.keys(scores).filter(key => !['Assessment Name', 'Date', 'Time'].includes(key));

  domainKeys.forEach(domain => {
    const values = scores[domain];
    const score = values.reduce((acc, curr) => {
      if (curr.answer.toLowerCase() === 'yes') {
        return acc + 1;
      } else if (curr.answer.toLowerCase() === 'partial') {
        return acc + 0.5;
      } else {
        return acc;
      }
    }, 0);

    const percentageScore = (score / values.length) * 100;
    totalScoreSum += percentageScore;
    totalScoreCount++;

    const domainElement = document.createElement('div');
    domainElement.className = 'domain';

    const domainName = document.createElement('span');
    domainName.className = 'domain-name';
    domainName.textContent = domain.charAt(0).toUpperCase() + domain.slice(1);

    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0'; // Initialize with 0 width to apply transition

    progressBarContainer.appendChild(progressBar);
    domainElement.appendChild(domainName);
    domainElement.appendChild(progressBarContainer);
    container.appendChild(domainElement);

    // Trigger reflow to ensure the transition is applied
    progressBar.offsetWidth;

    // Set the actual width and color after a short delay to animate the progress
    setTimeout(() => {
      progressBar.style.width = `${percentageScore}%`;
      progressBar.textContent = `${percentageScore.toFixed(0)}%`;
      if (percentageScore >= 75) {
        progressBar.classList.add('high-score');
      } else if (percentageScore >= 50) {
        progressBar.classList.add('medium-score');
      } else if (percentageScore > 0) {
        progressBar.classList.add('low-score');
      } else {
        progressBar.style.backgroundColor = '#e0e0e0'; // Color for 0% score
      }
    }, 100);
  });

  const overallScore = totalScoreSum / totalScoreCount;
  const overallPercentage = document.getElementById('overall-percentage');
  overallPercentage.textContent = `${overallScore.toFixed(1)}%`;

  const progressCircle = document.getElementById('progressCircle');
  const radius = progressCircle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overallScore / 100) * circumference;

  progressCircle.style.strokeDashoffset = offset;
}

function showRecommendations() {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = ''; // Clear existing content

  fetch('quiz/Qdata.json')
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

  const domainKeys = Object.keys(scoresData).filter(key => !['Assessment Name', 'Date', 'Time'].includes(key));

  domainKeys.forEach(domain => {
    const domainName = domain;
    const domainScores = scoresData[domainName];
    let hasRecommendations = false;
    const domainElement = document.createElement('div');
    domainElement.className = 'domain-card';

    const domainNameElement = document.createElement('h2');
    domainNameElement.textContent = domainName;

    if (domainScores) {
      const recommendationsList = document.createElement('ul');
      recommendationsList.className = 'recommendations-list';

      domainScores.forEach((score, index) => {
        const answer = score.answer.toLowerCase();
        if (answer === 'no' || answer === 'partial') {
          hasRecommendations = true;
          const question = questionsData.domains.find(d => d.name === domainName).questions[index];

          const recommendationItem = document.createElement('li');
          recommendationItem.className = 'recommendation-item';

          const recommendationText = document.createElement('span');
          recommendationText.innerText = `${question.Recommendation}`;

          recommendationItem.appendChild(recommendationText);
          recommendationsList.appendChild(recommendationItem);
        }
      });

      if (hasRecommendations) {
        domainElement.appendChild(domainNameElement);
        domainElement.appendChild(recommendationsList);
        container.appendChild(domainElement);
      }
    } else {
      console.error(`No scores found for domain ${domainName}`);
    }
  });
}

function showAnalytics() {
  document.getElementById('analytics-container').style.display = 'block';
  document.getElementById('recommendations-container').style.display = 'none';
  document.getElementById('tab-analytics').classList.add('active');
  document.getElementById('tab-recommendations').classList.remove('active');
  document.getElementById('overall-score-section').style.display = 'flex';
}

function showRecommendationsTab() {
  document.getElementById('analytics-container').style.display = 'none';
  document.getElementById('recommendations-container').style.display = 'block';
  document.getElementById('tab-analytics').classList.remove('active');
  document.getElementById('tab-recommendations').classList.add('active');
  document.getElementById('overall-score-section').style.display = 'none';
  showRecommendations();
}

// Added cursor: pointer; style to buttons
document.getElementById('tab-analytics').style.cursor = 'pointer';
document.getElementById('tab-recommendations').style.cursor = 'pointer';
document.getElementById('export-button1').style.cursor = 'pointer';
