const { google } = require('googleapis');
const fs = require('fs');
const mariadb = require('mysql2/promise');
const path = require('path');
require('dotenv').config();


// Load the Service Account credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'not_clients_secret.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// MariaDB setup
const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST, // Change to your MariaDB server address
  user: process.env.MARIADB_USER, // Change to your MariaDB user
  password: process.env.MARIADB_PASSWORD, // Change to your MariaDB password
  database: process.env.MARIADB_DATABASE, // Change to your MariaDB database name
  connectionLimit: 5,
});

async function syncGoogleSheetToDB() {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID; // Change to your Google Spreadsheet ID
    const range = 'Sheet1'; // Specify your sheet and range

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (rows.length > 1) {
      console.log('Data received from Google Sheets:');
      console.log(rows.slice(1));

      const conn = await pool.getConnection();

      // Iterate over rows and insert into MariaDB
      for (let i = 1; i < rows.length; i++) {
        const [column1, column2, column3, column4] = rows[i];
        const query = `INSERT INTO People (column1, column2, column3, column4)
                       VALUES (?, ?, ?, ?)`;
        await conn.query(query, [column1, column2, column3, column4]);
      }

      console.log('Data synced to MariaDB successfully.');
      conn.release();
    } else {
      console.log('No data found in Google Sheets.');
    }
  } catch (err) {
    console.error('Error syncing data:', err);
  }
}

syncGoogleSheetToDB();

