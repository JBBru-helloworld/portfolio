// src/controllers/AboutController.js
const dataModel = require("../models/data");

const AboutController = {
  index: (req, res) => {
    try {
      // Make sure dataModel exists and has the required properties
      const socialLinks = dataModel?.socialLinks || {};
      const skills = dataModel?.skills || [];
      const experience = dataModel?.experience || [];
      const education = dataModel?.education || [];

      // Render the about page with data
      res.render("pages/about", {
        title: "About",
        socialLinks,
        skills,
        experience,
        education,
      });
    } catch (error) {
      console.error("Error in AboutController:", error);
      res.status(500).send("Internal Server Error");
    }
  },
};

module.exports = AboutController;
