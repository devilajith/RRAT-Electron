const { app, BrowserWindow, ipcMain } = require('electron');
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
      console.log("Registration successfully added to the database");
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
          console.log('Profile updated successfully');
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

ipcMain.on('save-quiz-data', (event, quizAnswers) => {
  const { assessmentName, answers } = quizAnswers;
  const timestamp = new Date().toISOString().replace(/:/g, '-'); // Replace colon to avoid issues in filenames
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
    event.reply('save-quiz-data-reply', { success: true, message: 'Quiz data saved successfully.' });
  } catch (error) {
    console.error('Error saving quiz data:', error);
    event.reply('save-quiz-data-reply', { success: false, message: 'Failed to save quiz data.' });
  }
});

ipcMain.handle('check-user-existence', async (event, userId) => {
  console.log('Checking user existence for userId:', userId);
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM registrations WHERE rowid = ?", [userId], (err, row) => {
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
