// src/controllers/ContactController.js
const data = require("../models/data");

const ContactController = {
  index: (req, res) => {
    const { socialLinks } = data.personal;

    res.render("pages/contact", {
      title: "Contact",
      socialLinks: {
        linkedin: socialLinks.linkedin,
        github: socialLinks.github,
        instagram: socialLinks.instagram,
      },
      csrfToken: req.csrfToken(), // For form security
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

      // For now, just log the submission and send a success response
      console.log("Contact form submission:", {
        name,
        email,
        subject,
        message,
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
