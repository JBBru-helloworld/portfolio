// app.js - Main application file
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const { httpsRedirect } = require("./middleware/security");
require("dotenv").config();

const app = express();

// HTTPS enforcement (must be first)
app.use(httpsRedirect);

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
    methods: ["GET"],
    credentials: false,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser middleware (minimal for static portfolio)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

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
