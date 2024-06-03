document.addEventListener('DOMContentLoaded', () => {
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

      window.electron.send('register', data);
      
      window.electron.receive('registration-success', (response) => {
          if (response.success) {
              sessionStorage.setItem('userEmail', data.email); // Store email in session storage
              window.location.href = 'dashboard.html';
          } else {
              console.error('Registration failed');
          }
      });
  }
});
