// models/data.js
const data = {
  personal: {
    name: "Joshua Edwin Rene Bonham",
    title: "Full Stack Developer & UI/UX Designer",
    bio: "Passionate developer and designer creating innovative solutions with modern technologies.",
    skills: [
      "React.js",
      "JavaScript",
      "Python",
      "UI/UX Design",
      "AWS",
      "Firebase",
      "Node.js",
      "Scala",
    ],
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/joshuabonham03",
      github: "https://github.com/JBBru-helloworld",
      email: "mailto:jb.brubusiness3@gmail.com",
      instagram: "https://www.instagram.com/jb_bru/",
    },
  },

  projects: [
    {
      id: 1,
      title: "Budget Tracker",
      description:
        "A comprehensive financial management tool that combines receipt scanning technology with expense tracking and budget analytics. Users can upload or scan their receipts, which are then processed using AI to extract individual items.",
      fullDescription:
        "Budget Tracker is a comprehensive financial management tool that combines receipt scanning technology with expense tracking and budget analytics. Users can upload or scan their receipts, which are then processed using AI to extract individual items. These items can be allocated to different users for shared expenses or categorised for personal budgeting. The application provides visual analytics to help users understand their spending habits and offers personalised money-saving tips.",
      thumbnail: "assets/images/projects/Budget.png",
      categories: [
        "React.js",
        "Tailwind CSS",
        "Firebase",
        "MongoDB",
        "Python",
        "JavaScript",
        "Vite",
        "AI",
      ],
      technologies: [
        {
          name: "React.js",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
        },
        {
          name: "Tailwind CSS",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg",
        },
        {
          name: "Firebase",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg",
        },
        {
          name: "MongoDB",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
        },
        {
          name: "Python",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
        },
        {
          name: "JavaScript",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
        },
        { name: "Vite", icon: "https://vitejs.dev/logo.svg" },
      ],
      year: "2025",
      period: "Apr 2025 - Present",
      githubLink: "https://github.com/JBBru-helloworld/Budget-Tracker",
      featured: true,
    },
    {
      id: 2,
      title: "Harvest For All - Agricultural Management System",
      description:
        "A fully OOP 2D pixel-art farming simulator in Scala with ScalaFX GUI, featuring core class hierarchy that leverages inheritance and polymorphism.",
      fullDescription:
        "Developed a fully OOP 2D pixel-art farming simulator in Scala with a ScalaFX GUI, designing a core class hierarchy (Farm, Crop, Player, Village) that leverages inheritance and polymorphism. I implemented farming and trading mechanics — crop growth cycles, resource management (water/fertiliser), inventory, and dynamic market pricing — to enable strategic gameplay, and integrated an SDG-2 educational quiz on agricultural management to reinforce sustainable practices. I also built a robust save/load system and profiled/optimised critical code paths to ensure smooth, responsive performance.",
      thumbnail: "assets/images/projects/Harvest For All.png",
      categories: ["Scala", "ScalaFX", "OOP"],
      technologies: [
        {
          name: "Scala",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/scala/scala-original.svg",
        },
        {
          name: "ScalaFX",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/scala/scala-original.svg",
        },
      ],
      year: "2025",
      period: "Jun 2025 - Aug 2025",
      youtubeLink: "https://www.youtube.com/watch?v=HfdJD3vehZk",
      association: "School of Engineering and Technology, Sunway University",
    },
    {
      id: 3,
      title: "Automated Receipt Processing Tool (AWS)",
      description:
        "Built a fully serverless AWS pipeline to ingest, OCR, parse and store receipt data - eliminating manual entry and accelerating financial reporting.",
      fullDescription:
        "Built a fully serverless AWS pipeline to ingest, OCR, parse and store receipt data - eliminating manual entry and accelerating financial reporting. Architecture includes Amazon S3 for versioned, encrypted receipt storage, AWS Lambda for workflow orchestration, Amazon Textract for data extraction with >95% accuracy, Amazon DynamoDB for structured storage, and Amazon SES for real-time alerts.",
      thumbnail: "assets/images/projects/AWS.png",
      categories: [
        "AWS Lambda",
        "Amazon SES",
        "Amazon S3",
        "Amazon Textract",
        "Amazon DynamoDB",
      ],
      technologies: [
        {
          name: "AWS Lambda",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
        },
        {
          name: "Amazon S3",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
        },
        {
          name: "Amazon Textract",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
        },
        {
          name: "Python",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
        },
      ],
      year: "2025",
      period: "May 2025",
    },
    {
      id: 4,
      title: "Grab Buddy - UM Hackathon",
      description:
        "AI-powered assistant for vendors and merchants, submitted for Grab's challenge at UMHackathon 2025. Leveraged Ollama, Mistral (7B), and Gemini for business insights.",
      fullDescription:
        "Collaborated on the development of an AI-powered assistant for vendors and merchants, submitted for Grab's challenge at UMHackathon 2025. The solution leveraged Ollama, Mistral (7B), and Gemini to enhance decision-making and economic empowerment in the small business sector. As the UI Designer, I was responsible for crafting an intuitive and accessible user interface that presented complex data in a clear, actionable format. The AI-driven dashboard enables merchants to interact naturally with the system, receiving insights in plain language on key aspects like inventory management, receipt processing, and overall store performance. A standout feature includes automated summarisation of competitor reviews, giving merchants a competitive edge by revealing trends and customer expectations.",
      thumbnail: "assets/images/projects/UMHackathon IMage.png",
      categories: ["Figma", "AI", "Python", "UI Design"],
      technologies: [
        {
          name: "Figma",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
        },
        {
          name: "Python",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
        },
        {
          name: "AI/ML",
          icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/openai.svg",
        },
      ],
      year: "2025",
      period: "Apr 2025",
      githubLink: "https://github.com/Spimy/UMHackathon",
      figmaLink:
        "https://www.figma.com/file/1NRKS2Fl2SR0sYbWPWOrhZ/UM-Hackathon",
    },
    {
      id: 5,
      title: "SEG2202: Software Engineering",
      description:
        "Designed a functional mobile application and in-car display interface aimed at enhancing user experience and usability.",
      fullDescription:
        "Designed a functional mobile application and in-car display interface aimed at enhancing user experience and usability. Developed comprehensive UML diagrams to support the planning, definition, and design phases of the Software Development Life Cycle (SDLC), ensuring a structured and user-centered development process.",
      thumbnail: "assets/images/projects/SEG2202.png",
      categories: [
        "Figma",
        "Software Development",
        "UX",
        "Frontend",
        "Project Management",
      ],
      technologies: [
        {
          name: "Figma",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
        },
        {
          name: "UML",
          icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/uml.svg",
        },
      ],
      year: "2025",
      period: "Feb 2025 - Mar 2025",
      figmaLink: "https://www.figma.com/file/kaT8ldYAIE1rBzJD4nQuwn/SVPS",
      association: "School of Engineering and Technology, Sunway University",
    },
    {
      id: 6,
      title: "Recipe Roots",
      description:
        "Web application for SDG 2: Zero Hunger theme, allowing users to create and share recipes with convenient access to cooking essentials.",
      fullDescription:
        "This project was undertaken as part of the WEB2202 Web Programming course at Sunway University. The goal was to design and implement a web application using PHP, with a focus on the theme of SDG 2: Zero Hunger. Since PHP was the primary requirement for this project, nearly all website functionalities (99%) are fully operational without JavaScript. The exception lies in the ability to edit recipe ingredients, which requires JavaScript but is supported with fallback options for non-JavaScript users. Most interactive elements, including animations and modal pop-ups, were implemented entirely with HTML and CSS.",
      thumbnail: "assets/images/projects/Recipe Roots Image.png",
      categories: [
        "PHP",
        "MySQL",
        "XAMPP",
        "Docker",
        "Web Development",
        "Figma",
      ],
      technologies: [
        {
          name: "PHP",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
        },
        {
          name: "MySQL",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
        },
        {
          name: "Docker",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
        },
        {
          name: "Figma",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
        },
      ],
      year: "2024",
      period: "Nov 2024 - Dec 2024",
      liveLink: "https://recipe-roots.spimy.dev/",
      association: "School of Engineering and Technology, Sunway University",
    },
    {
      id: 7,
      title: "Asia Arts Festival Malaysia 2024",
      description:
        "Designed and built the first ever Asia Arts Festival Malaysia website using CSS and Squarespace.",
      fullDescription:
        "Designed and built the first ever Asia Arts Festival Malaysia website using CSS, Squarespace, marketing, design, communication, teamwork and time management skills. Ran and maintained the website, assisting in fixing bugs, adding additional user-friendly resources and updating media and content.",
      thumbnail: "assets/images/projects/AAF.png",
      categories: ["CSS", "Squarespace", "Web Design", "Marketing"],
      technologies: [
        {
          name: "CSS",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
        },
        {
          name: "Squarespace",
          icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/squarespace.svg",
        },
      ],
      year: "2024",
      period: "Apr 2024 - Jul 2024",
      liveLink: "https://www.myasiaartsfestival.com/",
      association: "Asia Arts Festival Malaysia",
    },
    {
      id: 8,
      title: "EventSphere",
      description:
        "Conceptual event planning website enabling users in Malaysia to book venues and connect with expert planners.",
      fullDescription:
        "This project involved designing a conceptual event planning website that enables users in Malaysia to book venues and connect with expert planners for various event types. The website is fully front-end, with key functionalities simulated using client-side JavaScript to effectively demonstrate the platform's concept without a backend. Simulated authentication was implemented using the browser's built-in Crypto API, which requires a secure (SSL/TLS) context to function.",
      thumbnail: "assets/images/projects/Eventsphere.jpg",
      categories: ["HTML", "CSS", "JavaScript", "Figma"],
      technologies: [
        {
          name: "HTML",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
        },
        {
          name: "CSS",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
        },
        {
          name: "JavaScript",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
        },
        {
          name: "Figma",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
        },
      ],
      year: "2024",
      period: "Jul 2024",
      githubLink: "https://github.com/Spimy/eventsphere",
      association: "School of Engineering and Technology, Sunway University",
    },
    {
      id: 9,
      title: "Pokémon ASCII",
      description:
        "Command-line interface (CLI) game inspired by Pokémon with WASD controls and quick-time events battles.",
      fullDescription:
        "This project is a command-line interface (CLI) game inspired by Pokémon, where players can explore the game world using WASD controls and engage in battles through quick-time events (QTEs), similar to the mechanics in Pokémon Ga-Olé.",
      thumbnail: "assets/images/projects/Pokemon.png",
      categories: ["Git", "Java"],
      technologies: [
        {
          name: "Java",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
        },
        {
          name: "Git",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg",
        },
      ],
      year: "2024",
      period: "Jun 2024 - Jul 2024",
      githubLink: "https://github.com/Spimy/pokemon-ascii",
      association: "School of Engineering and Technology, Sunway University",
    },
    {
      id: 10,
      title: "Pengyou",
      description:
        "48-hour hackathon solution for improving financial status through accessible budgeting with gamification.",
      fullDescription:
        "Pengyou is a solution project for Team Dessert Spoons' 48-hour hackathon 'ImagineHack 2024'. It is a site aimed for people who want to improve their financial status. Pengyou's purpose is to help people to develop excellent budgeting habits by making budgeting more accessible to them. We believe in the importance of developing healthy habits, therefore we've implemented a reward system including a virtual pet to encourage people to actively manage their finances.",
      thumbnail: "assets/images/projects/Pengyou Image.png",
      categories: ["Canva", "MongoDB", "Svelte"],
      technologies: [
        {
          name: "Svelte",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg",
        },
        {
          name: "MongoDB",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
        },
      ],
      year: "2024",
      period: "Jun 2024",
      liveLink: "https://pengyou.spimy.dev/",
    },
    {
      id: 11,
      title: "ENG1044 Portfolio",
      description:
        "Research portfolio on Online Gambling created from scratch for complete design control.",
      fullDescription:
        "This portfolio was created as part of an assignment for a research paper on Online Gambling for the ENG1044 English for Computer Technology Studies course at Sunway University. Our team, comprising Mohammad Shaan Ibne Javed Soyfoo, William Law Hong Waye, and myself, dedicated significant time to selecting a colour palette that would best reflect the theme of gambling. We chose to build the portfolio from scratch in order to have complete control over the website's design—something that standard website builders couldn't provide. The portfolio showcases the roadmap of our research journey, along with various drafts and revisions of the paper itself.",
      thumbnail: "assets/images/projects/ENG1044 Image.png",
      categories: ["MongoDB", "Frontend", "GitHub", "Backend", "Figma"],
      technologies: [
        {
          name: "MongoDB",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
        },
        {
          name: "GitHub",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
        },
        {
          name: "Figma",
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
        },
      ],
      year: "2023",
      period: "Sep 2023 - Dec 2023",
      liveLink: "http://eng1044.spimy.dev/",
      association: "School of Engineering and Technology, Sunway University",
    },
  ],

  testimonials: [
    {
      id: 1,
      quote:
        "Joshua's technical expertise and design sensibility make him an exceptional developer. His work on our project exceeded expectations.",
      author: "Team Lead",
      position: "UMHackathon 2025",
    },
    {
      id: 2,
      quote:
        "Outstanding collaboration and innovative solutions. Joshua brings both creativity and technical excellence to every project.",
      author: "Project Supervisor",
      position: "Sunway University",
    },
  ],

  skills: [
    {
      name: "Frontend Development",
      description:
        "Building responsive web applications with modern frameworks",
      icon: "fas fa-code",
      technologies: ["React.js", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"],
    },
    {
      name: "Backend Development",
      description: "Server-side development and API design",
      icon: "fas fa-server",
      technologies: ["Node.js", "Python", "PHP", "Firebase", "MongoDB"],
    },
    {
      name: "UI/UX Design",
      description: "Creating intuitive and beautiful user interfaces",
      icon: "fas fa-palette",
      technologies: ["Figma", "Adobe XD", "Sketch", "Prototyping"],
    },
    {
      name: "Cloud & DevOps",
      description: "Cloud architecture and deployment solutions",
      icon: "fas fa-cloud",
      technologies: ["AWS", "Docker", "Git", "CI/CD"],
    },
    {
      name: "Mobile Development",
      description: "Cross-platform mobile application development",
      icon: "fas fa-mobile-alt",
      technologies: ["React Native", "Flutter", "Swift"],
    },
    {
      name: "Data & AI",
      description: "Data processing and artificial intelligence integration",
      icon: "fas fa-brain",
      technologies: ["Python", "Machine Learning", "Data Analytics", "AI APIs"],
    },
  ],

  experience: [
    {
      position: "Full Stack Developer",
      company: "Freelance",
      startDate: "2024",
      endDate: "Present",
      description:
        "Developing modern web applications and mobile solutions for various clients",
      achievements: [
        "Built 10+ successful projects across different industries",
        "Specialized in React.js and Node.js ecosystem",
        "Implemented AI-powered solutions for business automation",
      ],
    },
    {
      position: "Student Developer",
      company: "Sunway University",
      startDate: "2023",
      endDate: "2025",
      description:
        "Software Engineering student with focus on software engineering and AI",
      achievements: [
        "Participated in multiple hackathons with winning solutions",
        "Developed award-winning applications using modern tech stacks",
        "Collaborated on enterprise-level projects",
      ],
    },
  ],

  education: [
    {
      degree: "Bachelor of Software Engineering (Hons)",
      institution: "Sunway University",
      graduationYear: "2026",
      description:
        "Focused on software engineering, artificial intelligence, and web development with hands-on project experience",
    },
  ],

  certifications: [
    {
      name: "AWS Cloud Practitioner",
      issuer: "Amazon Web Services",
      year: "2024",
      logo: "/assets/images/aws-cert.png",
    },
    {
      name: "React.js Developer",
      issuer: "Meta",
      year: "2024",
      logo: "/assets/images/react-cert.png",
    },
  ],

  interests: [
    { name: "AI & Machine Learning", icon: "fas fa-robot" },
    { name: "Web3 & Blockchain", icon: "fas fa-link" },
    { name: "Mobile Development", icon: "fas fa-mobile-alt" },
    { name: "Cloud Computing", icon: "fas fa-cloud" },
    { name: "Open Source", icon: "fab fa-github" },
    { name: "Design Systems", icon: "fas fa-palette" },
  ],
};

module.exports = data;
