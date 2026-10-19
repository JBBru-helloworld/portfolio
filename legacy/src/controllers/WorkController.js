// controllers/WorkController.js
class WorkController {
  static async index(req, res) {
    try {
      // Clear module cache in development to see data changes immediately
      if (process.env.NODE_ENV === "development") {
        delete require.cache[require.resolve("../models/data")];
      }
      const portfolioData = require("../models/data");

      res.render("pages/work", {
        title: "Work",
        data: portfolioData,
      });
    } catch (error) {
      console.error("Error in WorkController:", error);
      res.status(500).render("error", { message: "Internal Server Error" });
    }
  }

  static async getProject(req, res) {
    try {
      // Clear module cache in development to see data changes immediately
      if (process.env.NODE_ENV === "development") {
        delete require.cache[require.resolve("../models/data")];
      }
      const portfolioData = require("../models/data");

      const projectId = parseInt(req.params.id);
      const project = portfolioData.projects.find((p) => p.id === projectId);

      if (!project) {
        return res
          .status(404)
          .render("error", { message: "Project not found" });
      }

      res.render("pages/project-detail", {
        title: project.title,
        project,
        data: portfolioData,
      });
    } catch (error) {
      console.error("Error in WorkController:", error);
      res.status(500).render("error", { message: "Internal Server Error" });
    }
  }
}

module.exports = WorkController;
