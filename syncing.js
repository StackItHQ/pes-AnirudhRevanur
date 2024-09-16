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
const spreadsheetId = process.env.SPREADSHEET_ID; // Change this to your Google Spreadsheet ID
const sheetName = 'Sheet1'; // Change this to your sheet name
const tableName = process.env.MARIADB_TABLE; // Change this to your MariaDB table name

// Polling interval (in milliseconds)
const POLL_INTERVAL = 5000; // Check every 5 seconds for changes

// Function to get data from Google Sheets
async function getSheetData() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  return response.data.values; // Returns the array of rows
}

// Function to get data from MariaDB
async function getDBData() {
  const conn = await pool.getConnection();
  const result = await conn.query(`SELECT * FROM ${tableName}`);
  conn.release();
  return result; // Returns array of rows from the DB
}

// Function to delete a row from MariaDB by ID
async function deleteFromDB(id) {
  const conn = await pool.getConnection();
  await conn.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
  conn.release();
}

// Function to delete a row from Google Sheets by row index
async function deleteFromSheets(rowIndex) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 0, // Assuming you're working with the first sheet
              dimension: 'ROWS',
              startIndex: rowIndex, // Row index in Sheets starts from 0
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

async function syncSheetsToDB() {
  const sheetData = await getSheetData();
  const header = sheetData[0]; // First row as header (ID, Role, Name)
  const rows = sheetData.slice(1); // Data after header

  const conn = await pool.getConnection();
  const dbData = await getDBData();
  const dbIds = dbData.map(row => row.id.toString());

  const sheetIds = rows
    .filter(row => row[0]) // Make sure we filter out rows that have no ID
    .map(row => row[0]); // IDs from Google Sheets

  // Delete from MariaDB if an ID exists in the DB but not in Google Sheets
  for (let dbRow of dbData) {
    if (!sheetIds.includes(dbRow.id.toString())) {
      console.log(`Deleting ID ${dbRow.id} from MariaDB`);
      await deleteFromDB(dbRow.id);
    }
  }

  // Sync rows from Sheets to DB
  for (let row of rows) {
    const id = row[0]; // Assuming the first column is the unique ID
    if (!id) {
      continue; // Skip if the row has no ID
    }
    const role = row[1] || ''; // Handle empty Role
    const name = row[2] || ''; // Handle empty Name

    // Check if the row exists in the DB by ID
    const dbRow = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

    if (dbRow.length === 0) {
      // Row doesn't exist in DB, insert it
      const query = `INSERT INTO ${tableName} (id, role, name) VALUES (?, ?, ?)`;
      await conn.query(query, [id, role, name]);
    } else {
      // Row exists, update it
      const query = `UPDATE ${tableName} SET role = ?, name = ? WHERE id = ?`;
      await conn.query(query, [role, name, id]);
    }
  }

  conn.release();
  console.log('Google Sheets synced to MariaDB.');
}

// Function to sync from MariaDB to Google Sheets (including deletes)
async function syncDBToSheets() {
  const dbData = await getDBData();

  // Fetch the current data in Google Sheets
  const sheetData = await getSheetData();
  const rows = sheetData.slice(1); // Data after the header
  const sheetIds = rows
    .filter(row => row[0]) // Filter out any rows that have no ID
    .map(row => row[0]); // Get IDs from Google Sheets

  const updates = [];

  // Delete from Google Sheets if an ID exists in Sheets but not in MariaDB
  for (let i = 0; i < sheetIds.length; i++) {
    if (!dbData.some(dbRow => dbRow.id.toString() === sheetIds[i])) {
      console.log(`Deleting row ${i + 2} (ID: ${sheetIds[i]}) from Google Sheets`);
      await deleteFromSheets(i + 1); // i+1 since row 0 is the header
    }
  }

  // Sync rows from DB to Sheets
  for (let dbRow of dbData) {
    const id = dbRow.id.toString(); // Convert DB ID to string to match Google Sheets format
    const role = dbRow.role || ''; // Handle empty Role
    const name = dbRow.name || ''; // Handle empty Name

    const sheetIndex = sheetIds.indexOf(id);

    if (sheetIndex === -1) {
      // Row doesn't exist in Sheets, so we append it
      updates.push([id, role, name]);
    } else {
      // Row exists, check if the data needs updating
      const sheetRow = rows[sheetIndex];
      const sheetRole = sheetRow[1] || ''; // Handle missing role
      const sheetName = sheetRow[2] || ''; // Handle missing name

      if (sheetRole !== role || sheetName !== name) {
        // Update the row in Google Sheets
        sheetRow[1] = role;
        sheetRow[2] = name;
        updates.push(sheetRow);
      }
    }
  }

  if (updates.length > 0) {
    const resource = {
      values: updates,
    };

    // Update Google Sheets with new data from the DB
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A2`, // Start at row 2, assuming row 1 is the header
      valueInputOption: 'RAW',
      resource,
    });

    console.log('MariaDB synced to Google Sheets.');
  }
}
// Polling function to sync both ways in real-time
async function pollSync() {
  try {
    await syncSheetsToDB(); // Sync Google Sheets to MariaDB
    await syncDBToSheets(); // Sync MariaDB to Google Sheets
  } catch (error) {
    console.error('Sync error:', error);
  }

  setTimeout(pollSync, POLL_INTERVAL); // Repeat after the interval
}

// Start the polling process
pollSync();

