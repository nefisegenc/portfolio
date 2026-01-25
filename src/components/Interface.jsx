
// We'll use a simple state management or event for now. 
// For simplicity, we can use a custom event or a global state store like zustand.
// To keep it simple without adding zustand yet, we will rely on props or just show the static UI for now.
// Actually, let's add Zustand for easier state management between 3D and 2D.
// I'll install zustand quickly or just use a simple event for now.
// Let's use a simple global variable logic or just context in App?
// Creating a simple store is better. I'll add `src/store.js`.

import { useStore } from "../store";
import { personalInfo } from "../data/projects";
import { useState, useEffect, useCallback } from "react";
import { Joystick } from "./Joystick";

// Typewriter hint message
const HINT_MESSAGE = "Walk towards the paintings to discover my projects...";

export const Interface = () => {
    const { currentProject, closeProject, bioOpen, setBioOpen } = useStore();
    const [activeCategory, setActiveCategory] = useState(null);
    const [activeSubProject, setActiveSubProject] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    // bioOpen moved to global store
    const [showHint, setShowHint] = useState(true);
    const [displayedText, setDisplayedText] = useState("");
    const [textComplete, setTextComplete] = useState(false);

    // Typewriter effect
    useEffect(() => {
        if (!showHint) return;

        let currentIndex = 0;
        const typeInterval = setInterval(() => {
            if (currentIndex < HINT_MESSAGE.length) {
                setDisplayedText(HINT_MESSAGE.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                setTextComplete(true);
                clearInterval(typeInterval);
            }
        }, 50); // 50ms per character

        return () => clearInterval(typeInterval);
    }, [showHint]);

    // Hide hint after 10 seconds or when user starts moving
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowHint(false);
        }, 10000);

        const handleKeyDown = (e) => {
            if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                setShowHint(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Reset category when project closes or changes
    useEffect(() => {
        if (!currentProject) {
            setActiveCategory(null);
            setActiveSubProject(null);
            setZoomedImage(null);
        }
    }, [currentProject]);

    // Lock body scroll when Bio/CV is open
    useEffect(() => {
        if (bioOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [bioOpen]);

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-4 md:p-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wider font-mono">
                        {personalInfo.name.toLocaleUpperCase('tr-TR')}
                    </h1>
                    <p className="text-xs md:text-base text-gray-400 font-mono">{personalInfo.title.toUpperCase()}</p>
                    <button
                        onClick={() => setBioOpen(true)}
                        className="mt-2 md:mt-4 px-4 py-1 md:px-6 md:py-2 border border-white/20 hover:bg-white hover:text-black text-white text-xs md:text-sm font-mono tracking-widest transition-all rounded-full pointer-events-auto"
                    >
                        ABOUT / CV
                    </button>
                </div>
                <div className="text-white font-mono text-sm hidden md:block">
                    <p>MOVE: WASD</p>
                    <p>LOOK: A/D</p>
                    <p>INTERACT: CLICK</p>
                </div>
            </div>

            {/* Project Modal */}
            {currentProject && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto backdrop-blur-sm overflow-y-auto py-8"
                    onClick={() => closeProject()}
                >
                    <div
                        className="bg-gray-900 border border-gray-700 p-8 rounded-lg max-w-4xl w-full shadow-2xl mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col gap-6">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                                        {currentProject.title}
                                    </h2>
                                    <p className="text-gray-400 mt-2">{currentProject.year} | {currentProject.role}</p>
                                </div>
                                <button
                                    className="text-gray-400 hover:text-white transition-colors text-sm"
                                    onClick={() => closeProject()}
                                >
                                    CLOSE [X]
                                </button>
                            </div>

                            {/* Content based on Type */}
                            {currentProject.type === 'design' ? (
                                <div className="mt-4">
                                    {activeCategory ? (
                                        // Level 3: Specific Category View (Images)
                                        <div className="animate-fade-in">
                                            <button
                                                onClick={() => setActiveCategory(null)}
                                                className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                                            >
                                                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                                                Back to {activeSubProject.name} Categories
                                            </button>
                                            <h3 className="text-2xl font-bold text-white mb-4">{activeCategory.name}</h3>
                                            <div className="grid grid-cols-4 gap-4">
                                                {activeCategory.images.map((img, index) => (
                                                    <div
                                                        key={index}
                                                        className="aspect-square relative group overflow-hidden rounded-lg cursor-zoom-in"
                                                        onClick={() => setZoomedImage(img)}
                                                    >
                                                        <img
                                                            src={img}
                                                            alt={`${activeCategory.name} ${index + 1}`}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : activeSubProject ? (
                                        // Level 2: Categories List View (for selected Client)
                                        <div className="animate-fade-in">
                                            <button
                                                onClick={() => setActiveSubProject(null)}
                                                className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                                            >
                                                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                                                Back to Clients
                                            </button>
                                            <h3 className="text-2xl font-bold text-white mb-6">
                                                {activeSubProject.name} <span className="text-gray-500 font-normal">/ Select Category</span>
                                            </h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                {activeSubProject.categories && activeSubProject.categories.map((cat, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => setActiveCategory(cat)}
                                                        className={`group cursor-pointer bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 ${!cat.thumbnail ? 'flex items-center justify-center p-8' : ''}`}
                                                    >
                                                        {cat.thumbnail ? (
                                                            <>
                                                                <div className="aspect-video overflow-hidden">
                                                                    <img
                                                                        src={cat.thumbnail}
                                                                        alt={cat.name}
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                                                    />
                                                                </div>
                                                                <div className="p-4 flex justify-between items-center bg-gray-900/50">
                                                                    <h3 className="text-xl font-bold text-gray-200 group-hover:text-purple-400 transition-colors">{cat.name}</h3>
                                                                    <span className="text-gray-500 group-hover:translate-x-1 transition-transform">→</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-center">
                                                                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 group-hover:scale-110 transition-transform duration-300">
                                                                    {cat.name}
                                                                </h3>
                                                                <p className="text-gray-500 mt-2 text-sm group-hover:text-gray-300 transition-colors">Click to view gallery</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        // Level 1: SubProjects / Clients List View
                                        <div className="animate-fade-in">
                                            <h3 className="text-xl font-bold text-gray-400 mb-6">Select Client Project</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                {currentProject.designProjects && currentProject.designProjects.map((subProj, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => setActiveSubProject(subProj)}
                                                        className="group cursor-pointer bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                                                    >
                                                        <div className="aspect-video overflow-hidden relative">
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                                                            <img
                                                                src={subProj.thumbnail}
                                                                alt={subProj.name}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            />
                                                        </div>
                                                        <div className="p-6 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm">
                                                            <div>
                                                                <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{subProj.name}</h3>
                                                                <p className="text-sm text-gray-400 mt-1">{subProj.categories.length} Categories</p>
                                                            </div>
                                                            <span className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-cyan-500 group-hover:text-black transition-all">→</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-8">
                                    {/* Left: Image (Standard Layout) */}
                                    <div className="w-2/5 flex-shrink-0 flex flex-col gap-4">
                                        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden flex items-center justify-center p-2">
                                            <img
                                                src={currentProject.modalImage || currentProject.image}
                                                alt={currentProject.title}
                                                className="w-full object-contain rounded-md"
                                            />
                                        </div>

                                        {currentProject.secondaryImage && (
                                            <div className="aspect-video bg-black/50 rounded-lg overflow-hidden flex items-center justify-center p-2">
                                                <img
                                                    src={currentProject.secondaryImage}
                                                    alt={`${currentProject.title} secondary`}
                                                    className="w-full object-contain rounded-md"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Content (Standard Layout) */}
                                    <div className="w-3/5 text-gray-300 space-y-6">
                                        {/* Description */}
                                        <div className="bg-gray-800/50 p-6 rounded-lg">
                                            <p className="leading-relaxed text-lg">{currentProject.description}</p>
                                        </div>

                                        {/* Original Features & Tech display code... will be preserved by standardizing the else block */}
                                        {/* To keep the diff clean and minimal, I will rewrite the existing structure carefully */}

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                                                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                                                    Key Features
                                                </h3>
                                                <ul className="space-y-2">
                                                    {currentProject.features && currentProject.features.map((feature, i) => (
                                                        <li key={i} className="flex items-start text-sm text-gray-400">
                                                            <span className="mr-2 text-purple-400">•</span>
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                                                    <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
                                                    Technologies
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {currentProject.tech.map((tech) => (
                                                        <span key={tech} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 hover:bg-white/10 transition-colors cursor-default">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Links */}
                                        <div className="flex gap-4 pt-4 border-t border-gray-700/50">
                                            <a
                                                href={currentProject.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-white text-black py-3 rounded hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                                            >
                                                VIEW LIVE
                                            </a>
                                            {currentProject.github && (
                                                <a
                                                    href={currentProject.github}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 border border-white/20 text-white py-3 rounded hover:bg-white/10 transition-colors font-medium flex items-center justify-center gap-2"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                    </svg>
                                                    GITHUB
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Game-style Onboarding Hint with Typewriter Effect */}
            {showHint && (
                <div
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center"
                    style={{
                        animation: 'fadeInUp 0.5s ease-out'
                    }}
                >
                    <div className="bg-black/80 backdrop-blur-md border-2 border-cyan-500/50 rounded-lg px-8 py-5 shadow-2xl shadow-cyan-500/20">
                        {/* WASD Keys visual - Hidden on Mobile */}
                        <div className="hidden md:block">
                            <div className="flex justify-center gap-1 mb-3">
                                <span className="w-8 h-8 bg-gray-800 border border-cyan-400/50 rounded flex items-center justify-center text-cyan-400 text-xs font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>W</span>
                            </div>
                            <div className="flex justify-center gap-1 mb-4">
                                <span className="w-8 h-8 bg-gray-800 border border-cyan-400/50 rounded flex items-center justify-center text-cyan-400 text-xs font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>A</span>
                                <span className="w-8 h-8 bg-gray-800 border border-cyan-400/50 rounded flex items-center justify-center text-cyan-400 text-xs font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>S</span>
                                <span className="w-8 h-8 bg-gray-800 border border-cyan-400/50 rounded flex items-center justify-center text-cyan-400 text-xs font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>D</span>
                            </div>
                        </div>

                        {/* Mobile Hint */}
                        <div className="md:hidden absolute top-[-150px] left-1/2 -translate-x-1/2 w-[200px] text-cyan-400 mb-2 font-mono text-sm border border-cyan-500/30 rounded p-2 bg-cyan-900/80 backdrop-blur-md">
                            USE JOYSTICK TO MOVE<br />
                            DRAG SCREEN TO LOOK
                        </div>

                        {/* Typewriter text */}
                        <p
                            className="text-white text-xl tracking-wider"
                            style={{
                                fontFamily: "'VT323', monospace",
                                textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            {displayedText}
                            <span
                                className="inline-block w-2 h-5 bg-cyan-400 ml-1 align-middle"
                                style={{
                                    animation: 'blink 0.7s infinite'
                                }}
                            ></span>
                        </p>
                    </div>
                </div>
            )}

            {/* Mobile Joystick */}
            <Joystick />

            {/* Social Links - Bottom Left */}
            <div className="flex gap-4 pointer-events-auto hidden md:flex">
                <a
                    href="https://www.linkedin.com/in/nefise-gen%C3%A7-67ba66226/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center text-white hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all"
                    title="LinkedIn"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                </a>
                <a
                    href="https://github.com/nefisegenc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center text-white hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all"
                    title="GitHub"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                </a>
                <a
                    href="mailto:nefisenurgenc@gmail.com"
                    className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center text-white hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all"
                    title="Email"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </a>
                <a
                    href="https://www.youtube.com/@hypatiaateam"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center text-white hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                    title="YouTube"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                </a>
            </div>
            {/* Lightbox Overlay */}
            {/* Bio / CV Modal */}
            {bioOpen && (
                <div
                    className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 md:p-8 animate-fade-in pointer-events-auto overflow-hidden"
                    onClick={() => setBioOpen(false)}
                >
                    <div
                        className="bg-gray-900 border border-gray-700 p-6 md:p-8 rounded-lg max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                            onClick={() => setBioOpen(false)}
                        >
                            CLOSE [X]
                        </button>

                        <div className="space-y-6">
                            {/* Header */}
                            <div className="border-b border-gray-800 pb-6">
                                <h2 className="text-3xl font-bold text-white mb-2">{personalInfo.name}</h2>
                                <p className="text-purple-400 font-mono">{personalInfo.title}</p>
                                <p className="text-gray-400 mt-4 leading-relaxed max-w-2xl">{personalInfo.about}</p>
                            </div>

                            {/* Skills */}
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
                                    Technical Skills
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2 font-mono">PROGRAMMING</p>
                                        <div className="flex flex-wrap gap-2">
                                            {personalInfo.skills.programming.map(skill => (
                                                <span key={skill} className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs rounded-full">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2 font-mono">TOOLS & DESIGN</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[...personalInfo.skills.tools, ...personalInfo.skills.design].map(skill => (
                                                <span key={skill} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs rounded-full">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Experience */}
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-pink-500 rounded-full"></span>
                                    Experience
                                </h3>
                                <div className="space-y-6">
                                    {personalInfo.experience.map((exp, index) => (
                                        <div key={index} className="relative pl-6 border-l border-gray-800">
                                            <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-gray-700"></div>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className="text-white font-bold">{exp.company}</h4>
                                                <span className="text-xs text-gray-500 font-mono">{exp.dates}</span>
                                            </div>
                                            <p className="text-sm text-purple-400 mb-2">{exp.title}</p>
                                            <ul className="space-y-1">
                                                {exp.highlights.map((item, i) => (
                                                    <li key={i} className="text-xs text-gray-400">• {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="pt-6 border-t border-gray-800 flex flex-wrap gap-8 text-sm">
                                <div>
                                    <span className="block text-gray-500 text-xs font-mono mb-1">EMAIL</span>
                                    <a href={`mailto:${personalInfo.email}`} className="text-white hover:text-cyan-400 transition-colors">{personalInfo.email}</a>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs font-mono mb-1">LOCATION</span>
                                    <span className="text-white">{personalInfo.location}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs font-mono mb-1">SOCIAL</span>
                                    <div className="flex gap-4">
                                        <a href={personalInfo.linkedin} target="_blank" rel="noopener" className="text-white hover:text-blue-400 transition-colors">LinkedIn</a>
                                        <a href={personalInfo.github} target="_blank" rel="noopener" className="text-white hover:text-gray-400 transition-colors">GitHub</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 animate-fade-in pointer-events-auto"
                    onClick={() => setZoomedImage(null)}
                >
                    <button
                        className="absolute top-8 right-8 text-white hover:text-gray-300 transition-colors"
                        onClick={() => setZoomedImage(null)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <img
                        src={zoomedImage}
                        alt="Zoomed view"
                        className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
