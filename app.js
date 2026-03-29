const express=require("express");
const app=express();

const dotenv=require("dotenv");
dotenv.config();

const cors=require("cors");
app.use(cors());

const path=require('path');
const port=process.env.PORT ||3000;

const helmet = require("helmet");
app.use(helmet({contentSecurityPolicy: false,}));

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"/views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true,limit:"10kb" }));
//looger
const logger = require("./config/logger");
//add global rate limiter
const rateLimit=require("express-rate-limit");
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max requests per IP
  message: "Too many requests, please try again later.",
});

app.set("trust proxy", 1);//order important
app.use(globalLimiter);

//add more security to mongo so it block $ne,$gt
//const mongoSanitize = require("express-mongo-sanitize");
//app.use(mongoSanitize());

//for flash 
const { sessionOptions, flash, flashMiddleware } = require("./config/flash");
app.use(sessionOptions);   // session first
app.use(flash());          // then flash
app.use(flashMiddleware);  

//routes
const adminRoutes=require("./routes/admin");
const helpRoutes=require("./routes/help");
const homeRoutes=require("./routes/home");
const patientRoutes=require("./routes/patient");
const aiRoutes = require("./routes/ai");
const alerts=require("./routes/alert")

//mongoose
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
main()
.then(()=>{
  logger.info("[DB] Connected to database");
  console.log("[DB]connected to datbase")
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
 
}
//jwt and cookies
const jwt=require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { error } = require("console");
app.use(cookieParser());
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

//socket.io
 const http = require("http");
 const server = http.createServer(app);
 const { Server } = require("socket.io");
 const io = new Server(server,{//this is used for deployment
  cors:{
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  }
 });
 app.set("io", io);
 server.listen(port, () => {
  console.log("[SERVER] Server running with Socket.io");
  logger.info(`[SERVER] Running on port ${port}`);
});
 io.on("connection",(socket)=>{
  console.log("User connected:",socket.id);
  socket.on("disconnect",()=>{
    console.log("User disconnected",socket.id);
  })
 })

//----------routes--------------------/
app.use("/",helpRoutes);
app.use("/",homeRoutes);
app.use("/",patientRoutes);
app.use("/",adminRoutes);
app.use("/", aiRoutes);
app.use("/",alerts)

//middlewere
app.use((err,req,res,next)=>{
  const statusCode=err.status || 500;
  const message=err.message||"something went wrong"
   logger.error(`[ERROR] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
   console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);//logger

  res.status(statusCode).render("error.ejs", { statusCode, message });
}) 



//testing

//1// const sendSMS = require("./services/sendSMS");
// sendSMS("9060315173", "Test SMS from Queue Alert System");


//2//to check the password of bcryptjs
// const password = "rahul123";
// bcrypt.hash(password, 10).then(hash => {
//   console.log("New hash:", hash);
// });

