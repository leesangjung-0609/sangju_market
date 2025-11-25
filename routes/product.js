// routes/product.js
const express = require("express");
const router = express.Router();
console.log("✅ Product Router 모듈 로드 및 등록 시작."); 
const db = require("../db/db"); // db 연결 공통 모듈

// 상품 등록
router.post("/add", (req, res) => {
  const userId = req.session.userId; // 로그인 사용자
  if (!userId) return res.status(401).send("로그인 필요");

  const { title, description, price, image_url, category } = req.body;

  if (!title || !price) {
    return res.status(400).send("필수 값이 누락되었습니다.");
  }

  const sql = `
    INSERT INTO product (title, price, description, image_url, category, seller_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [title, price, description || null, image_url || null, category || null, userId],
    (err, result) => {
      if (err) {
        console.error("상품 등록 오류:", err);
        return res.status(500).send("상품 등록 실패");
      }
      res.json({ message: "상품 등록 성공", productId: result.insertId });
    }
  );
});

// 내가 판매중인 상품 조회
router.get("/selling", (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).send("로그인 필요");

  const sql = `
    SELECT * FROM product
    WHERE seller_id = ? AND status = '판매중'
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).send("조회 실패");
    res.json(results);
  });
});

// 전체 판매중 상품 리스트
router.get("/list", (req, res) => {
  const sql = `
    SELECT 
      p.product_id,
      p.title,
      p.price,
      p.image_url,
      p.category,
      u.username AS seller
    FROM product p
    JOIN user u ON p.seller_id = u.user_id
    WHERE p.status = '판매중'
    ORDER BY p.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("상품 조회 오류:", err);
      return res.status(500).send("상품 조회 실패");
    }
    res.json(results);
  });
});
router.get("/category/:category", (req, res) => {
  const category = req.params.category;

  const sql = `
    SELECT 
      p.product_id, p.title, p.price, p.image_url, p.category, 
      u.username AS seller
    FROM product p
    JOIN user u ON p.seller_id = u.user_id
    WHERE p.status = '판매중' AND p.category = ?
    ORDER BY p.created_at DESC
  `;

  db.query(sql, [category], (err, results) => {
    if (err) {
      console.error("카테고리별 상품 조회 오류:", err);
      return res.status(500).send("상품 조회 실패");
    }
    res.json(results);
  });
});
router.get("/:id", (req, res) => {
  const productId = req.params.id;

  const sql = `
    SELECT 
      p.product_id,
      p.title,
      p.price,
      p.description,
      p.image_url,
      p.category,
      u.username
    FROM product p
    JOIN user u ON p.seller_id = u.user_id
    WHERE p.product_id = ?
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) {
      console.error("상품 상세 조회 오류:", err);
      return res.status(500).send("상품 상세 조회 실패");
    }
    if (results.length === 0) return res.status(404).send("상품이 존재하지 않습니다.");

    res.json(results[0]);
  });
});
module.exports = router;
