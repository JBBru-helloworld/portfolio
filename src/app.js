// app.js - Main application file
const express = require("express");
const helmet = require("helmet");
const CSRF = require("csrf");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
require("dotenv").config();

const app = express();
const csrf = new CSRF();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// CSRF protection
app.use((req, res, next) => {
  // Generate CSRF token for each request
  if (!req.cookies.csrfSecret) {
    // Generate a new secret if one doesn't exist
    const secret = csrf.secretSync();
    res.cookie("csrfSecret", secret, { httpOnly: true, sameSite: "strict" });
    req.csrfSecret = secret;
  } else {
    req.csrfSecret = req.cookies.csrfSecret;
  }

  // Generate token and make it available to views
  req.csrfToken = () => csrf.create(req.csrfSecret);
  res.locals.csrfToken = req.csrfToken();

  // Verify CSRF token for POST requests
  if (req.method === "POST") {
    const submittedToken = req.body._csrf || req.headers["x-csrf-token"];
    if (!submittedToken || !csrf.verify(req.csrfSecret, submittedToken)) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
  }

  next();
});

// Compression
app.use(compression());

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Static files
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1y",
    etag: false,
  })
);

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  next();
});

// Routes
const routes = require("./routes");
app.use("/", routes);

// Error handling
app.use((err, req, res, next) => {
  console.error("Error details:", err);
  console.error("Stack trace:", err.stack);
  res.status(500).send(`Error: ${err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
