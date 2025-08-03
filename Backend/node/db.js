// const mysql = require('mysql2');

// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',         // change if different
//   password: 'Aditya@0903',         // add your password
//   database: 'attendance'
// });

// db.connect((err) => {
//   if (err) throw err;
//   console.log('✅ MySQL Connected');
// });

// module.exports = db;


const mysql = require("mysql2/promise");
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Aditya@0903",
  database: "attendance",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;
