const jwt = require("jsonwebtoken");
const requireAdmin=(req,res,next)=>{
  const token=req.cookies.token;
  if(!token){
    return res.redirect("/admin/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      res.clearCookie("token");//clear invalid cookies
      return res.redirect("/admin/login");
    }
    req.admin = decoded; // attach admin info to request
    next(); // allow request
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/admin/login");
  }
}
module.exports=requireAdmin;