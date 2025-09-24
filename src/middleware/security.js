// middleware/security.js
const sanitizeHtml = require("sanitize-html");
const xss = require("xss");

// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://cdn.jsdelivr.net",
    ],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
};

// HTTPS enforcement middleware
const httpsRedirect = (req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.header("x-forwarded-proto") !== "https"
  ) {
    res.redirect(`https://${req.header("host")}${req.url}`);
  } else {
    next();
  }
};

// XSS protection middleware
const xssProtection = (req, res, next) => {
  // Sanitize query parameters
  for (const key in req.query) {
    req.query[key] = xss(req.query[key]);
  }

  // Sanitize body parameters
  if (req.body) {
    for (const key in req.body) {
      req.body[key] = sanitizeHtml(req.body[key], {
        allowedTags: [],
        allowedAttributes: {},
      });
    }
  }

  next();
};

module.exports = { cspConfig, xssProtection, httpsRedirect };
