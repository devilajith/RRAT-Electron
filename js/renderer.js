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

  const exportButton = document.getElementById('export-button1');
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
        const response = await window.electron.invoke('export-assessment', fileName);
        if (response.success) {
          notyf.success('Assessment exported successfully.');
        } else {
          notyf.error(response.message);
        }
      } catch (error) {
        notyf.error('Failed to export assessment.');
      }
    });
  }

  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const emailInput = document.getElementById('email');
  const nameInput = document.getElementById('name');
  const organizationInput = document.getElementById('organization');
  const designationInput = document.getElementById('designation');
  const sectorInput = document.getElementById('sector');
  const passwordPopup = document.getElementById('passwordPopup');
  const lengthRequirement = document.getElementById('length');
  const uppercaseRequirement = document.getElementById('uppercase');
  const lowercaseRequirement = document.getElementById('lowercase');
  const numberRequirement = document.getElementById('number');
  const registrationForm = document.getElementById('registrationForm');
  const requirements = [
    { element: lengthRequirement, regex: /.{8,}/ },
    { element: uppercaseRequirement, regex: /[A-Z]/ },
    { element: lowercaseRequirement, regex: /[a-z]/ },
    { element: numberRequirement, regex: /[0-9]/ }
  ];

  passwordInput.addEventListener('focus', () => {
    passwordPopup.style.display = 'block';
  });

  passwordInput.addEventListener('blur', () => {
    passwordPopup.style.display = 'none';
  });

  passwordInput.addEventListener('input', validatePasswordRequirements);
  confirmPasswordInput.addEventListener('input', validateConfirmPassword);

  registrationForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission to validate first
    if (validateForm()) {
      submitForm();
    }
  });

  function validatePasswordRequirements() {
    const passwordValue = passwordInput.value;
    let allValid = true;

    requirements.forEach(requirement => {
      if (requirement.regex.test(passwordValue)) {
        requirement.element.classList.remove('invalid');
        requirement.element.classList.add('valid');
      } else {
        requirement.element.classList.remove('valid');
        requirement.element.classList.add('invalid');
        allValid = false;
      }
    });

    return allValid;
  }

  function validateConfirmPassword() {
    const passwordValue = passwordInput.value;
    const confirmPasswordValue = confirmPasswordInput.value;

    if (passwordValue === confirmPasswordValue) {
      confirmPasswordInput.setCustomValidity('');
      return true;
    } else {
      confirmPasswordInput.setCustomValidity('Passwords do not match');
      return false;
    }
  }

  function validateForm() {
    const isPasswordValid = validatePasswordRequirements();
    const isConfirmPasswordValid = validateConfirmPassword();
    const isEmailFilled = emailInput.value.trim() !== '';
    const isNameFilled = nameInput.value.trim() !== '';
    const isOrganizationFilled = organizationInput.value.trim() !== '';
    const isDesignationFilled = designationInput.value.trim() !== '';
    const isSectorFilled = sectorInput.value.trim() !== '';

    return isPasswordValid && isConfirmPasswordValid && isEmailFilled && isNameFilled && isOrganizationFilled && isDesignationFilled && isSectorFilled;
  }

  function submitForm() {
    const formData = new FormData(registrationForm);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Ensure the question and answer are correctly assigned
    data.question = document.getElementById('question').value;
    data.answer = document.getElementById('answer').value;

    window.electron.send('register', data);
    
    window.electron.receive('registration-success', (response) => {
      if (response.success) {
        sessionStorage.setItem('userId', response.userId); // Store the user ID
        window.location.href = 'dashboard.html';
      } else {
        console.error('Registration failed');
      }
    });
  }

  const email = sessionStorage.getItem('userEmail');
  if (email) {
    window.electron.send('get-profile', email);

    window.electron.receive('profile-data', (response) => {
      if (response.success && response.data) {
        emailInput.value = response.data.email;
        nameInput.value = response.data.name;
        organizationInput.value = response.data.organization;
        designationInput.value = response.data.designation;
        sectorInput.value = response.data.sector;
      } else {
        console.error('Failed to load profile data');
      }
    });
  }
});
