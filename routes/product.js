const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../db/db"); // db 연결
const fs = require('fs');

console.log("✅ Product Router 모듈 로드 및 등록 시작.");
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// 💡 uploads 폴더가 없으면 생성 (안전성 강화)
if (!fs.existsSync(UPLOAD_DIR)) {
    console.log(`ℹ️ uploads 폴더가 없어 ${UPLOAD_DIR}에 폴더를 생성합니다.`);
    fs.mkdirSync(UPLOAD_DIR);
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // UPLOAD_DIR은 path.join()을 통해 절대 경로로 변환된 상태로 전달됨
    cb(null, UPLOAD_DIR); 
  }, 
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 상품 등록 (이미지 포함)
router.post("/add", (req, res, next) => {
    // Multer 미들웨어 실행
    upload.single("productImage")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error("❌ Multer 오류 발생:", err.message);
            return res.status(500).json({ message: `Multer 파일 업로드 오류: ${err.message}` });
        } else if (err) {
            // 다른 종류의 오류 (주로 권한 문제)
            console.error("❌ 치명적인 파일 업로드 오류 (권한 문제 가능성 높음):", err.message);
            return res.status(500).json({ message: `파일 업로드 오류: ${err.message}` });
        }
        
        // Multer 성공 시 (req.file이 생성됨)
        const userId = req.session.user ? req.session.user.user_id : null;
        if (!userId) return res.status(401).send("로그인 필요");

        const { title, description, price, category } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        
        // 콘솔에 반드시 출력되도록 성공 로그 추가
        if (req.file) {
            console.error("🎉 Multer 성공: 파일이 저장되었습니다. 파일명:", req.file.filename); 
        }

        if (!title || !price) return res.status(400).send("필수 값이 누락되었습니다.");

        // ... 이하 DB 쿼리 코드는 동일 ...
        const sql = `
            INSERT INTO product (title, price, description, image_url, category, seller_id, status)
VALUES (?, ?, ?, ?, ?, ?, '판매중')
        `;
        
        db.query(sql, [title, price, description || null, image_url, category || null, userId], (err, result) => {
            if (err) {
                console.error("상품 등록 오류:", err);
                return res.status(500).send("상품 등록 실패");
            }
            res.json({ message: "상품 등록 성공", productId: result.insertId });
        });
    });
});
// 이하 기존 조회 API 그대로 유지
// 내가 판매중인 상품 조회
router.get("/selling", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null; 
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

// 카테고리별 조회
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
router.get("/seller/:sellerId", (req, res) => {
  const sellerId = req.params.sellerId;

  const sql = `
    SELECT product_id, title, price, image_url, created_at
    FROM product
    WHERE seller_id = ? AND status = '판매중'
    ORDER BY created_at DESC
  `;

  db.query(sql, [sellerId], (err, results) => {
    if (err) return res.status(500).send("판매자 상품 조회 실패");
    res.json(results);
  });
});
// 상품 상세 조회
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
