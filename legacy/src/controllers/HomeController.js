// controllers/HomeController.js
class HomeController {
  static async index(req, res) {
    try {
      // Clear module cache in development to see data changes immediately
      if (process.env.NODE_ENV === "development") {
        delete require.cache[require.resolve("../models/data")];
      }
      const portfolioData = require("../models/data");

      res.render("pages/home", {
        title: "Home",
        data: portfolioData,
      });
    } catch (error) {
      console.error("Error in HomeController:", error);
      res.status(500).render("error", { message: "Internal Server Error" });
    }
  }
}

module.exports = HomeController;
