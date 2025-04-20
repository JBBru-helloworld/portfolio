// src/controllers/ContactController.js
const ContactController = {
  index: (req, res) => {
    res.send("Contact form page");
  },
  submit: (req, res) => {
    res.send("Contact form submitted");
  },
};
module.exports = ContactController;
