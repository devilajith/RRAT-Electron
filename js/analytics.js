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

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const fileName = urlParams.get('file');
  if (fileName) {
    window.electron.invoke('read-json-file', fileName)
      .then(data => {
        window.scoresData = data;
        updateProgressBars(data);
      })
      .catch(error => console.error('Error fetching data:', error));
  } else {
    console.error('No file specified in the URL.');
  }

  document.getElementById('dashboard-logo').addEventListener('click', () => {
    window.location.href = './dashboard.html';
  });

  document.getElementById('tab-analytics').addEventListener('click', () => {
    showAnalytics();
  });
  document.getElementById('tab-recommendations').addEventListener('click', () => {
    showRecommendationsTab();
  });

  document.getElementById('export-button').addEventListener('click', captureAndExportPDF);
});

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

function captureAndExportPDF() {
  const exportButton = document.getElementById('export-button');
  exportButton.style.display = 'none'; // Hide the export button during the capture
  const recommendationsContainer = document.getElementById('recommendations-container');
  const analyticsContainer = document.getElementById('analytics-container');

  html2canvas(analyticsContainer, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    html2canvas(recommendationsContainer, { scale: 2 }).then(canvas2 => {
      const imgData2 = canvas2.toDataURL('image/png');
      const imgProps2 = pdf.getImageProperties(imgData2);
      const pdfWidth2 = pdf.internal.pageSize.getWidth();
      const pdfHeight2 = (imgProps2.height * pdfWidth2) / imgProps2.width;
      pdf.addPage();
      pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth2, pdfHeight2);
      pdf.save('assessment_report.pdf');
      exportButton.style.display = 'block'; // Show the export button after the capture
    });
  });
}
