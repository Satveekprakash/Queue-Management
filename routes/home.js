const express = require("express");
const router = express.Router();
const Queue = require("../models/queue");
const ExpressError = require("../utils/ExpressError");
const wrapAsync = require("../utils/wrapAsync");
const redisClient = require("../config/redis");//redis so it come fast

router.get("/", (req, res) => {
  res.redirect("/home");
});
router.get("/home", wrapAsync(async (req, res) => {
    //redis use
     const cachedData = await redisClient.get("homeData");
      if (cachedData) {
        console.log("[CACHE] Serving from Redis");
        return res.render("home.ejs", JSON.parse(cachedData));
      }
    //this is parralle calling in data base so spped increase
    const [nowServing, waitingCount] = await Promise.all([
       Queue.findOne({ status: "waiting" }).sort({ tokenNumber: 1 }).lean(),
       Queue.countDocuments({ status: "waiting" }),
       ]);

       const data={
          nowServingToken: nowServing ? nowServing.tokenNumber : "—",
          waitingCount,
          avgTime: 15,
        }
        //store redis for 30 sec
        await redisClient.setEx("homeData", 30, JSON.stringify(data));

        res.render("home.ejs",data);
    }));
    module.exports=router;