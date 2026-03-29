const express = require("express");
const router = express.Router();
const Queue = require("../models/queue");
const ExpressError = require("../utils/ExpressError");
const wrapAsync = require("../utils/wrapAsync");
const  calculateExpectedTime= require("../utils/timeCalculation");
const redisClient = require("../config/redis");

router.get("/patient", wrapAsync(async(req, res) => {
      //redis store
      const cachedData = await redisClient.get("patientRangeData");
       if (cachedData) {
          console.log("[CACHE] Serving patient range from Redis");
          return res.render("patient-status.ejs", JSON.parse(cachedData));
        }
        //parallel call
      const [firstPatient, lastPatient] = await Promise.all([
        Queue.findOne({ status: "waiting" }).sort({ tokenNumber: 1 }).lean(),
        Queue.findOne({ status: "waiting" }).sort({ tokenNumber: -1 }).lean(),
      ]);

      
       if (!firstPatient || !lastPatient) {
          return res.render("patient-status.ejs",{ min: 0,max: 0 });}
       const min=firstPatient.tokenNumber;
       const max=lastPatient.tokenNumber; 
       const data={min,max}
       await redisClient.setEx("patientRangeData", 30, JSON.stringify(data));
       res.render("patient-status.ejs",{min,max});
}));


router.post("/patient-status",wrapAsync( async (req, res) => {
       //const token = parseInt(req.body.token);
          const rawToken = req.body.token;

         // Strict validation-i learn it 
        if (!/^\d+$/.test(String(rawToken))) {
        throw new ExpressError(400, "Invalid token number");
        }

         const token = Number(rawToken);

        if (!Number.isInteger(token) || token <= 0 || token > 10000) {
        throw new ExpressError(400, "Invalid token number");
        }
       const currentPatient=await Queue.findOne({tokenNumber:token,status: "waiting"});
     if (!currentPatient) {
        throw new ExpressError(400,"Please enter correct token");
    }
     const firstPatient=await Queue.findOne( {status: "waiting" }).sort({tokenNumber:1}); 

     if(!firstPatient){
         throw new ExpressError(404, "No active queue found");
     }

     const patientsAhead = await Queue.countDocuments({
     status: "waiting",
     tokenNumber: { $lt: currentPatient.tokenNumber },
     });
     const time=(calculateExpectedTime(Number(patientsAhead)));
     const t=patientsAhead*15;
     


     res.render("patient-result", {
      currentPatient:currentPatient.patientName,
      token,
      nowServing: firstPatient.tokenNumber,
      patientsAhead: patientsAhead,
      estimatedTime: time,
      t

    });
    
 }))




module.exports=router;