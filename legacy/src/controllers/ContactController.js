// src/controllers/ContactController.js
const portfolioData = require("../models/data");

const ContactController = {
  index: (req, res) => {
    res.render("pages/contact", {
      title: "Contact",
      data: portfolioData,
    });
  },
};

module.exports = ContactController;
