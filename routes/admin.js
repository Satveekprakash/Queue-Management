const express = require("express");
const router = express.Router();
const Queue = require("../models/queue");
const ExpressError = require("../utils/ExpressError");
const requireAdmin = require("../middleware/auth");
const wrapAsync = require("../utils/wrapAsync");
const checkAndSendAlerts=require("../services/checkAndSendAlerts");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit=require("express-rate-limit")
const redisClient = require("../config/redis");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

//looger
const logger = require("../config/logger");

//atomic counter
const Counter = require("../models/counter");
const { getNextToken } = require("../services/counterService");
//loginlimiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // only 5 attempts
  message: "Too many login attempts. Try again later.",
});

//admin
router.get("/admin",requireAdmin,wrapAsync( async (req, res) => {
       const nowServing = await Queue.findOne({ status: "waiting" }).sort({ tokenNumber: 1 }).lean();
       let waitingCount = 0;
       if (nowServing) {
           waitingCount = await Queue.countDocuments({
           status: "waiting",
           tokenNumber: { $gt: nowServing.tokenNumber }
        });
}

        const nextTokens = nowServing
          ? await Queue.find({
               status: "waiting",
               tokenNumber: { $gt: nowServing.tokenNumber }
          })
            .sort({ tokenNumber: 1 })
            .limit(3)
            .lean()
            : [];

        res.render("admin", {nowServingToken: nowServing ? nowServing.tokenNumber : null,waitingCount,nextTokens: nextTokens.slice(1)});
}));

//rest queue
router.post("/admin/reset-queue",requireAdmin,async(req,res)=>{
    await Queue.deleteMany({});
    //alert check
    //await checkAndSendAlerts();//blocking
    checkAndSendAlerts().catch(err => {//non blocking(for backgroud task)
      console.error("[ALERT ERROR]", err);
    });
    //invalidate chache
    await redisClient.del("homeData");
    await redisClient.del("patientRangeData");
    //  notify all clients
    const io = req.app.get("io");
    io.emit("queueUpdated");
    //rest counter
      await Counter.findOneAndUpdate(
        { name: "queueToken" },
        { value: 0 }
      );
    res.redirect("/admin");   
});
//serve next
router.post("/serve-next",requireAdmin,wrapAsync(async(req,res)=>{
    const nextPatient=await Queue.findOne({status:"waiting"}).sort({tokenNumber:1});
    if(!nextPatient){
      throw new ExpressError(400,"No patient in queue");
    }
    nextPatient.status="completed";
    await nextPatient.save().catch((err)=>{throw err});
    logger.info(`[QUEUE] Served token ${nextPatient.tokenNumber}`);
    console.log(`[QUEUE] Served token ${nextPatient.tokenNumber}`);//logger
    //call alert
    //await checkAndSendAlerts();//blocking
    checkAndSendAlerts().catch(err => {//non blocking(for backgroud task)
      console.error("[ALERT ERROR]", err);
    });
    //invalidate chache
    await redisClient.del("homeData");
    await redisClient.del("patientRangeData");
    //notify all client 
    const io = req.app.get("io");
    io.emit("queueUpdated");
    res.redirect("/admin")

}));
router.post("/add-patient",requireAdmin,wrapAsync(async (req,res)=>{
    let{mrdNo,patientName}=req.body;
    //validate req.body
    if (!/^\d{4,7}$/.test(String(mrdNo))) {
    throw new ExpressError(400, "Invalid MRD number");
    }
    if (!/^[A-Za-z.\s'-]{2,100}$/.test(String(patientName))) {
    throw new ExpressError(400, "Invalid patient name");
    }

    if (!mrdNo || !patientName) {
      throw new ExpressError(400,"Invalid patient data");
    }
    logger.info(`[QUEUE] Added patient: ${patientName}`);
    console.log(`[QUEUE] Adding patient: ${patientName}`);//looger
    // const lastPatient=await Queue.findOne().sort({tokenNumber:-1}).lean();
    // const nextToken=lastPatient?lastPatient.tokenNumber+1:1;
    const nextToken=await getNextToken();
    const newPatient=new Queue({
        mrdNo,patientName,tokenNumber:nextToken
    });
    await newPatient.save().catch((err)=>{throw err});
    //run alert
    //await checkAndSendAlerts();//blocking
    checkAndSendAlerts().catch(err => {//non blocking(for backgroud task)
      console.error("[ALERT ERROR]", err);
    });
    //invalidate chache
    await redisClient.del("homeData");
    await redisClient.del("patientRangeData");
    //notify all client 
    const io = req.app.get("io");
    io.emit("queueUpdated");
    res.redirect("/admin");
  }))

  //login
router.get("/admin/login", (req, res) => {
  res.render("admin-login");
});
router.post("/admin/login",loginLimiter,async(req,res)=>{
  let{username,password}=req.body;
  logger.info("[AUTH] Admin login attempt");
  console.log("[AUTH] Admin login attempt");//logger
  if(username!==ADMIN_USERNAME){
    console.warn("[AUTH] Invalid admin login attempt");//looger
    throw new ExpressError(401,"Invalid credentials");
  }
   const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

   if(!isMatch){
    console.warn("[AUTH] Invalid admin login attempt");//logger
    throw new ExpressError(401,"Invalid credentials");
  }
  //create jwt
  const token=jwt.sign(
    {role:"admin"},
    process.env.JWT_SECRET,
    {expiresIn:"1h"}
  )

  //store jwt in cookie
  res.cookie("token",token,{
    httpOnly:true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  })
  logger.info("[AUTH] Admin login successful");
  console.log("[AUTH] Admin login successful");//looger
  res.redirect("/admin");
})
router.post("/admin/logout",(req,res)=>{
  res.clearCookie("token");
  logger.info("[AUTH] Admin logout successful");
  console.log("[AUTH] Admin logut successful");//looger
  res.redirect("/admin/login");
})
module.exports=router;