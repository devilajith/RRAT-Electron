const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
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

  mainWindow.loadFile('dashboard.html');

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
  stmt.run([data.email, data.name, data.password, data.organization, data.designation, data.sector], (err) => {
    if (err) {
      console.error(err.message);
      event.reply('registration-success', { success: false });
    } else {
      console.log("Registration successfully added to the database");
      event.reply('registration-success', { success: true });
    }
  });
  stmt.finalize();
});

ipcMain.on('get-profile', (event, email) => {
  db.get("SELECT * FROM registrations WHERE email = ?", [email], (err, row) => {
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
