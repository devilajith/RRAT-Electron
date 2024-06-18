const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'js/preload.js'), // Reference to preload.js
      contextIsolation: true, // Context isolation for security
      enableRemoteModule: false, // Disable remote module
    }
  });

  mainWindow.loadFile('index.html'); // Load the new index.html

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function createDatabase() {
  const dbPath = path.join(__dirname, 'registrations.db');
  console.log('Database path:', dbPath); // Log the database path
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database opening error: ', err);
    } else {
      db.run(`CREATE TABLE IF NOT EXISTS registrations (
        email TEXT PRIMARY KEY,
        name TEXT,
        password TEXT,
        organization TEXT,
        designation TEXT,
        sector TEXT
      )`);
    }
  });
}

app.on('ready', () => {
  createWindow();
  createDatabase();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

ipcMain.on('register', (event, data) => {
  const stmt = db.prepare("INSERT INTO registrations (email, name, password, organization, designation, sector) VALUES (?, ?, ?, ?, ?, ?)");
  stmt.run([data.email, data.name, data.password, data.organization, data.designation, data.sector], function(err) {
    if (err) {
      console.error(err.message);
      event.reply('registration-success', { success: false });
    } else {
      event.reply('registration-success', { success: true, userId: this.lastID });
    }
  });
  stmt.finalize();
});

ipcMain.on('get-profile', (event, userId) => {
  db.get("SELECT * FROM registrations WHERE rowid = ?", [userId], (err, row) => {
    if (err) {
      console.error(err.message);
      event.reply('profile-data', { success: false });
    } else {
      event.reply('profile-data', { success: true, data: row });
    }
  });
});

ipcMain.on('update-profile', (event, updatedProfileData) => {
  const { email, name, sector, organization, designation } = updatedProfileData;

  db.run(`UPDATE registrations 
          SET name = ?, sector = ?, organization = ?, designation = ? 
          WHERE email = ?`, [name, sector, organization, designation, email], (err) => {
      if (err) {
          console.error('Error updating profile:', err.message);
          event.reply('profile-update', { success: false });
      } else {
          event.reply('profile-update', { success: true });
      }
  });
});


ipcMain.handle('load-quiz-data', async () => {
  const dataPath = path.join(__dirname, 'quiz/Qdata.json');
  try {
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading quiz data:', error);
    throw error;
  }
});

function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds (5 hours 30 minutes)
  const istTime = new Date(now.getTime() + istOffset);

  const year = istTime.getUTCFullYear();
  const month = ('0' + (istTime.getUTCMonth() + 1)).slice(-2); // Months are zero-based
  const day = ('0' + istTime.getUTCDate()).slice(-2);
  const hours = ('0' + istTime.getUTCHours()).slice(-2);
  const minutes = ('0' + istTime.getUTCMinutes()).slice(-2);
  const seconds = ('0' + istTime.getUTCSeconds()).slice(-2);

  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
}

ipcMain.on('save-quiz-data', (event, quizAnswers) => {
  const { assessmentName, answers } = quizAnswers;
  const timestamp = getISTTimestamp(); // Use the IST timestamp function
  const fileName = `${assessmentName}-${timestamp}.json`;
  const savePath = path.join(__dirname, 'My Assessments');

  // Ensure the 'My Assessments' folder exists
  try {
    if (!fs.existsSync(savePath)) {
      console.log('Creating directory:', savePath);
      fs.mkdirSync(savePath);
    } else {
      console.log('Directory already exists:', savePath);
    }

    const fullPath = path.join(savePath, fileName);
    console.log('Saving file to:', fullPath);

    fs.writeFileSync(fullPath, JSON.stringify(answers, null, 2));
    console.log('Quiz data saved successfully to:', fullPath);
    event.reply('save-quiz-data-reply', { success: true, message: 'Quiz data saved successfully.', fileName: fileName });
  } catch (error) {
    console.error('Error saving quiz data:', error);
    event.reply('save-quiz-data-reply', { success: false, message: 'Failed to save quiz data.' });
  }
});

ipcMain.handle('check-user-existence', async () => {
  console.log('Checking user existence');
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM registrations WHERE rowid = 1", (err, row) => {
      if (err) {
        console.error('Error checking user existence:', err);
        reject(err);
      } else {
        console.log('User existence result:', row.count > 0);
        resolve(row.count > 0);
      }
    });
  });
});

ipcMain.handle('load-assessments', async () => {
  const assessmentsPath = path.join(__dirname, 'My Assessments');
  try {
    const files = fs.readdirSync(assessmentsPath);
    const assessments = files.map(file => {
      const fileName = file.replace('.json', '');
      const [name, dateTime] = fileName.split(/-(.+)/); // Split only at the first hyphen
      const [date, time] = dateTime.split('T');
      const formattedDate = `${date.split('-').reverse().join('/')}`;
      const formattedTime = `${time.split('.')[0]}`;

      return {
        name,
        date: formattedDate,
        time: formattedTime,
        file: file // Include file name for reference in delete/export actions
      };
    });
    return assessments;
  } catch (error) {
    console.error('Error reading assessments:', error);
    throw error;
  }
});

ipcMain.handle('delete-assessment', async (event, fileName) => {
  const assessmentsPath = path.join(__dirname, 'My Assessments', fileName);
  try {
    fs.unlinkSync(assessmentsPath);
    return { success: true, message: 'Assessment deleted successfully.' };
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return { success: false, message: 'Failed to delete assessment.' };
  }
});

ipcMain.handle('export-assessment', async (event, fileName) => {
  const assessmentsPath = path.join(__dirname, 'My Assessments', fileName);
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('downloads'), fileName),
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled) {
      return { success: false, message: 'Export canceled by user.' };
    }

    const exportPath = result.filePath;
    fs.copyFileSync(assessmentsPath, exportPath);
    return { success: true, message: 'Assessment exported successfully.' };
  } catch (error) {
    console.error('Error exporting assessment:', error);
    return { success: false, message: 'Failed to export assessment.' };
  }
});

// Register the 'read-json-file' handler only if it hasn't been registered yet
if (!ipcMain.eventNames().includes('read-json-file')) {
  ipcMain.handle('read-json-file', async (event, fileName) => {
    const filePath = path.join(__dirname, 'My Assessments', fileName);
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      throw error;
    }
  });
}
