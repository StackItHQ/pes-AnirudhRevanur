const express = require('express')
const cors = require('cors')
const mysql = require('mysql2')
const app = express()
require('dotenv').config()

app.use(cors({
  origin: '*',
  methods: ["GET", 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.set('trust proxy', true);


const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USERNAME,
  password: process.env.USERPASSWORD,
  database: process.env.DBNAME
})

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database', err)
    return
  }
  console.log("Connected to database")
})

app.get('/api/sync', (req, res) => {
  let query = "SELECT * FROM People;"
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error querying database: ', err)
      res.status(500).send('Error occurred in fetching data')
      return
    }
    res.setHeader('Content-Type', 'application/json')
    res.json(results)
  })
})

app.post('/api', (req, res) => {
  const { action, data, row } = req.body;

  if (action === 'update') {
    const { Name, Role } = data;
    if (!Name || !Role) {
      return res.status(400).json({ error: 'Name and Role are required' });
    }
    const query = 'UPDATE People SET Name = ?, Role = ? WHERE id = ?';
    db.query(query, [Name, Role, row], (err, results) => {
      if (err) {
        console.error('Error updating data: ', err);
        res.status(500).send("Error occurred while updating");
        return;
      }
      res.json({ success: true, message: 'Data updated successfully' });
    });
  } else if (action === 'delete') {
    const query = 'DELETE FROM People WHERE id = ?';
    db.query(query, [row], (err, results) => {
      if (err) {
        console.error('Error deleting data: ', err);
        res.status(500).send("Error occurred while deleting");
        return;
      }
      res.json({ success: true, message: 'Data deleted successfully' });
    });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
})

app.post('/api/add-person', (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }
  const query = 'INSERT INTO People (Name, Role) VALUES (?, ?)';
  db.query(query, [name, role], (err, results) => {
    if (err) {
      console.error('Error: ', err);
      res.status(500).send("Error occurred");
      return;
    }
    res.status(201).json({ id: results.insertId, name, role });
  })
})

const PORT = 6969;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})

app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.path}`);
  next();
});
