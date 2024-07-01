const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    checkUserExistence: (userId) => ipcRenderer.invoke('check-user-existence', userId),
    send: (channel, data) => {
        let validChannels = ['get-profile', 'register', 'save-quiz-data', 'update-profile', 'validate-answer-and-reset-password', 'save-quiz-state', 'close-app'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ['profile-data', 'registration-success', 'save-quiz-data-reply', 'profile-update', 'reset-password-response'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    invoke: (channel, data) => {
        let validChannels = ['load-assessments', 'load-quiz-data', 'check-user-existence', 'delete-assessment', 'export-assessment', 'read-json-file', 'load-quiz-state', 'clear-quiz-state'];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    }
});
