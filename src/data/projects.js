export const projects = [
    {
        id: 1,
        title: "Hypatia Team",
        description: "Official website for Hypatia team. Led the software and design team, designed UI/UX and developed the full web platform using modern frontend technologies.",
        image: "/projects/hypatia-promo.png",
        modalImage: "/projects/hypatia-detail.png",
        secondaryImage: "/projects/hypatia-team.png",
        link: "https://hypatiateam.com",
        tech: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Vercel"],
        role: "Lead Software & Design Team",
        year: "Jan 2023",
        // Extended details
        duration: "Jan 2023",
        features: [
            "Responsive Web Design",
            "Multi-language Support (TR/EN)",
            "Contact Form Integration",
            "SEO & Performance Optimization",
            "Modern UI/UX with Clean Architecture"
        ],
        github: "https://github.com/nefisegenc/hypatia-community-"
    },
    {
        id: 2,
        title: "Param Corporate Website",
        description: "Corporate website for Param, a leading fintech company. Built with responsive design and modern web technologies.",
        image: "/projects/param-promo.jpg",
        modalImage: "/projects/param-detail.png",
        link: "https://www.param.com.tr",
        tech: ["HTML5", "CSS3", "SCSS", "JavaScript", "jQuery", "Bootstrap 5", "ASP.NET"],
        role: "Frontend Developer",
        year: "2024 - Present"
    },
    {
        id: 3,
        title: "ParamTech Website",
        description: "Technology division website for Param. Developed responsive layouts and optimized performance for better user experience.",
        image: "/projects/paramtech-promo.jpg",
        modalImage: "/projects/paramtech-detail.png",
        link: "https://www.paramtech.com.tr",
        tech: ["HTML5", "CSS3", "SCSS", "JavaScript", "jQuery", "Bootstrap 5", "ASP.NET"],
        role: "Frontend Developer",
        year: "2024 - Present"
    },
    {
        id: 4,
        title: "Rime Stream",
        description: "Personal music platform and streaming service with modern UI. Built with React and Next.js for optimal performance and SEO.",
        image: "/projects/rimestream-promo.png",
        modalImage: "/projects/rimestream-detail.png",
        secondaryImage: "/projects/rimestream-competitions.jpg",
        link: "https://www.rimestream.com/",
        tech: [
            "Next.js",
            "React",
            "TypeScript",
            "React Native",
            "Firebase",
            "Node.js",
            "Algolia",
            "Vercel"
        ],
        role: "Frontend Developer",
        year: "Sep 2023",
        // Extended details
        duration: "Sep 2023",
        features: [
            "Realtime Data & Live Voting",
            "Live Chat & Comment Systems",
            "Cross-Platform (Web & Mobile)",
            "Competition & Scoreboard Management",
            "Geolocation-based Content Analysis",
            "Advanced Search with Algolia"
        ],
        github: null
    },
    {
        id: 5,
        title: "Isimiz Var Gucumuz Var",
        description: "My first professional web development project (2022). A corporate website designed to showcase business services. This project laid the foundation for my frontend development career, focusing on responsive layout and fundamental web technologies.",
        image: "/projects/isimiz-promo.png",
        modalImage: "/projects/isimiz-detail.png",
        secondaryImage: "/projects/isimiz-values.png",
        link: "https://www.isimizvargucumuzvar.com/",
        tech: ["HTML5", "CSS3", "JavaScript", "Bootstrap", "Responsive Design"],
        role: "Junior Frontend Developer",
        year: "2022",
        duration: "2022",
        features: [
            "My First Professional Web Project",
            "Corporate Brand Identity",
            "Responsive & Mobile-First Design",
            "Contact & Inquiry Forms",
            "Cross-Browser Compatibility"
        ],
        github: null
    },
    {
        id: 6,
        title: "My Arts",
        description: "A collection of my creative design works, UI explorations, and digital art. This gallery showcases my passion for visual aesthetics beyond code.",
        image: "/projects/my-arts-cover-2.jpg",
        link: "#",
        tech: ["UI Design", "Digital Art", "Creative Direction", "Illustration"],
        role: "Creative Designer",
        year: "2023 - Present",
        duration: "Ongoing",
        features: [
            "User Interface Design",
            "Digital Illustration",
            "Brand Identity",
            "Visual Storytelling"
        ],
        type: "design",
        designProjects: [
            {
                name: "Hypatia",
                thumbnail: "/projects/hypatia-cover.png",
                categories: [
                    {
                        name: "Social Media",
                        images: [
                            "/projects/hypatia-social-1.jpg",
                            "/projects/hypatia-social-2.jpg",
                            "/projects/hypatia-social-3.jpg",
                            "/projects/hypatia-social-4.jpg"
                        ]
                    },
                    {
                        name: "Logo",
                        images: ["/projects/hypatia-cover.png"]
                    }
                ]
            },
            {
                name: "Mer & Dic",
                thumbnail: "/projects/art-merdic-logo.jpg",
                categories: [
                    {
                        name: "Signage",
                        images: ["/projects/art-merdic-signage.jpg", "/projects/art-merdic-1.jpg", "/projects/art-merdic-2.jpg", "/projects/art-merdic-signage-2.png"]
                    },

                    {
                        name: "Logo",
                        images: ["/projects/art-merdic-logo.jpg", "/projects/art-merdic-logo-2.png"]
                    },
                    {
                        name: "Marketing",
                        images: [
                            "/projects/art-merdic-gift-1.png",
                            "/projects/art-merdic-gift-2.png",
                            "/projects/art-merdic-marketing-1.jpg",
                            "/projects/art-merdic-marketing-3.png",
                            "/projects/art-merdic-marketing-4.png"
                        ]
                    },
                    {
                        name: "Packaging",
                        images: [
                            "/projects/art-merdic-packaging-1.jpg",
                            "/projects/art-merdic-packaging-2.jpg",
                            "/projects/art-merdic-packaging-3.jpg",
                            "/projects/art-merdic-packaging-4.jpg",
                            "/projects/art-merdic-packaging-5.jpg"
                        ]
                    }
                ]
            }
        ],
        github: null
    },
];

