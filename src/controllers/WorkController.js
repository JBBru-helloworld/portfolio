// controllers/WorkController.js
const portfolioData = require("../models/data");

class WorkController {
  static async index(req, res) {
    try {
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
