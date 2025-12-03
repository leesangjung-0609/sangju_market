const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db/db");

// --------------------------------------------------
// 1. 회원가입
// --------------------------------------------------

router.post("/signup", async (req, res) => {
  const { username, password, name, email, phone, age, birth, gender } = req.body;

  if (!username || !password || !name || !email || !birth || !gender) {
    return res.status(400).send("필수 필드(아이디, 비밀번호, 이름, 이메일, 생년월일, 성별)를 모두 입력해주세요.");
  }
  
  try {
    const hashedPw = await bcrypt.hash(password, 10);

    const finalAge = (typeof age === 'number' && age > 0) ? age : null;
    const finalPhone = phone || null;
    
    const sql = `INSERT INTO user (username, password, name, email, phone, status, age, birth, gender) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`;
    
    db.query(sql, [username, hashedPw, name, email, finalPhone, finalAge, birth, gender], (err) => {
      if (err) {
        console.error("회원가입 실패:", err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).send("이미 존재하는 아이디 또는 이메일입니다.");
        }
        console.error("MySQL 오류 코드:", err.code);
        console.error("MySQL 오류 메시지:", err.message);
        return res.status(500).send("회원가입 실패 (DB 오류)");
      }
      res.send("회원가입 완료!");
    });

  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).send("서버 오류");
  }
});

// --------------------------------------------------
// 2. 로그인
// --------------------------------------------------

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).send("아이디와 비밀번호를 모두 입력해야 합니다.");
  }

  const sql = `SELECT user_id, username, password, name, email FROM user WHERE username = ? AND status = 'active'`;

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
      return res.status(401).send("비밀번호가 일치하지 않습니다."); // 401로 상태 코드 개선
    }

    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      name: user.name,
      email: user.email
    };

    req.session.save(err => {
      if (err) {
        console.error("세션 저장 오류:", err);
        return res.status(500).send("로그인 성공, 세션 저장 실패");
      }

      res.send({
        message: "로그인 성공",
        username: user.username
      });
    });
  });
});

// --------------------------------------------------
// 3. 로그아웃
// --------------------------------------------------

router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("로그아웃 실패");
    res.send({ message: "로그아웃 완료" });
  });
});

// --------------------------------------------------
// 4. 내 정보 조회 (GET /info)
// --------------------------------------------------

router.get("/info", (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("로그인 필요");
    }

    const userId = req.session.user.user_id;

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

// --------------------------------------------------
// 5. 내 정보 수정 (PATCH /info)
// --------------------------------------------------

router.patch("/info", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("로그인 필요");
  }

  const userId = req.session.user.user_id;
  const { name, email, phone, birth, gender, currentPassword, newPassword } = req.body;
  
  // 1. 업데이트할 필드 구성
  let updateFields = {
    name: name,
    email: email,
    phone: phone || null,
    birth: birth,
    gender: gender
  };

  let updatePw = false;

  // 2. 비밀번호 변경이 요청된 경우 (newPassword가 존재하는 경우)
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).send("새 비밀번호를 설정하려면 현재 비밀번호를 입력해야 합니다.");
    }
    if (newPassword.length < 4) { 
      return res.status(400).send("새 비밀번호는 최소 4자 이상이어야 합니다.");
    }
    updatePw = true;
  }
  
  // 3. 현재 비밀번호 확인 (비밀번호 변경이 요청되었거나, 일반 정보 수정 요청이지만 현재 비밀번호가 제공된 경우)
  if (updatePw || currentPassword) {
    const pwCheckSql = `SELECT password FROM user WHERE user_id = ? AND status = 'active'`;
    db.query(pwCheckSql, [userId], async (err, results) => {
      if (err) {
        console.error("정보 수정 시 비밀번호 조회 오류:", err);
        return res.status(500).send("서버 오류");
      }
      if (results.length === 0) {
        return res.status(404).send("회원 정보를 찾을 수 없습니다.");
      }
      
      const hashedPassword = results[0].password;
      const passwordMatches = await bcrypt.compare(currentPassword, hashedPassword);

      if (!passwordMatches) {
        return res.status(401).send("현재 비밀번호가 일치하지 않습니다.");
      }
      
      // 비밀번호 변경 요청이 있었다면 해싱하여 업데이트 필드에 추가
      if (updatePw) {
        try {
          updateFields.password = await bcrypt.hash(newPassword, 10);
        } catch (hashErr) {
          console.error("새 비밀번호 해싱 오류:", hashErr);
          return res.status(500).send("비밀번호 처리 중 서버 오류");
        }
      }
      
      // DB 업데이트 실행
      executeUserUpdate(req, res, userId, updateFields);
    });
  } else {
    // 4. 비밀번호 확인 없이 일반 정보만 수정
    executeUserUpdate(req, res, userId, updateFields);
  }
});

// 사용자 정보 업데이트를 처리하는 헬퍼 함수
function executeUserUpdate(req, res, userId, updateFields) {
  // DB 업데이트 쿼리 생성
  const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
  const updateValues = Object.values(updateFields);
  updateValues.push(userId); // WHERE 절의 user_id

  const updateSql = `UPDATE user SET ${setClauses} WHERE user_id = ?`;

  db.query(updateSql, updateValues, (updateErr) => {
    if (updateErr) {
      console.error("정보 수정 DB 업데이트 오류:", updateErr);
      if (updateErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).send("이미 존재하는 이메일입니다.");
      }
      return res.status(500).send("정보 수정 실패 (DB 오류)");
    }
    
    // 세션 정보 업데이트
    req.session.user.name = updateFields.name;
    req.session.user.email = updateFields.email;
    
    req.session.save(err => {
      if (err) {
        console.error("정보 수정 후 세션 업데이트 오류:", err);
      }
      res.send("정보가 성공적으로 수정되었습니다.");
    });
  });
}

// --------------------------------------------------
// 6. 아이디 중복 확인
// --------------------------------------------------

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

// --------------------------------------------------
// 7. 현재 로그인 상태 확인
// --------------------------------------------------

router.get("/current", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ loggedIn: false });
  }

  const userId = req.session.user.user_id;

  const sql = `SELECT username, status FROM user WHERE user_id = ?`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("현재 로그인 사용자 조회 오류:", err);
      return res.status(500).send("서버 오류");
    }

    if (results.length === 0) {
      return res.status(404).json({ loggedIn: false });
    }

    const user = results[0];

    res.json({
      loggedIn: true,
      username: user.username,
      user_id: userId,
      status: user.status
    });
  });
});

// --------------------------------------------------
// 8. 판매자 정보 조회
// --------------------------------------------------

router.get("/seller/:sellerId", (req, res) => {
  const sellerId = req.params.sellerId;

  const sql = `
    SELECT user_id, username, name, email
    FROM user
    WHERE user_id = ?
  `;

  db.query(sql, [sellerId], (err, results) => {
    if (err) return res.status(500).send("판매자 조회 실패");
    if (results.length === 0) return res.status(404).send("판매자를 찾을 수 없습니다.");

    res.json(results[0]);
  });
});

module.exports = router;