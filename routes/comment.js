const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 📌 로그인 여부 확인 미들웨어
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "로그인이 필요합니다." });
  }
  next();
}

// NOTE: comment 테이블 스키마에 review_id 컬럼이 없습니다.
// 따라서 이 파일은 상품(product) 댓글만 지원하도록 구현했습니다.

// 📌 댓글 작성 (상품에 대해 작성)
router.post("/add", isLoggedIn, (req, res) => {
  const { product_id, content } = req.body; // 프론트는 product_id, content로 보냄
  const user_id = req.session.user.user_id; // 세션에서 가져옴

  if (!content) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력하세요." });
  }

  if (!product_id) {
    return res.status(400).json({ success: false, message: "product_id가 필요합니다." });
  }

  const sql = `INSERT INTO comment (product_id, user_id, comment) VALUES (?, ?, ?)`;

  db.query(sql, [product_id, user_id, content], (err, result) => {
    if (err) {
      console.error("댓글 등록 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 등록 실패" });
    }
    res.json({ success: true, message: "댓글 등록 완료", comment_id: result.insertId });
  });
});

// 📌 상품 댓글 조회
router.get("/list/product/:product_id", (req, res) => {
  const { product_id } = req.params;

  const sql = `
    SELECT 
      c.comment_id, 
      c.comment AS content, 
      DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
      u.username,
      c.user_id
    FROM comment c
    LEFT JOIN user u ON c.user_id = u.user_id
    WHERE c.product_id = ?
    ORDER BY c.created_at DESC
  `;

  db.query(sql, [product_id], (err, results) => {
    if (err) {
      console.error("댓글 조회 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 조회 실패" });
    }
    res.json({ success: true, comments: results });
  });
});

// 📌 (비지원) 리뷰 댓글 조회
// 참고: comment 테이블에 review_id 컬럼이 없으므로, 리뷰 댓글을 지원하려면 DB 스키마 추가 필요.
router.get("/list/review/:review_id", (req, res) => {
  return res.status(400).json({ success: false, message: "리뷰 댓글은 현재 지원하지 않습니다. (DB에 review_id 컬럼 없음)" });
});

// 📌 댓글 수정 (작성자만 수정 가능)
router.put("/update", isLoggedIn, (req, res) => {
  const { comment_id, new_content } = req.body;
  const user_id = req.session.user.user_id; // 로그인한 사용자

  if (!comment_id || !new_content) {
    return res.status(400).json({ success: false, message: "comment_id와 new_content 필요" });
  }

  // 작성자 확인 쿼리
  const checkSql = `SELECT user_id FROM comment WHERE comment_id = ?`;

  db.query(checkSql, [comment_id], (err, results) => {
    if (err) {
      console.error("댓글 수정 확인 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 수정 중 오류" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: "댓글을 찾을 수 없음" });
    }

    if (results[0].user_id !== user_id) {
      return res.status(403).json({ success: false, message: "수정 권한 없음" });
    }

    // 수정 실행 (DB의 컬럼명은 `comment`)
    const updateSql = `UPDATE comment SET comment = ? WHERE comment_id = ?`;

    db.query(updateSql, [new_content, comment_id], (err) => {
      if (err) {
        console.error("댓글 수정 오류:", err);
        return res.status(500).json({ success: false, message: "댓글 수정 실패" });
      }
      res.json({ success: true, message: "댓글 수정 완료" });
    });
  });
});

// 📌 댓글 삭제 (작성자만 삭제 가능)
router.delete("/remove", isLoggedIn, (req, res) => {
  const { comment_id } = req.body;
  const user_id = req.session.user.user_id;

  if (!comment_id) {
    return res.status(400).json({ success: false, message: "comment_id 필요" });
  }

  const checkSql = `SELECT user_id FROM comment WHERE comment_id = ?`;

  db.query(checkSql, [comment_id], (err, results) => {
    if (err) {
      console.error("댓글 삭제 확인 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 삭제 중 오류" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: "댓글을 찾을 수 없음" });
    }

    if (results[0].user_id !== user_id) {
      return res.status(403).json({ success: false, message: "삭제 권한 없음" });
    }

    const deleteSql = `DELETE FROM comment WHERE comment_id = ?`;

    db.query(deleteSql, [comment_id], (err) => {
      if (err) {
        console.error("댓글 삭제 오류:", err);
        return res.status(500).json({ success: false, message: "댓글 삭제 실패" });
      }
      res.json({ success: true, message: "댓글 삭제 완료" });
    });
  });
});

module.exports = router;
