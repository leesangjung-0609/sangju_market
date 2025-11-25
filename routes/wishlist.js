const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 찜 추가
router.post("/add", (req, res) => {
  const userId = req.session.userId;
  const { productId } = req.body;
  if (!userId) return res.status(401).json({ error: "로그인 필요" });

  // 이미 찜했는지 확인
  const checkSql = `
    SELECT * FROM wishlist 
    WHERE user_id = ? AND product_id = ? AND Del_yn = 0
  `;
  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length > 0) {
      return res.json({ message: "이미 찜한 상품입니다." });
    }

    // 찜 추가
    const insertSql = `
      INSERT INTO wishlist (user_id, product_id)
      VALUES (?, ?)
    `;
    db.query(insertSql, [userId, productId], (err2) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.json({ message: "찜 추가 완료" });
    });
  });
});

// 찜 목록 조회
router.get("/", (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "로그인 필요" });

  const sql = `
    SELECT w.wishlist_id, p.product_id, p.title, p.price, p.image_url, u.username AS seller_name
    FROM wishlist w
    JOIN product p ON w.product_id = p.product_id
    JOIN user u ON p.seller_id = u.user_id
    WHERE w.user_id = ? AND w.Del_yn = 0
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// 찜 삭제
router.delete("/:id", (req, res) => {
  const userId = req.session.userId;
  const wishlistId = req.params.id;
  if (!userId) return res.status(401).json({ error: "로그인 필요" });

  const sql = `UPDATE wishlist SET Del_yn = 1 WHERE wishlist_id = ? AND user_id = ?`;
  db.query(sql, [wishlistId, userId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "찜 삭제 완료" });
  });
});

module.exports = router;
