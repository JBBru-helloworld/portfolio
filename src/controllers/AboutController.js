// src/controllers/AboutController.js
const AboutController = {
  index: (req, res) => {
    try {
      // Clear module cache in development to see data changes immediately
      if (process.env.NODE_ENV === "development") {
        delete require.cache[require.resolve("../models/data")];
      }
      const portfolioData = require("../models/data");

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
