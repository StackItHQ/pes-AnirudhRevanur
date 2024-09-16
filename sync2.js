const { google } = require('googleapis');
const fs = require('fs');
const mariadb = require('mysql2/promise');
const path = require('path');
require('dotenv').config()

// Load the Service Account credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'not_clients_secret.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// MariaDB setup
const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST,
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DATABASE,
  connectionLimit: 5,
});

// Sheet and Table information
const spreadsheetId = process.env.SPREADSHEET_ID;
const sheetName = 'Sheet1';
const tableName = process.env.MARIADB_TABLE;

// Polling interval (in milliseconds)
const POLL_INTERVAL = 5000; // Check every 5 seconds for changes

// Add a logging function
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Function to get data from Google Sheets
async function getSheetData() {
  try {
    log('Fetching data from Google Sheets...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });
    log(`Fetched ${response.data.values.length} rows from Google Sheets`);
    return response.data.values;
  } catch (error) {
    log(`Error fetching data from Google Sheets: ${error.message}`);
    throw error;
  }
}

// Function to get data from MariaDB
async function getDBData() {
  let conn;
  try {
    log('Fetching data from MariaDB...');
    conn = await pool.getConnection();
    const [rows] = await conn.query(`SELECT * FROM ${tableName}`);
    log(`Fetched ${rows.length} rows from MariaDB`);
    return rows;
  } catch (error) {
    log(`Error fetching data from MariaDB: ${error.message}`);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Function to delete a row from MariaDB by ID
async function deleteFromDB(id) {
  const conn = await pool.getConnection();
  try {
    await conn.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    log(`Deleted row with ID ${id} from MariaDB`);
  } catch (error) {
    log(`Error deleting row with ID ${id} from MariaDB: ${error.message}`);
    throw error;
  } finally {
    conn.release();
  }
}

// Function to delete a row from Google Sheets by row index
async function deleteFromSheets(rowIndex) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    log(`Deleted row at index ${rowIndex} from Google Sheets`);
  } catch (error) {
    log(`Error deleting row at index ${rowIndex} from Google Sheets: ${error.message}`);
    throw error;
  }
}

async function syncSheetsToDB() {
  try {
    log('Starting sync from Google Sheets to MariaDB...');
    const sheetData = await getSheetData();
    const header = sheetData[0];
    const rows = sheetData.slice(1);

    log(`Processing ${rows.length} rows from Google Sheets`);

    const conn = await pool.getConnection();
    const dbData = await getDBData();
    const dbIds = dbData.map(row => row.id.toString());

    const sheetIds = rows
      .filter(row => row[0])
      .map(row => row[0]);

    // Delete from MariaDB
    for (let dbRow of dbData) {
      if (!sheetIds.includes(dbRow.id.toString())) {
        log(`Deleting ID ${dbRow.id} from MariaDB`);
        await deleteFromDB(dbRow.id);
      }
    }

    // Sync rows from Sheets to DB
    for (let row of rows) {
      const id = row[0];
      if (!id) {
        log(`Skipping row with no ID: ${row}`);
        continue;
      }
      const role = row[1] || '';
      const name = row[2] || '';

      const [dbRow] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

      if (dbRow.length === 0) {
        log(`Inserting new row with ID ${id} into MariaDB`);
        await conn.query(`INSERT INTO ${tableName} (id, role, name) VALUES (?, ?, ?)`, [id, role, name]);
      } else {
        log(`Updating row with ID ${id} in MariaDB`);
        await conn.query(`UPDATE ${tableName} SET role = ?, name = ? WHERE id = ?`, [role, name, id]);
      }
    }

    conn.release();
    log('Google Sheets synced to MariaDB successfully.');
  } catch (error) {
    log(`Error in syncSheetsToDB: ${error.message}`);
    throw error;
  }
}

async function syncDBToSheets() {
  try {
    log('Starting sync from MariaDB to Google Sheets...');
    const dbData = await getDBData();
    const sheetData = await getSheetData();
    const rows = sheetData.slice(1);
    const sheetIds = rows
      .filter(row => row[0])
      .map(row => row[0]);

    log(`Processing ${dbData.length} rows from MariaDB`);

    const updates = [];

    // Delete from Google Sheets
    for (let i = 0; i < sheetIds.length; i++) {
      if (!dbData.some(dbRow => dbRow.id && dbRow.id.toString() === sheetIds[i])) {
        log(`Deleting row ${i + 2} (ID: ${sheetIds[i]}) from Google Sheets`);
        await deleteFromSheets(i + 1);
      }
    }

    // Sync rows from DB to Sheets
    for (let dbRow of dbData) {
      if (dbRow.id === undefined || dbRow.id === null) {
        log(`Skipping database row with undefined or null ID: ${JSON.stringify(dbRow)}`);
        continue;
      }

      const id = dbRow.id.toString();
      const role = dbRow.role || '';
      const name = dbRow.name || '';

      const sheetIndex = sheetIds.indexOf(id);

      if (sheetIndex === -1) {
        log(`Appending new row with ID ${id} to Google Sheets`);
        updates.push([id, role, name]);
      } else {
        const sheetRow = rows[sheetIndex];
        const sheetRole = sheetRow[1] || '';
        const sheetName = sheetRow[2] || '';

        if (sheetRole !== role || sheetName !== name) {
          log(`Updating row with ID ${id} in Google Sheets`);
          sheetRow[1] = role;
          sheetRow[2] = name;
          updates.push(sheetRow);
        }
      }
    }

    if (updates.length > 0) {
      log(`Applying ${updates.length} updates to Google Sheets`);
      const resource = { values: updates };
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'RAW',
        resource,
      });
      log('MariaDB synced to Google Sheets successfully.');
    } else {
      log('No updates needed for Google Sheets.');
    }
  } catch (error) {
    log(`Error in syncDBToSheets: ${error.message}`);
    throw error;
  }
}

async function pollSync() {
  try {
    log('Starting sync cycle...');
    await syncSheetsToDB();
    await syncDBToSheets();
    log('Sync cycle completed successfully.');
  } catch (error) {
    log(`Sync error: ${error.message}`);
    // You might want to implement some error recovery logic here
  }

  setTimeout(pollSync, POLL_INTERVAL);
}

// Start the polling process
log('Starting sync process...');
pollSync();
