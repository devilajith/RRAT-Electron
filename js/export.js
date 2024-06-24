// export.js

function exportAnalyticsAsHTML() {
  const scores = window.scoresData;
  const questionsDataUrl = 'quiz/Qdata.json';

  if (!scores) {
      console.error('No scores data available for export.');
      return;
  }

  fetch(questionsDataUrl)
      .then(response => response.json())
      .then(questionsData => {
          const assessmentName = scores['Assessment Name'] || 'RRAT_Assessment';
          const assessmentDate = scores['Date'] || new Date().toISOString().split('T')[0];
          const assessmentTime = scores['Time'] || new Date().toTimeString().split(' ')[0];
          const fileName = `RRAT_AR_${assessmentName}_${assessmentDate}_${assessmentTime}.html`;

          const exportHTML = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>RRAT Assessment Report</title>
              <style>
                  /* Universal box-sizing rule */
                  *, *::before, *::after {
                      box-sizing: border-box;
                  }

                  /* Page layout */
                  html, body {
                      background-color: #194264;
                      color: white;
                      margin: 0;
                      padding: 0;
                      display: flex;
                      justify-content: center;
                      width: 100vw;
                      height: 100vh;
                      overflow: hidden;
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  }

                  /* Specific class for macbook-air */
                  .macbook-air {
                      background-color: #eaf6ff;
                      color: #333;
                      margin: 0;
                      padding: 0;
                      width: 100%;
                      height: 100%;
                      display: flex;
                      flex-direction: column;
                  }

                  /* Header styling */
                  .header {
                      background-color: #194264;
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      padding: 20px 10px;
                      width: 100%;
                      height: 120px;
                      box-shadow: 0 8px 4px rgba(0, 0, 0, 0.2);
                      z-index: 1;
                  }

                  .logo {
                      display: flex;
                      align-items: center;
                  }

                  .logo .rrat {
                      height: 70px;
                      width: 180px;
                      margin-left: 20px;
                  }

                  /* Content layout */
                  .content {
                      display: flex;
                      flex-direction: column;
                      width: 100%;
                      padding: 20px;
                      box-sizing: border-box;
                      overflow-y: auto;
                  }

                  /* Containers */
                  .domains-container {
                      flex: 1;
                      overflow-y: scroll;
                      padding-right: 30px;
                      padding-left: 30px;
                      max-height: 100%;
                  }

                  .recommendations-container {
                      flex: 1;
                      padding: 20px;
                      background-color: #eaf6ff;
                      overflow-y: scroll;
                  }

                  .domain-card {
                      background: #fff;
                      border-radius: 10px;
                      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                      margin: 20px 0;
                      padding: 20px;
                      color: #333;
                  }

                  .domain-name {
                      font-size: 1.5em;
                      margin-bottom: 10px;
                      color: #194264;
                  }

                  .recommendations-list {
                      list-style-type: disc;
                      padding-left: 20px;
                  }

                  .recommendation-item {
                      margin: 10px 0;
                      font-size: 1.2em;
                      color: #194264;
                  }

                  /* Overall score circle */
                  .circle {
                      width: 200px;
                      height: 200px;
                      position: relative;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      margin: 20px auto;
                  }

                  .percentage {
                      position: absolute;
                      font-size: 36px;
                      font-weight: bold;
                      color: #d9534f;
                  }

                  .progress-circle {
                      transform: rotate(-90deg);
                  }

                  #progressCircle {
                      transition: stroke-dashoffset 1s ease;
                      stroke-linecap: round;
                  }

                  /* Progress bar styling */
                  .progress-bar-container {
                      width: 70%;
                      background-color: #ffffff;
                      border-radius: 20px;
                      margin: 20px auto;
                  }

                  .progress-bar {
                      height: 20px;
                      border-radius: 30px;
                      text-align: center;
                      line-height: 20px;
                      color: #eaf6ff;
                      transition: width 1s ease;
                  }

                  .progress-bar.high-score {
                      background-color: #16a085;
                  }

                  .progress-bar.medium-score {
                      background-color: #fef160;
                      color: black;
                  }

                  .progress-bar.low-score {
                      background-color: #f22613;
                  }

                  /* Overall score section */
                  .overall-score {
                      width: 100%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      font-size: 20px;
                      font-weight: 500;
                      margin-bottom: 40px;
                  }

                  /* Custom scrollbars */
                  .domains-container::-webkit-scrollbar {
                      width: 15px;
                  }

                  .domains-container::-webkit-scrollbar-track {
                      background: #d0e7ff;
                      border-radius: 20px;
                  }

                  .domains-container::-webkit-scrollbar-thumb {
                      background: #194264;
                      border-radius: 10px;
                      border: 2px solid #194264;
                      min-height: 2px;
                      max-height: 5px;
                  }

                  #recommendations-container::-webkit-scrollbar {
                      width: 15px;
                  }

                  #recommendations-container::-webkit-scrollbar-thumb {
                      background: #194264;
                      border-radius: 10px;
                      border: 2px solid #eaf6ff;
                  }

                  /* Question styling */
                  .question {
                      margin-bottom: 10px;
                  }

                  .question p {
                      margin: 5px;
                  }

                  .question p:first-child {
                      font-size: 18px;
                      font-weight: bold;
                  }

                  .question p:last-child {
                      font-size: 16px;
                  }
              </style>
          </head>
          <body class="macbook-air">
              <div class="header">
                  <div class="logo">
                      <img src="images/group-40.svg" alt="Logo" class="rrat" id="dashboard-logo">
                  </div>
              </div>
              <div class="content">
                  <div class="overall-score">
                      <div class="circle">
                          <svg class="progress-circle" width="200" height="200">
                              <circle cx="100" cy="100" r="90" stroke-width="20" stroke="#e0e0e0" fill="none"></circle>
                              <circle id="progressCircle" cx="100" cy="100" r="90" stroke-width="20" stroke="#76c7c0" fill="none" stroke-dasharray="565.48" stroke-dashoffset="565.48"></circle>
                          </svg>
                          <div class="percentage" id="overall-percentage">0%</div>
                      </div>
                      <div>RRAT Overall Score</div>
                  </div>
                  <div id="analytics-container" class="domains-container"></div>
                  <div id="recommendations-container" class="recommendations-container"></div>
              </div>
              <script>
                  ${generateInlineScript(scores, questionsData)}
              </script>
          </body>
          </html>
          `;

          // Create a blob from the HTML string and trigger download
          const blob = new Blob([exportHTML], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      })
      .catch(error => console.error('Error fetching questions data:', error));
}

function generateInlineScript(scores, questionsData) {
  return `
  document.addEventListener("DOMContentLoaded", () => {
      updateProgressBars(${JSON.stringify(scores)});
      displayRecommendations(${JSON.stringify(scores)}, ${JSON.stringify(questionsData)});
  });

  function updateProgressBars(scores) {
      const container = document.getElementById('analytics-container');
      container.innerHTML = ''; // Clear existing content

      let totalScoreSum = 0;
      let totalScoreCount = 0;

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
              progressBar.style.width = \`\${percentageScore}%\`;
              progressBar.textContent = \`\${percentageScore.toFixed(0)}%\`;
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
      overallPercentage.textContent = \`\${overallScore.toFixed(1)}%\`;

      const progressCircle = document.getElementById('progressCircle');
      const radius = progressCircle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (overallScore / 100) * circumference;

      progressCircle.style.strokeDashoffset = offset;
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
                      recommendationText.innerText = \`\${question.Recommendation}\`;

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
              console.error(\`No scores found for domain \${domainName}\`);
          }
      });
  }
  `;
}
