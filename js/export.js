function captureScreenshot() {
    return html2canvas(document.body).then(canvas => {
      return canvas.toDataURL('image/png');
    });
  }
  
  function captureMultipleScreenshots() {
    const screenshots = [];
    return new Promise((resolve, reject) => {
      const totalHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentScroll = 0;
  
      function scrollAndCapture() {
        if (currentScroll < totalHeight) {
          window.scrollTo(0, currentScroll);
          captureScreenshot().then(screenshot => {
            screenshots.push(screenshot);
            currentScroll += viewportHeight;
            setTimeout(scrollAndCapture, 200); // Delay to allow for the next screenshot
          }).catch(reject);
        } else {
          window.scrollTo(0, 0); // Scroll back to top after capturing
          resolve(screenshots);
        }
      }
  
      scrollAndCapture();
    });
  }
  
  function exportScreenshotsToPDF(screenshots) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295; // A4 page height in mm
    let imgHeight = 0;
  
    screenshots.forEach((screenshot, index) => {
      const img = new Image();
      img.src = screenshot;
      img.onload = () => {
        const imgHeightInPx = img.height;
        const imgWidthInPx = img.width;
        imgHeight = (imgHeightInPx * imgWidth) / imgWidthInPx;
  
        if (index > 0) {
          doc.addPage();
        }
        doc.addImage(screenshot, 'PNG', 0, 0, imgWidth, imgHeight);
        if (index === screenshots.length - 1) {
          doc.save('RRAT_Assessment_Report.pdf');
        }
      };
    });
  }
  
  function captureAndExportPDF() {
    captureMultipleScreenshots().then(screenshots => {
      exportScreenshotsToPDF(screenshots);
    }).catch(error => {
      console.error('Error capturing screenshots:', error);
    });
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', captureAndExportPDF);
    }
  });
  