// controllers/HomeController.js
const portfolioData = require("../models/data");

class HomeController {
  static async index(req, res) {
    try {
      res.render("pages/home", {
        title: "Home",
        data: portfolioData,
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error("Error in HomeController:", error);
      res.status(500).render("error", { message: "Internal Server Error" });
    }
  }
}

module.exports = HomeController;
