const express = require("express");
const router = express.Router();
const Queue = require("../models/queue");
const Alert=require("../models/alert");
const ExpressError = require("../utils/ExpressError");
const wrapAsync = require("../utils/wrapAsync");
const rateLimit=require("express-rate-limit");

//alertslimit
const alertLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10, // max 10 alerts per 10 min
  message: "Too many alert requests. Try later.",
});

router.get("/alerts", (req, res) => {
  res.render("alert.ejs");
});

router.post("/alerts",alertLimiter,async(req,res)=>{
   try{
      const{tokenNumber,mobileNumber}=req.body;

      //validate token number and mobile(itsvlaue,type)
       const rawToken = String(tokenNumber).trim();

        if (!/^\d+$/.test(rawToken)) {
        req.flash("error", "Invalid token number");
        return res.redirect("/alerts");
        }

        const token = Number(rawToken);

        if (!Number.isInteger(token) || token <= 0 || token > 10000) {
        req.flash("error", "Invalid token number range");
        return res.redirect("/alerts");
        }

        const rawMobile = String(mobileNumber).trim();

        const cleanedMobile = rawMobile.startsWith("+91")
        ? rawMobile.slice(3)
        : rawMobile;

        if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
        req.flash("error", "Invalid mobile number");
        return res.redirect("/alerts");
        }

        const formattedNumber = `+91${cleanedMobile}`;


      if(!tokenNumber ||!mobileNumber){
        req.flash("error","token number and mobile number is required.");
        return res.redirect("/alerts");
       // return res.status(400).send("token number and mobile number is required");
      }

      //check patient
      const patient=await Queue.findOne({
        tokenNumber:Number(tokenNumber),
        status:"waiting"
      }).lean()
      if(!patient){
        req.flash("error","No active waiting patient found for this token.");
        return res.redirect("/home");
        //return res.status(404).send("No active waiting patient found for this token.");
      }

      //check duplicate
      const existingAlert=await Alert.findOne({
            tokenNumber:Number(tokenNumber),
            isActive:true
        }).lean()
        //console.log(existingAlert)
      if(existingAlert){
        req.flash("success","Alert is already enabled for this token.");
        return res.redirect("/home");
        // return res.status(409).send("Alert is already enabled for this token.");
      }
      //save
      await Alert.create({
        tokenNumber:tokenNumber,
        mobileNumber:formattedNumber,
        isActive:true
      })
      console.log(`[ALERT] Creating alert for token ${token}`);//looger
      req.flash("success","Alert subscription is done. You will get messages at regular intervals.");
      return res.redirect("/home");
      //return res.status(201).send("Alert subscription is done. You will get messages at regular intervals.");

   }catch(e){
     console.log(e)
     throw new ExpressError(500,"Something went wrong in alert.");
    
   }

})
module.exports=router;