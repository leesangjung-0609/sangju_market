// routes/comment.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 📌 댓글 작성 (리뷰나 상품 모두 대상 가능)
router.post("/add", (req, res) => {
  const { review_id, product_id, user_id, content } = req.body;

  if (!user_id || !content) {
    return res.status(400).send("필수 값 누락 (user_id, content)");
  }

  if (!review_id && !product_id) {
    return res.status(400).send("review_id 또는 product_id 중 하나는 필요");
  }

  const sql = `
    INSERT INTO comment (review_id, product_id, user_id, content)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [review_id || null, product_id || null, user_id, content], (err, result) => {
    if (err) {
      console.error("댓글 등록 오류:", err);
      return res.status(500).send("댓글 등록 실패");
    }
    res.send({ message: "댓글 등록 완료", comment_id: result.insertId });
  });
});

// 📌 특정 리뷰 또는 상품의 댓글 목록 조회
router.get("/list", (req, res) => {
  const { review_id, product_id } = req.query;

  if (!review_id && !product_id) {
    return res.status(400).send("review_id 또는 product_id 필요");
  }

  const sql = `
    SELECT c.comment_id, c.content, c.created_at,
           u.username
    FROM comment c
    JOIN user u ON c.user_id = u.user_id
    WHERE (c.review_id = ? OR c.product_id = ?)
    ORDER BY c.created_at DESC
  `;

  db.query(sql, [review_id || null, product_id || null], (err, results) => {
    if (err) {
      console.error("댓글 조회 오류:", err);
      return res.status(500).send("조회 실패");
    }
    res.send(results);
  });
});

// 📌 댓글 삭제
router.delete("/remove", (req, res) => {
  const { comment_id } = req.body;

  if (!comment_id) {
    return res.status(400).send("comment_id 필요");
  }

  const sql = `DELETE FROM comment WHERE comment_id = ?`;

  db.query(sql, [comment_id], (err) => {
    if (err) {
      console.error("댓글 삭제 오류:", err);
      return res.status(500).send("삭제 실패");
    }
    res.send({ message: "댓글 삭제 완료" });
  });
});

module.exports = router;
