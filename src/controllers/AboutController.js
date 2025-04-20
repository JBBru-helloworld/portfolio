// src/controllers/AboutController.js
const dataModel = require("../models/data");

const AboutController = {
  index: (req, res) => {
    // Get data from your data model
    const { socialLinks, skills, experience, education } = dataModel;

    // Prepare data for the about page
    const aboutData = {
      title: "About Me",
      socialLinks: {
        linkedin: socialLinks.linkedin,
        github: socialLinks.github,
        instagram: socialLinks.instagram,
      },
      skills: skills || [], // Assuming you might have skills data
      experience: experience || [], // Assuming you might have experience data
      education: education || [], // Assuming you might have education data
    };

    res.render("pages/about", aboutData);
  },
};

module.exports = AboutController;
