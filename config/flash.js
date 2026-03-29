const session = require("express-session");
const flash = require("connect-flash");

// session config
const sessionOptions = session({
  secret: "mysupersecret",
  resave: false,
  saveUninitialized: true,
});

// flash locals middleware
const flashMiddleware = (req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
};

module.exports = {
  sessionOptions,
  flash,
  flashMiddleware,
};