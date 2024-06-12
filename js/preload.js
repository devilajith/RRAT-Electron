const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ['register', 'get-profile', 'update-profile', 'save-quiz-data'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['registration-success', 'profile-data', 'profile-update', 'save-quiz-data-reply'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  loadQuizData: () => ipcRenderer.invoke('load-quiz-data')
});
