// routes/review.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 📌 리뷰 작성
router.post("/add", (req, res) => {
  const { product_id, user_id, rating, comment } = req.body;

  if (!product_id || !user_id || !rating) {
    return res.status(400).send("필수 값 누락 (product_id, user_id, rating)");
  }

  const sql = `
    INSERT INTO review (product_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [product_id, user_id, rating, comment || null], (err, result) => {
    if (err) {
      console.error("리뷰 등록 오류:", err);
      return res.status(500).send("리뷰 등록 실패");
    }
    res.send({ message: "리뷰 등록 완료", review_id: result.insertId });
  });
});

// 📌 특정 상품의 리뷰 목록 조회
router.get("/list", (req, res) => {
  const { product_id } = req.query;

  if (!product_id) {
    return res.status(400).send("product_id 필요");
  }

  const sql = `
    SELECT r.review_id, r.rating, r.comment, r.created_at,
           u.username
    FROM review r
    JOIN user u ON r.user_id = u.user_id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [product_id], (err, results) => {
    if (err) {
      console.error("리뷰 목록 조회 오류:", err);
      return res.status(500).send("조회 실패");
    }
    res.send(results);
  });
});

// 📌 리뷰 삭제
router.delete("/remove", (req, res) => {
  const { review_id } = req.body;

  if (!review_id) {
    return res.status(400).send("review_id 필요");
  }

  const sql = `DELETE FROM review WHERE review_id = ?`;

  db.query(sql, [review_id], (err) => {
    if (err) {
      console.error("리뷰 삭제 오류:", err);
      return res.status(500).send("삭제 실패");
    }
    res.send({ message: "리뷰 삭제 완료" });
  });
});

module.exports = router;