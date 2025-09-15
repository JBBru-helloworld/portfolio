// src/controllers/ContactController.js
const portfolioData = require("../models/data");

const ContactController = {
  index: (req, res) => {
    res.render("pages/contact", {
      title: "Contact",
      data: portfolioData,
    });
  },

  submit: async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      // Validate form data
      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: "Please fill in all required fields",
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      // For now, just log the submission and send a success response
      console.log("Contact form submission:", {
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Thank you for your message! I will get back to you soon.",
      });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({
        success: false,
        message:
          "Sorry, there was an error sending your message. Please try again later.",
      });
    }
  },
};

module.exports = ContactController;
