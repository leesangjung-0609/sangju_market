const express=require("express");
const router=express.Router();
const multer=require("multer");
const path=require("path");
const db=require("../db/db");
const fs=require('fs');

console.log("Product Router Ready");
const UPLOAD_DIR=path.join(__dirname,'..','uploads');
if(!fs.existsSync(UPLOAD_DIR)){console.log(`create uploads folder at ${UPLOAD_DIR}`);fs.mkdirSync(UPLOAD_DIR);}

const storage=multer.diskStorage({
destination:(req,file,cb)=>cb(null,UPLOAD_DIR),
filename:(req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
});
const upload=multer({storage});

// 상품 등록
router.post("/add",(req,res,next)=>{
upload.single("productImage")(req,res,(err)=>{
if(err instanceof multer.MulterError){console.error("Multer error:",err.message);return res.status(500).json({message:`Multer 오류:${err.message}`});}
else if(err){console.error("Upload fatal error:",err.message);return res.status(500).json({message:`파일 업로드 오류:${err.message}`});}

const userId=req.session.user?req.session.user.user_id:null;
if(!userId)return res.status(401).send("로그인 필요");

const{title,description,price,category}=req.body;
const image_url=req.file?`/uploads/${req.file.filename}`:null;
if(req.file)console.error("Multer OK:",req.file.filename);
if(!title||!price)return res.status(400).send("필수 값 누락");

const sql=`INSERT INTO product (title,price,description,image_url,category,seller_id,status) VALUES (?,?,?,?,?,?,'판매중')`;
db.query(sql,[title,price,description||null,image_url,category||null,userId],(err,result)=>{
if(err){console.error("등록 오류:",err);return res.status(500).send("상품 등록 실패");}
res.json({message:"상품 등록 성공",productId:result.insertId});
});
});
});

// 상품 수정
router.put("/update",(req,res)=>{
upload.single("productImage")(req,res,(err)=>{
if(err instanceof multer.MulterError){console.error("Multer error:",err.message);return res.status(500).json({message:`Multer 오류:${err.message}`});}
else if(err){console.error("Upload error:",err.message);return res.status(500).json({message:`파일 업로드 오류:${err.message}`});}

const userId=req.session.user?req.session.user.user_id:null;
if(!userId)return res.status(401).send("로그인 필요");

const{product_id,title,description,price,category,status,currentImageUrl}=req.body;
if(!product_id||!title||!price||!status)return res.status(400).send("필수 값 누락");

let newImageUrl=req.file?`/uploads/${req.file.filename}`:currentImageUrl||null;
if(req.file)console.error("새 이미지 저장:",req.file.filename);

const sql=`UPDATE product SET title=?,price=?,description=?,image_url=?,category=?,status=? WHERE product_id=? AND seller_id=?`;
const params=[title,price,description||null,newImageUrl,category||null,status,product_id,userId];

db.query(sql,params,(err,result)=>{
if(err){console.error("수정 오류:",err);return res.status(500).send("상품 수정 실패");}
if(result.affectedRows===0)return res.status(403).json({success:false,message:"권한 없음 또는 상품 없음"});
res.json({success:true,message:"상품 수정 성공"});
});
});
});

// 내가 판매중인 상품 조회
router.get("/selling",(req,res)=>{
const userId=req.session.user?req.session.user.user_id:null;
if(!userId)return res.status(401).send("로그인 필요");

db.query(`SELECT * FROM product WHERE seller_id=? AND status='판매중' ORDER BY created_at DESC`,[userId],(err,results)=>{
if(err)return res.status(500).send("조회 실패");
res.json(results);
});
});

// 전체 판매중 상품 조회
router.get("/list",(req,res)=>{
const sql=`SELECT p.product_id,p.title,p.price,p.image_url,p.category,u.username AS seller FROM product p JOIN user u ON p.seller_id=u.user_id WHERE p.status='판매중' ORDER BY p.created_at DESC`;
db.query(sql,(err,results)=>{
if(err){console.error("조회 오류:",err);return res.status(500).send("상품 조회 실패");}
res.json(results);
});
});

// 카테고리별 조회
router.get("/category/:category",(req,res)=>{
const category=req.params.category;
const sql=`SELECT p.product_id,p.title,p.price,p.image_url,p.category,u.username AS seller FROM product p JOIN user u ON p.seller_id=u.user_id WHERE p.status='판매중' AND p.category=? ORDER BY p.created_at DESC`;
db.query(sql,[category],(err,results)=>{
if(err){console.error("카테고리 조회 오류:",err);return res.status(500).send("상품 조회 실패");}
res.json(results);
});
});

// 판매자 상품 조회
router.get("/seller/:sellerId",(req,res)=>{
const sellerId=req.params.sellerId;
db.query(`SELECT product_id,title,price,image_url,created_at FROM product WHERE seller_id=? AND status='판매중' ORDER BY created_at DESC`,[sellerId],(err,results)=>{
if(err)return res.status(500).send("판매자 상품 조회 실패");
res.json(results);
});
});

// 상품 상세 조회
router.get("/:id",(req,res)=>{
const productId=req.params.id;
const sql=`SELECT p.product_id,p.title,p.price,p.description,p.image_url,p.category,p.status,u.username,p.seller_id FROM product p JOIN user u ON p.seller_id=u.user_id WHERE p.product_id=?`;
db.query(sql,[productId],(err,results)=>{
if(err){console.error("상세 오류:",err);return res.status(500).send("상품 상세 조회 실패");}
if(results.length===0)return res.status(404).send("상품 없음");
res.json(results[0]);
});
});

module.exports=router;
