const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        webPreferences: {
            preload: path.join(__dirname, 'quiz.js'),
            contextIsolation: false,
            enableRemoteModule: true,
            nodeIntegration: true
        },
        resizable:false
    });

    mainWindow.loadFile('quiz.html');
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Specify the folder path where you want to save the JSON file
const specifiedFolderPath = path.join(__dirname, 'answers');

ipcMain.on('save-quiz-data', (event, quizData) => {
    // Ensure the folder exists
    if (!fs.existsSync(specifiedFolderPath)) {
        fs.mkdirSync(specifiedFolderPath, { recursive: true });
    }

    // Get the current date and time
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `quiz_answers_${timestamp}.json`;

    const filePath = path.join(specifiedFolderPath, fileName);
    fs.writeFile(filePath, JSON.stringify(quizData, null, 2), (err) => {
        if (err) {
            console.error('Error saving file:', err);
            event.reply('save-quiz-data-reply', 'Failed to save file.');
        } else {
            event.reply('save-quiz-data-reply', `File saved successfully at ${filePath}`);
        }
    });
});
