const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "knu_sw!!",
  database: "team3"
});

db.connect((err) => {
  if (err) return console.error("DB 연결 실패:", err);
  console.log("MySQL 연결 성공!");
});

module.exports = db;