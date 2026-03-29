 const express = require("express");
 const router = express.Router();
router.get("/help", (req, res) => {
  res.render("help.ejs");
});

router.get("/faq", (req, res) => {
  res.render("faq.ejs");
});
router.get("/about", (req, res) => {
  res.render("about.ejs");
});
module.exports=router;