const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db/db");

// 회원가입
router.post("/signup", async (req, res) => {
  const { username, password, name, email, phone } = req.body;

  if (!username || !password || !name || !email) {
    return res.status(400).send("모든 필드를 입력해주세요.");
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO user (username, password, name, email, phone, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `;

    db.query(sql, [username, hashedPw, name, email, phone || null], (err) => {
      if (err) {
        console.error("회원가입 실패:", err);
        return res.status(500).send("회원가입 실패");
      }
      res.send("회원가입 완료!");
    });

  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).send("서버 오류");
  }
});

// 로그인 (세션 저장)
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `SELECT * FROM user WHERE username = ? AND status = 'active'`;

  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error("로그인 쿼리 오류:", err);
      return res.status(500).send("로그인 실패");
    }

    if (results.length === 0) {
      return res.status(400).send("아이디가 존재하지 않습니다.");
    }

    const user = results[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(400).send("비밀번호가 일치하지 않습니다.");
    }

    // ✅ 세션에 userId 저장
    req.session.userId = user.user_id;

    res.send({
      message: "로그인 성공",
      username: user.username
    });
  });
});

// 로그아웃
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("로그아웃 실패");
    res.send({ message: "로그아웃 완료" });
  });
});

// 내 정보 조회 (세션 기반)
router.get("/info", (req, res) => {
  const userId = req.session.userId;

  if (!userId) return res.status(401).send("로그인 필요");

  const sql = `
    SELECT user_id, username, name, email, phone, status, age, birth, gender, created_at 
    FROM user 
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("내 정보 조회 오류:", err);
      return res.status(500).send("서버 오류");
    }

    if (results.length === 0) return res.status(404).send("회원 정보를 찾을 수 없습니다.");

    res.send(results[0]);
  });
});

// 아이디 중복 확인 (세션 필요 없음)
router.post("/check-username", (req, res) => {
  const { username } = req.body;
  const sql = `SELECT * FROM user WHERE username = ?`;

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("중복 확인 오류:", err);
      return res.status(500).send("서버 오류");
    }

    res.send({ exists: results.length > 0 });
  });
});

module.exports = router;
