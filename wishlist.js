// routes/wishlist.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 📌 위시리스트 추가
router.post("/add", (req, res) => {
  const { user_id, product_id } = req.body;

  if (!user_id || !product_id) {
    return res.status(400).send("필수 값 누락됨 (user_id, product_id)");
  }

  const sql = `
    INSERT INTO wishlist (user_id, product_id)
    VALUES (?, ?)
  `;

  db.query(sql, [user_id, product_id], (err, result) => {
    if (err) {
      console.error("위시리스트 등록 오류:", err);
      return res.status(500).send("위시리스트 등록 실패");
    }
    res.send({ message: "위시리스트 추가 완료", wishlist_id: result.insertId });
  });
});

// 📌 특정 사용자의 위시리스트 목록 조회
router.get("/list", (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).send("user_id 필요");
  }

  const sql = `
    SELECT w.wishlist_id, p.product_id, p.title, p.price, p.image_url
    FROM wishlist w
    JOIN product p ON w.product_id = p.product_id
    WHERE w.user_id = ?
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error("위시리스트 조회 오류:", err);
      return res.status(500).send("조회 실패");
    }
    res.send(results);
  });
});

// 📌 위시리스트 삭제
router.delete("/remove", (req, res) => {
  const { wishlist_id } = req.body;

  if (!wishlist_id) {
    return res.status(400).send("wishlist_id 필요");
  }

  const sql = `DELETE FROM wishlist WHERE wishlist_id = ?`;

  db.query(sql, [wishlist_id], (err) => {
    if (err) {
      console.error("위시리스트 삭제 오류:", err);
      return res.status(500).send("삭제 실패");
    }
    res.send({ message: "삭제 완료" });
  });
});

module.exports = router;
