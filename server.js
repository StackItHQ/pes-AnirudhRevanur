const express = require('express')
const cors = require('cors')
const mysql = require('mysql2')
const app = express()
require('dotenv').config()


app.use(cors())
app.use(express.json())

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


app.get('/api/data', (req, res) => {

  let query = "select * from People;"

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error querying dab: ', err)
      res.status(500).send('Error occurred in fetching data')
      return
    }
    res.json(results)
  })
})

app.post('/api/add-person', (req, res) => {
  const { name, role } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }

  const query = 'insert into People (Name, Role) values (?, ?)'
  db.query(query, [name, role], (err, results) => {
    if (err) {
      console.error('Error: ', err);
      res.status(500).send("error occured");
      return;
    }
    res.status(201).json({ id: results.insertId, name, role });
  })
})



const PORT = 6969;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
