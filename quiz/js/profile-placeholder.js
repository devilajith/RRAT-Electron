document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('name');
    const organizationInput = document.getElementById('organization');
    const designationInput = document.getElementById('designation');
    const sectorInput = document.getElementById('sector');
  
    // Assuming the email is known and stored somewhere (e.g., session storage)
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
  