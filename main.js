const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // Use bcrypt for password hashing
const crypto = require('crypto');
const ExcelJS = require('exceljs');


let mainWindow;
let db;
let secretKey;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'js/preload.js'), // Ensure correct path
      contextIsolation: true,
      enableRemoteModule: false,
    },
    resizable: false,
    fullscreenable: false
  });

  mainWindow.loadFile('index.html');

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
        sector TEXT,
        securityquestion TEXT,
        Answer TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS secret_keys (
        id INTEGER PRIMARY KEY,
        key TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating secret_keys table: ', err);
        } else {
          getSecretKey().then(key => {
            secretKey = key;
            createWindow();
          }).catch(err => {
            console.error(err);
            app.quit();
          });
        }
      });
    }
  });
}

function getSecretKey() {
  return new Promise((resolve, reject) => {
    db.get("SELECT key FROM secret_keys WHERE id = 1", (err, row) => {
      if (err) {
        reject('Error fetching secret key from database: ' + err);
      } else if (row) {
        resolve(row.key);
      } else {
        const newKey = crypto.randomBytes(32).toString('hex');
        db.run("INSERT INTO secret_keys (id, key) VALUES (1, ?)", [newKey], (err) => {
          if (err) {
            reject('Error storing new secret key in database: ' + err);
          } else {
            resolve(newKey);
          }
        });
      }
    });
  });
}

function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted;
  try {
    decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  } catch (error) {
    throw new Error('decryption failed');
  }
  return decrypted;
}

