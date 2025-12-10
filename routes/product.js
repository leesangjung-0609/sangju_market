const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../db/db");
const fs = require('fs');

console.log("Product Router Ready");
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) { console.log(`create uploads folder at ${UPLOAD_DIR}`); fs.mkdirSync(UPLOAD_DIR); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 상품 등록
router.post("/add", (req, res, next) => {
    upload.single("productImage")(req, res, (err) => {
        if (err instanceof multer.MulterError) { console.error("Multer error:", err.message); return res.status(500).json({ message: `Multer 오류:${err.message}` }); }
        else if (err) { console.error("Upload fatal error:", err.message); return res.status(500).json({ message: `파일 업로드 오류:${err.message}` }); }

        const userId = req.session.user ? req.session.user.user_id : null;
        if (!userId) return res.status(401).send("로그인 필요");

        const { title, description, price, category } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        if (req.file) console.error("Multer OK:", req.file.filename);
        if (!title || !price) return res.status(400).send("필수 값 누락");

        const sql = `INSERT INTO product (title,price,description,image_url,category,seller_id,status) VALUES (?,?,?,?,?,?,'판매중')`;
        db.query(sql, [title, price, description || null, image_url, category || null, userId], (err, result) => {
            if (err) { console.error("등록 오류:", err); return res.status(500).send("상품 등록 실패"); }
            res.json({ message: "상품 등록 성공", productId: result.insertId });
        });
    });
});

// 상품 수정
router.put("/update", (req, res) => {
    upload.single("productImage")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error("Multer error:", err.message);
            return res.status(500).json({ message: `Multer 오류: ${err.message}` });
        } else if (err) {
            console.error("Upload error:", err.message);
            return res.status(500).json({ message: `파일 업로드 오류: ${err.message}` });
        }

        const userId = req.session.user ? req.session.user.user_id : null;
        if (!userId) return res.status(401).send("로그인 필요");

        const { product_id, title, description, price, category, status, currentImageUrl } = req.body;

        // 필수 값 체크
        if (!product_id || !title || !price || !status) return res.status(400).send("필수 값 누락");

        // 1. 기본 쿼리문 준비 (이미지 제외)
        let sql = `UPDATE product SET title=?, price=?, description=?, category=?, status=?`;
        let params = [title, price, description || null, category || null, status];

        // 2. 이미지가 변경되었거나, 명시적으로 기존 URL이 넘어온 경우에만 쿼리에 이미지 추가
        if (req.file) {
            // 새 파일이 업로드된 경우
            sql += `, image_url=?`;
            params.push(`/uploads/${req.file.filename}`);
            console.error("새 이미지 저장:", req.file.filename);
        } else if (currentImageUrl) {
            // 새 파일은 없지만, 프론트에서 기존 이미지 URL을 보존하라고 보낸 경우
            sql += `, image_url=?`;
            params.push(currentImageUrl);
        }
        // 위 두 경우가 아니면 image_url 컬럼을 건드리지 않음 (DB 값 유지)

        // 3. WHERE 절 추가
        sql += ` WHERE product_id=? AND seller_id=?`;
        params.push(product_id, userId);

        db.query(sql, params, (err, result) => {
            if (err) {
                console.error("수정 오류:", err);
                return res.status(500).send("상품 수정 실패");
            }
            if (result.affectedRows === 0) return res.status(403).json({ success: false, message: "권한 없음 또는 상품 없음" });
            res.json({ success: true, message: "상품 수정 성공" });
        });
    });
});

// 내 상품 조회 (전체상태 모두)
router.get("/selling", (req, res) => {
    const userId = req.session.user ? req.session.user.user_id : null;
    if (!userId) return res.status(401).send("로그인 필요");

    db.query(`SELECT * FROM product WHERE seller_id=? ORDER BY created_at DESC`, [userId], (err, results) => {
        if (err) return res.status(500).send("조회 실패");
        res.json(results);
    });
});

// 판매중인 내 상품 조회
router.get("/selling/active", (req, res) => {
    const userId = req.session.user ? req.session.user.user_id : null;
    if (!userId) return res.status(401).send("로그인 필요");

    // status가 정확히 '판매중'인 것만 조회하는 조건 추가
    const sql = `SELECT * FROM product WHERE seller_id=? AND status='판매중' ORDER BY created_at DESC`;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).send("조회 실패");
        res.json(results);
    });
});

