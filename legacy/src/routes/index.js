// routes/index.js
const express = require("express");
const router = express.Router();
const HomeController = require("../controllers/HomeController");
const AboutController = require("../controllers/AboutController");
const WorkController = require("../controllers/WorkController");
const ContactController = require("../controllers/ContactController");

// Home routes
router.get("/", HomeController.index);

// About routes
router.get("/about", AboutController.index);

// Work routes
router.get("/work", WorkController.index);
router.get("/work/:id", WorkController.getProject);

// Contact routes
router.get("/contact", ContactController.index);

module.exports = router;
