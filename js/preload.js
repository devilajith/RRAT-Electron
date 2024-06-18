const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    checkUserExistence: (userId) => ipcRenderer.invoke('check-user-existence', userId),
    send: (channel, data) => {
        let validChannels = ['get-profile', 'register', 'save-quiz-data', 'update-profile'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ['profile-data', 'registration-success', 'save-quiz-data-reply', 'profile-update'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    invoke: (channel, data) => {
        let validChannels = ['load-assessments', 'load-quiz-data', 'check-user-existence', 'delete-assessment', 'export-assessment', 'read-json-file'];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    }
});
