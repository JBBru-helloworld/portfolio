// src/controllers/AboutController.js
const portfolioData = require("../models/data");

const AboutController = {
  index: (req, res) => {
    try {
      // Render the about page with complete data object
      res.render("pages/about", {
        title: "About",
        data: portfolioData,
      });
    } catch (error) {
      console.error("Error in AboutController:", error);
      res.status(500).render("error", { message: "Internal Server Error" });
    }
  },
};

module.exports = AboutController;
