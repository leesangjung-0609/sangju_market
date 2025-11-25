const express = require("express");
const app = express();
const path = require("path");
const os = require("os");
const session = require("express-session"); // 세션 모듈


app.use(session({
  secret: "secret_key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use('/uploads', express.static('C:/Users/dohun/myapp/uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const userRouter = require("./routes/user");
const commentRouter = require("./routes/comment");
const productRouter = require("./routes/product");
const reviewRouter = require("./routes/review");
const wishlistRouter = require("./routes/wishlist");

app.use("/product", productRouter);
app.use("/user", userRouter);
app.use("/comment", commentRouter);
app.use("/review", reviewRouter);
app.use("/wishlist", wishlistRouter);


app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

const PORT = 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  const nets = os.networkInterfaces();
  let localIp = "localhost";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
      }
    }
  }
  console.log(`서버 실행됨: http://${localIp}:${PORT}`);
});