app.on('ready', () => {
  createDatabase();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

ipcMain.on('register', async (event, data) => {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10); // Hash the password before storing
    const hashedAnswer = await bcrypt.hash(data.answer, 10); // Hash the answer before storing
    const stmt = db.prepare("INSERT INTO registrations (email, name, password, organization, designation, sector, securityquestion, Answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run([data.email, data.name, hashedPassword, data.organization, data.designation, data.sector, data.question, hashedAnswer], function(err) {
      if (err) {
        console.error(err.message);
        event.reply('registration-success', { success: false });
      } else {
        event.reply('registration-success', { success: true, userId: this.lastID });
      }
    });
    stmt.finalize();
  } catch (error) {
    console.error('Error during registration:', error.message);
    event.reply('registration-success', { success: false });
  }
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

ipcMain.on('update-profile', async (event, updatedProfileData) => {
  const { email, name, sector, organization, designation, currentPassword, newEmail, newPassword } = updatedProfileData;

  // First, verify the provided password
  db.get("SELECT password FROM registrations WHERE email = ?", [email], async (err, row) => {
    if (err) {
      console.error('Error verifying password:', err.message);
      event.reply('profile-update', { success: false, message: 'Failed to verify password' });
    } else {
      if (row && await bcrypt.compare(currentPassword, row.password)) {
        // Password matches, proceed with the update

        let updateFields = `name = ?, sector = ?, organization = ?, designation = ?`;
        let updateParams = [name, sector, organization, designation];

        // Handle email change
        if (newEmail) {
          updateFields += `, email = ?`;
          updateParams.push(newEmail);
        }

        // Handle password change
        if (newPassword) {
          const hashedNewPassword = await bcrypt.hash(newPassword, 10);
          updateFields += `, password = ?`;
          updateParams.push(hashedNewPassword);
        }

        updateParams.push(email);

        db.run(`UPDATE registrations 
                SET ${updateFields}
                WHERE email = ?`, updateParams, (err) => {
            if (err) {
                console.error('Error updating profile:', err.message);
                event.reply('profile-update', { success: false });
            } else {
                event.reply('profile-update', { success: true });
            }
        });
      } else {
        // Password does not match
        event.reply('profile-update', { success: false, message: 'Incorrect password' });
      }
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
  const timestamp = getISTTimestamp();
  const fileName = `${assessmentName}-${timestamp}.json`;
  const savePath = path.join(__dirname, 'My Assessments');

  const dataPath = path.join(__dirname, 'quiz/Qdata.json');
  let quizData;
  try {
    const data = fs.readFileSync(dataPath, 'utf-8');
    quizData = JSON.parse(data);
  } catch (error) {
    console.error('Error reading quiz data:', error);
    event.reply('save-quiz-data-reply', { success: false, message: 'Failed to load quiz data.' });
    return;
  }

  const structuredData = {
    "Assessment Name": assessmentName,
    "Date": new Date().toLocaleDateString(),
    "Time": new Date().toLocaleTimeString(),
  };

  for (const domain in answers) {
    structuredData[domain] = answers[domain].map((answer, index) => {
      const questionData = quizData.domains.find(d => d.name === domain).questions[index];
      const result = {
        question: questionData.question,
        answer: answer.answer
      };
      if (answer.answer === 'no' || answer.answer === 'partial') {
        result.recommendation = questionData.Recommendation;
      }
      return result;
    });
  }

  try {
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath);
    }

    const fullPath = path.join(savePath, fileName);
    const encryptedData = encrypt(JSON.stringify(structuredData));
    fs.writeFileSync(fullPath, encryptedData);
    event.reply('save-quiz-data-reply', { success: true, message: 'Quiz data saved successfully.', fileName: fileName });
  } catch (error) {
    console.error('Error saving quiz data:', error);
    event.reply('save-quiz-data-reply', { success: false, message: 'Failed to save quiz data.' });
  }
});

ipcMain.handle('read-json-file', async (event, fileName) => {
  const filePath = path.join(__dirname, 'My Assessments', fileName);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const decryptedData = decrypt(data);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Error reading or decrypting JSON file:', error);
    if (error.message.includes('decryption')) {
      throw new Error('Invalid signature key');
    } else {
      throw new Error('Failed to read JSON file');
    }
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
    if (!fs.existsSync(assessmentsPath)) {
      return []; // Return an empty array if the folder does not exist
    }
    const files = fs.readdirSync(assessmentsPath);
    if (files.length === 0) {
      return []; // Return an empty array if the folder is empty
    }
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

    // Filter assessments by checking if they can be decrypted with the correct key
    const validAssessments = [];
    for (const assessment of assessments) {
      try {
        const data = fs.readFileSync(path.join(assessmentsPath, assessment.file), 'utf-8');
        decrypt(data); // Attempt to decrypt the data
        validAssessments.push(assessment); // If decryption is successful, add to valid assessments
      } catch (error) {
        console.error(`Invalid signature key for file: ${assessment.file}`);
      }
    }

    return validAssessments;
  } catch (error) {
    console.error('Error reading assessments:', error);
    throw new Error('Failed to load assessments');
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
    const encryptedData = fs.readFileSync(assessmentsPath, 'utf-8');
    const decryptedData = decrypt(encryptedData);
    const jsonData = JSON.parse(decryptedData);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assessment Results');

    // Ensure columns are defined based on the structure of jsonData
    worksheet.columns = [
      { header: 'Domain', key: 'domain', width: 30 },
      { header: 'Question', key: 'question', width: 30 },
      { header: 'Answer', key: 'answer', width: 10 },
      { header: 'Recommendation', key: 'recommendation', width: 50 }
    ];

    // Assuming jsonData is an object with domains as keys
    Object.keys(jsonData).forEach(domain => {
      if (domain !== 'Assessment Name' && domain !== 'Date' && domain !== 'Time') {
        jsonData[domain].forEach(entry => {
          worksheet.addRow({
            domain: domain,
            question: entry.question,
            answer: entry.answer,
            recommendation: entry.recommendation || ''
          });
        });
      }
    });

    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Assessment',
      defaultPath: path.join(app.getPath('downloads'), `${path.parse(fileName).name}.xlsx`),
      buttonLabel: 'Save',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (filePath) {
      await workbook.xlsx.writeFile(filePath);
      return { success: true, message: 'Assessment exported successfully.', filePath: filePath };
    } else {
      return { success: false, message: 'Export cancelled.' };
    }
  } catch (error) {
    console.error('Error exporting assessment:', error);
    return { success: false, message: 'Failed to export assessment.' };
  }
});

ipcMain.on('get-selected-question', (event, userId) => {
    const query = "SELECT securityquestion FROM registrations WHERE email = ?";
    db.get(query, [userId], (err, row) => {
        console.log("Query Result:", row); // Log the row to see what is being returned
        if (err) {
            console.error('Failed to fetch security question:', err);
            event.reply('selected-question-data', { success: false });
        } else if (row) {
            event.reply('selected-question-data', { success: true, question: row.securityquestion });
        } else {
            event.reply('selected-question-data', { success: false });
        }
    });
});

ipcMain.on('validate-answer-and-reset-password', async (event, data) => {
    const { userId, answer, newPassword } = data;

    // Ensure that the newPassword meets your criteria before proceeding
    if (!newPassword || newPassword.length < 8) {
        event.reply('reset-password-response', { success: false, message: 'Password does not meet criteria.' });
        return;
    }

    db.get("SELECT Answer, password FROM registrations WHERE rowid = ?", [userId], async (err, row) => {
        if (err) {
            console.error('Error fetching user data:', err.message);
            event.reply('reset-password-response', { success: false, message: 'Database error.' });
            return;
        }
        if (!row) {
            event.reply('reset-password-response', { success: false, message: 'User not found.' });
            return;
        }
        if (await bcrypt.compare(answer, row.Answer)) {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            db.run("UPDATE registrations SET password = ? WHERE rowid = ?", [hashedNewPassword, userId], function(err) {
                if (err) {
                    console.error('Error updating password:', err.message);
                    event.reply('reset-password-response', { success: false, message: 'Failed to update password.' });
                } else {
                    event.reply('reset-password-response', { success: true, message: 'Password updated successfully.' });
                }
            });
        } else {
            event.reply('reset-password-response', { success: false, message: 'Incorrect answer.' });
        }
    });
});

ipcMain.on('save-quiz-state', (event, quizState) => {
  const statePath = path.join(app.getPath('userData'), 'quizState.json');
  fs.writeFileSync(statePath, JSON.stringify(quizState));
});

ipcMain.handle('load-quiz-state', async () => {
  const statePath = path.join(app.getPath('userData'), 'quizState.json');
  if (fs.existsSync(statePath)) {
      const stateData = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(stateData);
  }
  return null;
});

ipcMain.handle('clear-quiz-state', async () => {
  const statePath = path.join(app.getPath('userData'), 'quizState.json');
  if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
  }
});

ipcMain.on('close-app', () => {
    app.quit();
});

