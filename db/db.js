const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "155.230.241.241",
  port: 3306,
  user: "team3_nam",
  password: "team3_nam##",
  database: "univ_db_team3"
});

db.connect((err) => {
  if (err) return console.error("DB 연결 실패:", err);
  console.log("MySQL 연결 성공!");
});

module.exports = db;