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

// src/models/data.js
const dataModel = {
  socialLinks: {
    linkedin: "https://www.linkedin.com/in/yourprofile",
    github: "https://github.com/yourusername",
    instagram: "https://www.instagram.com/yourusername",
  },
  skills: [
    {
      name: "UI/UX Design",
      description: "Creating intuitive and beautiful user interfaces",
      icon: "fas fa-palette",
    },
    {
      name: "Frontend Development",
      description: "Building responsive websites with modern technologies",
      icon: "fas fa-code",
    },
    {
      name: "User Research",
      description: "Understanding user needs through research and testing",
      icon: "fas fa-users",
    },
    {
      name: "Prototyping",
      description: "Rapid prototyping for quick iteration and feedback",
      icon: "fas fa-pencil-ruler",
    },
  ],
  experience: [
    {
      position: "Senior UX Designer",
      company: "Tech Company",
      startDate: "2020",
      endDate: "Present",
      description: "Leading UX design for multiple product lines",
      achievements: [
        "Increased user engagement by 35%",
        "Established design system for consistent UI across products",
        "Mentored junior designers and developers",
      ],
    },
    {
      position: "UI/UX Designer",
      company: "Design Agency",
      startDate: "2018",
      endDate: "2020",
      description: "Created user interfaces for various client projects",
      achievements: [
        "Designed award-winning mobile applications",
        "Developed responsive web designs for Fortune 500 clients",
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor of Design",
      institution: "University Name",
      graduationYear: "2018",
      description:
        "Focused on user experience design and human-computer interaction",
    },
  ],
};

module.exports = dataModel;

module.exports = portfolioData;
