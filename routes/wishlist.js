const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 찜 추가
router.post("/add", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;
  const { productId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  // 이미 찜했는지 확인
  const checkSql = `
    SELECT *
    FROM wishlist
    WHERE user_id = ? AND product_id = ? AND Del_yn = 0
  `;

  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    if (results.length > 0) {
      return res.json({ message: "이미 찜한 상품입니다." });
    }

    // 찜 추가
    const insertSql = `
      INSERT INTO wishlist (user_id, product_id)
      VALUES (?, ?)
    `;

    db.query(insertSql, [userId, productId], (err2) => {
      if (err2) {
        return res.status(500).json({ error: err2 });
      }
      res.json({ message: "찜 추가 완료" });
    });
  });
});

// 찜 목록 조회
router.get("/list", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;

  if (!userId) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  const sql = `
    SELECT
      w.wishlist_id,
      p.product_id,
      p.title,
      p.price,
      p.image_url,
      u.username AS seller_name
    FROM wishlist w
    JOIN product p ON w.product_id = p.product_id
    JOIN user u ON p.seller_id = u.user_id
    WHERE w.user_id = ? AND w.Del_yn = 0
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

// 찜 삭제
router.delete("/remove/:wishlistId", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;
  // ⭐⭐ 수정: URL 파라미터에서 wishlistId를 가져옵니다.
  const wishlistId = req.params.wishlistId;

  if (!userId) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  const sql = `
    UPDATE wishlist
    SET Del_yn = 1
    -- ⭐⭐ 수정: product_id 대신 wishlist_id를 기준으로 삭제합니다.
    WHERE wishlist_id = ? AND user_id = ? AND Del_yn = 0
  `;

  // ⭐⭐ 수정: 쿼리에 wishlistId를 전달합니다.
  db.query(sql, [wishlistId, userId], (err, result) => {
    if (err) {
      console.error("찜 삭제 DB 오류:", err);
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "찜 목록에서 찾을 수 없거나 이미 삭제되었습니다.",
      });
    }

    res.json({ success: true, message: "찜 삭제 완료" });
  });
});


// 찜 여부 확인
router.get("/check/:productId", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;
  const productId = req.params.productId;

  if (!userId) {
    return res.json({ isWished: false });
  }

  const checkSql = `
    SELECT *
    FROM wishlist
    WHERE user_id = ? AND product_id = ? AND Del_yn = 0
  `;

  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) {
      console.error("찜 상태 확인 DB 오류:", err);
      return res.status(500).json({ error: "DB 오류" });
    }

    res.json({ isWished: results.length > 0 });
  });
});

module.exports = router;