// 전체 판매/예약중 상품 조회
router.get("/list", (req, res) => {
    const sql = `SELECT p.product_id,p.title,p.price,p.image_url,p.category,u.username AS seller FROM product p JOIN user u ON p.seller_id=u.user_id WHERE p.status IN ('판매중', '예약중') ORDER BY p.created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) { console.error("조회 오류:", err); return res.status(500).send("상품 조회 실패"); }
        res.json(results);
    });
});
router.put("/mark_sold/:productId", (req, res) => {
    // 1. 로그인 상태 및 판매자 확인
    const sellerId = req.session.user ? req.session.user.user_id : null;
    if (!sellerId) return res.status(401).json({ success: false, message: "로그인 필요" });

    const productId = req.params.productId;
    const { buyer_nickname } = req.body; // 프론트엔드(prompt)에서 넘어온 구매자 닉네임

    if (!buyer_nickname) return res.status(400).json({ success: false, message: "구매자 닉네임을 입력해야 합니다." });

    // 2. 닉네임으로 구매자 ID 조회 (user 테이블의 name 컬럼 사용)
    // 💡 수정됨: username 대신 name(닉네임) 컬럼으로 조회하도록 수정
    const findBuyerSql = `SELECT user_id FROM user WHERE username = ?`;

    db.query(findBuyerSql, [buyer_nickname], (err, buyerResults) => {
        if (err) {
            console.error("구매자 조회 오류:", err);
            return res.status(500).json({ success: false, message: "서버 오류 (구매자 조회 실패)" });
        }

        if (buyerResults.length === 0) {
            return res.status(404).json({ success: false, message: `구매자 닉네임 [${buyer_nickname}]을 찾을 수 없습니다.` });
        }
        const buyerId = buyerResults[0].user_id;

        // 3. 상품 상태를 '판매완료'로 업데이트하고, 구매자 ID 저장
        // (seller_id를 조건에 넣어 권한 확인 및 판매중인 상품만 업데이트)
        const updateProductSql = `
    UPDATE product 
    SET status = '판매완료', buyer_id = ? 
    WHERE product_id = ? AND seller_id = ? AND status IN ('판매중', '예약중')`;
        db.query(updateProductSql, [buyerId, productId, sellerId], (err, result) => {
            if (err) {
                console.error("판매완료 업데이트 오류:", err);
                return res.status(500).json({ success: false, message: "판매완료 처리 실패 (DB 업데이트 오류)" });
            }
            if (result.affectedRows === 0) {
                // 권한 없거나(sellerId 불일치), 상품 없거나, 이미 판매완료 상태인 경우
                return res.status(400).json({ success: false, message: "상품 정보, 권한, 또는 상태 확인 필요" });
            }

            res.json({ success: true, message: "판매완료 처리 및 내역 기록 성공" });
        });
    });
});

// --------------------------------------------------
// 10. 판매 내역 조회 (판매자 시점) - '/product/sold'
// --------------------------------------------------
router.get("/sold", (req, res) => {
    const userId = req.session.user ? req.session.user.user_id : null;
    if (!userId) return res.status(401).send("로그인 필요");

    const sql = `
        SELECT 
            p.product_id, p.title, p.price, p.image_url, p.status,
            p.created_at AS date,
            u.username AS buyer_name 
        FROM product p
        JOIN user u ON p.buyer_id = u.user_id
        WHERE p.seller_id = ? AND p.status = '판매완료'
        ORDER BY p.created_at DESC
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) { console.error("판매 내역 조회 실패:", err); return res.status(500).send("판매 내역 조회 실패"); }
        res.json(results);
    });
});

// --------------------------------------------------
// 11. 구매 내역 조회 (구매자 시점) - '/product/bought'
// --------------------------------------------------
router.get("/bought", (req, res) => {
    const userId = req.session.user ? req.session.user.user_id : null;
    if (!userId) return res.status(401).send("로그인 필요");

    const sql = `
        SELECT 
            p.product_id, p.title, p.price, p.image_url, p.status,
            p.created_at AS date, 
            u.username AS seller_name
        FROM product p
        JOIN user u ON p.seller_id = u.user_id
        WHERE p.buyer_id = ? AND p.status = '판매완료'
        ORDER BY p.created_at DESC
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) { console.error("구매 내역 조회 실패:", err); return res.status(500).send("구매 내역 조회 실패"); }
        res.json(results);
    });
});
// 카테고리별 조회
router.get("/category/:category", (req, res) => {
    const category = req.params.category;
    const sql = `SELECT p.product_id,p.title,p.price,p.image_url,p.category,u.username AS seller FROM product p JOIN user u ON p.seller_id=u.user_id WHERE p.status IN ('판매중', '예약중') AND p.category=? ORDER BY p.created_at DESC`;
    db.query(sql, [category], (err, results) => {
        if (err) { console.error("카테고리 조회 오류:", err); return res.status(500).send("상품 조회 실패"); }
        res.json(results);
    });
});

// 판매자 상품 조회
router.get("/seller/:sellerId", (req, res) => {
    const sellerId = req.params.sellerId;
    db.query(`SELECT product_id,title,price,image_url,created_at FROM product WHERE seller_id=? AND status IN ('판매중', '예약중') ORDER BY created_at DESC`, [sellerId], (err, results) => {
        if (err) return res.status(500).send("판매자 상품 조회 실패");
        res.json(results);
    });
});

// 상품 상세 조회
router.get("/:id", (req, res) => {
    const productId = req.params.id;
    const sql = `SELECT p.product_id,p.title,p.price,p.description,p.image_url,p.category,p.status,u.username,p.seller_id FROM product p JOIN user u ON p.seller_id=u.user_id WHERE p.product_id=?`;
    db.query(sql, [productId], (err, results) => {
        if (err) { console.error("상세 오류:", err); return res.status(500).send("상품 상세 조회 실패"); }
        if (results.length === 0) return res.status(404).send("상품 없음");
        res.json(results[0]);
    });
});

// 상품 판매 완료 처리 (구매자 ID 기록)


module.exports = router;