export const personalInfo = {
    name: "Nefise Nur Genç",
    title: "Front-End Developer",
    email: "nefisenurgenc@gmail.com",
    phone: "+90 533 514 87 77",
    location: "Istanbul, Turkey",
    linkedin: "https://linkedin.com/in/nefisenurgenc",
    github: "https://github.com/nefisenurgenc",
    about: "I'm a front-end developer skilled in React, JavaScript, HTML, and CSS. I create user-friendly and responsive interfaces, with strong problem-solving abilities backed by experience in project management.",
    skills: {
        programming: ["React.js", "Next.js", "TypeScript", "HTML", "CSS", "SQL", "Python"],
        tools: ["Git", "GitHub", "VS Code", "WebStorm"],
        design: ["Ant Design", "Figma", "Canva", "Adobe Illustrator"],
        practices: ["OOP", "Agile", "API Integration"],
        platforms: ["JIRA", "PowerBI", "Microsoft Excel"]
    },
    languages: ["Turkish (Native)", "English (Advanced)", "German (Elementary)"],
    education: {
        degree: "Bachelor of Mathematics",
        university: "Dokuz Eylül University",
        location: "Izmir, Turkey",
        dates: "Sept 2017 – June 2023"
    },
    experience: [
        {
            title: "Front-End Developer",
            company: "PARAMTech",
            location: "Izmir, Turkey",
            dates: "July 2024 – Sept 2025",
            highlights: [
                "Developed a web-based mailing tool that converts marketing copy into structured HTML email templates",
                "Optimized React-based interfaces, reducing page load time by approximately 20%",
                "Managed global state with Redux to ensure consistent data flow"
            ]
        },
        {
            title: "Front-End Developer",
            company: "Hypatia",
            location: "Remote, Turkey",
            dates: "Jan 2023 – Present",
            highlights: [
                "Led the software team and coordinated development tasks",
                "Designed and developed the official Hypatia website",
                "Created visual designs using Figma, Canva and Adobe Illustrator"
            ]
        },
        {
            title: "Junior Front-End Web Developer",
            company: "Anatolia System",
            location: "Istanbul, Turkey",
            dates: "Aug 2022 – Aug 2023",
            highlights: [
                "Created websites for businesses (isimizvargucumuzvar.com and zukkan.com)",
                "Troubleshot websites on different browsers to ensure quality"
            ]
        }
    ]
};
