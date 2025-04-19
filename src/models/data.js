// models/data.js
const portfolioData = {
  personal: {
    name: "Joshua Bonham",
    title: "UX/UI Designer & Developer",
    bio: "Crafting digital experiences that blend functionality with aesthetics.",
    skills: ["UX Design", "UI Design", "Frontend Development", "Prototyping"],
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/joshuabonham03",
      github: "https://github.com/JBBru-helloworld",
      twitter: "https://twitter.com/yourprofile",
      dribbble: "https://dribbble.com/yourprofile",
    },
  },

  projects: [
    {
      id: 1,
      title: "E-commerce Platform Redesign",
      description:
        "Complete UX/UI overhaul for a leading e-commerce platform, resulting in 40% increased conversion rates.",
      thumbnail: "/assets/images/project1.jpg",
      categories: ["UX Design", "UI Design", "E-commerce"],
      year: "2024",
    },
    {
      id: 2,
      title: "Mobile Banking App",
      description:
        "Designed a secure and intuitive mobile banking application with advanced accessibility features.",
      thumbnail: "/assets/images/project2.jpg",
      categories: ["Mobile App", "UI Design", "FinTech"],
      year: "2023",
    },
    {
      id: 3,
      title: "Health & Wellness Dashboard",
      description:
        "Created a comprehensive health tracking dashboard with real-time data visualization.",
      thumbnail: "/assets/images/project3.jpg",
      categories: ["Dashboard", "Data Visualization", "Healthcare"],
      year: "2023",
    },
  ],

  testimonials: [
    {
      id: 1,
      quote:
        "Their design approach transformed our product completely. The attention to detail was exceptional.",
      author: "Jane Smith",
      position: "Product Manager, TechCorp",
    },
    {
      id: 2,
      quote:
        "Working with them was a seamless experience. They understood our vision and delivered beyond expectations.",
      author: "Alex Johnson",
      position: "CEO, StartupX",
    },
  ],
};

module.exports = portfolioData;
