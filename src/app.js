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
const crypto = require("crypto");
const { httpsRedirect } = require("./middleware/security");
require("dotenv").config();

const app = express();
const csrf = new CSRF();

// CSRF Cookie Encryption
// Environment variable CSRF_COOKIE_KEY should be a 32-byte hex string
// Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
const CSRF_COOKIE_KEY = process.env.CSRF_COOKIE_KEY;
if (!CSRF_COOKIE_KEY) {
  console.warn(
    "Warning: CSRF_COOKIE_KEY environment variable not set. Using default key for development only."
  );
}
const encryptionKey = CSRF_COOKIE_KEY
  ? Buffer.from(CSRF_COOKIE_KEY, "hex")
  : crypto.randomBytes(32);

// Utility functions for CSRF secret encryption/decryption
function encryptCsrfSecret(secret) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher("aes-256-cbc", encryptionKey);
    let encrypted = cipher.update(secret, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Error encrypting CSRF secret:", error);
    throw error;
  }
}

function decryptCsrfSecret(encryptedValue) {
  try {
    const parts = encryptedValue.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted format");
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipher("aes-256-cbc", encryptionKey);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Error decrypting CSRF secret:", error);
    // Return null to indicate decryption failure - will trigger regeneration
    return null;
  }
}

// HTTPS enforcement (must be first)
app.use(httpsRedirect);

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

// CSRF protection with encrypted cookies
app.use((req, res, next) => {
  let secret = null;

  // Try to decrypt existing CSRF secret from cookie
  if (req.cookies.csrfSecret) {
    secret = decryptCsrfSecret(req.cookies.csrfSecret);
  }

  // Generate new secret if decryption failed or no cookie exists
  if (!secret) {
    secret = csrf.secretSync();
    try {
      const encryptedSecret = encryptCsrfSecret(secret);
      res.cookie("csrfSecret", encryptedSecret, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      });
    } catch (error) {
      console.error("Failed to encrypt CSRF secret:", error);
      // Fallback: continue with unencrypted secret for this request
      res.cookie("csrfSecret", secret, { httpOnly: true, sameSite: "strict" });
    }
  }

  req.csrfSecret = secret;

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
