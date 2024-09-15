const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const http = require('http');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ["GET", 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const server = http.createServer(app);

let db;

async function connectDB() {
  db = await mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USERNAME,
    password: process.env.USERPASSWORD,
    database: process.env.DBNAME
  });
  console.log("Connected to database");
}

connectDB();

app.post('/api', async (req, res) => {
  const { action, data } = req.body;

  try {
    switch (action) {
      case 'update':
        await updateDatabase(data);
        break;
      case 'insert':
        const newId = await insertIntoDatabase(data);
        res.json({ success: true, newId });
        return;
      case 'delete':
        await deleteFromDatabase(data);
        break;
      default:
        res.status(400).json({ error: 'Invalid action' });
        return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function updateDatabase(data) {
  const { Name, Role, ID } = data;
  const query = 'UPDATE People SET Name = ?, Role = ? WHERE ID = ?';
  await db.execute(query, [Name, Role, ID]);
}

async function insertIntoDatabase(data) {
  const { Name, Role } = data;
  const query = 'INSERT INTO People (Name, Role) VALUES (?, ?)';
  const [result] = await db.execute(query, [Name, Role]);
  return result.insertId;
}

async function deleteFromDatabase(data) {
  const { ID } = data;
  const query = 'DELETE FROM People WHERE ID = ?';
  await db.execute(query, [ID]);
}

app.get('/api/changes', async (req, res) => {
  try {
    const changes = await getChanges();
    res.json(changes);
  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getChanges() {
  const changes = [];

  const [insertLogs] = await db.execute('SELECT * FROM insert_log WHERE processed = FALSE');
  for (const log of insertLogs) {
    const { id, log_message } = log;
    const newId = log_message.split(':')[1].trim();
    const [newRow] = await db.execute('SELECT * FROM People WHERE ID = ?', [newId]);
    if (newRow.length > 0) {
      changes.push({
        action: 'insert',
        data: newRow[0]
      });
    }
    await db.execute('UPDATE insert_log SET processed = TRUE WHERE id = ?', [id]);
  }

  const [updateLogs] = await db.execute('SELECT * FROM update_log WHERE processed = FALSE');
  for (const log of updateLogs) {
    const { id, row_id, updated_fields } = log;
    const [updatedRow] = await db.execute('SELECT * FROM People WHERE ID = ?', [row_id]);
    if (updatedRow.length > 0) {
      changes.push({
        action: 'update',
        data: updatedRow[0],
        updatedFields: updated_fields.split(',')
      });
    }
    await db.execute('UPDATE update_log SET processed = TRUE WHERE id = ?', [id]);
  }

  const [deletionLogs] = await db.execute('SELECT * FROM deletion_logs WHERE processed = FALSE');
  for (const log of deletionLogs) {
    const { log_id, row_id } = log;
    changes.push({
      action: 'delete',
      data: { ID: row_id }
    });
    await db.execute('UPDATE deletion_logs SET processed = TRUE WHERE log_id = ?', [log_id]);
  }

  return changes;
}

app.get('/api/sync', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM People');
    res.json(rows);
  } catch (error) {
    console.error('Error during full sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 6969;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
