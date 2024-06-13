const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    checkUserExistence: (userId) => ipcRenderer.invoke('check-user-existence', userId),
    send: (channel, data) => {
        let validChannels = ['get-profile', 'register', 'save-quiz-data'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ['profile-data', 'registration-success', 'save-quiz-data-reply'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    invoke: (channel, data) => {
        let validChannels = ['load-assessments', 'load-quiz-data', 'check-user-existence', 'delete-assessment', 'export-assessment'];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    }
});
