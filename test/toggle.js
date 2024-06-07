function toggleValue() {
    var toggleButton = document.getElementById('toggleButton');
    var toggleValue = document.getElementById('toggleValue');
    
    if (toggleButton.classList.contains('checked')) {
        toggleButton.classList.remove('checked');
        toggleValue.value = '0';
    } else {
        toggleButton.classList.add('checked');
        toggleValue.value = '1';
    }
}

document.getElementById('submitButton').addEventListener('click', function() {
    var toggleValue = document.getElementById('toggleValue').value;
    console.log('Toggle value:', toggleValue);
});
